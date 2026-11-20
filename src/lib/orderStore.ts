import type { Order, OrderItem, Prisma } from "@prisma/client";

import {
  advanceCommission,
  calculateCommission,
  commissionAvailableAt,
  markCommissionPaid,
  type CommissionStatus,
} from "../domain/commission";
import { PRODUCTS } from "@/data/catalog";

import type { BagItem } from "../types/store";
import { getOrderCode } from "./bagStore";
import { prisma } from "./prisma";

/** Pedidos no Postgres (Fase 2). Datas serializadas para o Client Component. */
export interface OrderView {
  code: string;
  customerName: string;
  totalInCents: number;
  costInCents: number;
  marginInCents: number;
  whatsappPayload: string;
  status: Order["status"];
  createdAt: string;
  confirmedAt: string | null;
  nfNumber: string;
  commissionInCents: number;
  commissionStatus: CommissionStatus;
  commissionAvailableAt: string | null;
  stockShortfalls: string[];
  items: Array<{
    key: string;
    productName: string;
    colorName: string;
    sizeLabel: string;
    quantity: number;
    unitPriceInCents: number;
  }>;
}

function toView(
  order: Order & { items: OrderItem[] }
): OrderView {
  return {
    code: order.code,
    customerName: order.customerName ?? "",
    totalInCents: order.totalInCents,
    costInCents: order.items.reduce(
      (sum, item) => sum + item.unitCostInCents * item.quantity,
      0
    ),
    marginInCents: order.items.reduce(
      (sum, item) =>
        sum + (item.unitPriceInCents - item.unitCostInCents) * item.quantity,
      0
    ),
    whatsappPayload: order.whatsappPayload ?? "",
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    confirmedAt: order.confirmedAt?.toISOString() ?? null,
    nfNumber: order.nfNumber ?? "",
    commissionInCents: order.commissionInCents,
    commissionStatus: order.commissionStatus as CommissionStatus,
    commissionAvailableAt: order.commissionAvailableAt?.toISOString() ?? null,
    stockShortfalls: order.stockShortfalls,
    items: order.items.map((item) => ({
      key: `${item.productId}:${item.variantId}:${item.sizeLabel}`,
      productName: item.productName,
      colorName: item.colorName,
      sizeLabel: item.sizeLabel,
      quantity: item.quantity,
      unitPriceInCents: item.unitPriceInCents,
    })),
  };
}

export interface CreateOrderInput {
  customerName: string;
  items: readonly BagItem[];
  whatsappPayload: string;
}

/** Idempotente por código. O custo vem do banco, não do navegador. */
export async function createOrder(input: CreateOrderInput): Promise<OrderView> {
  const code = getOrderCode();
  const existing = await prisma.order.findUnique({
    where: { code },
    include: { items: true },
  });
  if (existing) return toView(existing);

  const slugs = Array.from(new Set(input.items.map((item) => item.productSlug)));
  const products = await prisma.product.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true, costInCents: true },
  });
  const costBySlug = new Map(products.map((product) => [product.slug, product]));

  // IDs de variação do catálogo mock ≠ IDs do banco. Mapear por cor.
  const dbVariants = await prisma.productVariant.findMany({
    where: { productId: { in: products.map((product) => product.id) } },
    select: { id: true, productId: true, colorSlug: true },
  });
  const variantByColor = new Map(
    dbVariants.map((variant) => [`${variant.productId}:${variant.colorSlug}`, variant.id])
  );

  const totalInCents = input.items.reduce(
    (sum, item) => sum + item.unitPriceInCents * item.quantity,
    0
  );

  const items: Prisma.OrderItemCreateManyOrderInput[] = input.items.map((item) => {
    const product = costBySlug.get(item.productSlug);
    const catalogVariant = PRODUCTS.find((p) => p.slug === item.productSlug)?.variants.find(
      (variant) => variant.id === item.variantId
    );
    const dbVariantId = product && catalogVariant
      ? variantByColor.get(`${product.id}:${catalogVariant.colorSlug}`)
      : undefined;

    return {
      productId: product?.id ?? item.productId,
      variantId: dbVariantId ?? item.variantId,
      productName: item.productName,
      colorName: item.colorName,
      sizeLabel: item.sizeLabel,
      quantity: item.quantity,
      unitPriceInCents: item.unitPriceInCents,
      unitCostInCents: product?.costInCents ?? item.unitCostInCents,
    };
  });

  const created = await prisma.order.create({
    data: {
      code,
      customerName: input.customerName.trim() || null,
      totalInCents,
      status: "SENT_TO_WHATSAPP",
      whatsappPayload: input.whatsappPayload,
      items: { createMany: { data: items } },
    },
    include: { items: true },
  });

  return toView(created);
}

export async function listOrders(): Promise<OrderView[]> {
  const orders = await prisma.order.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  return orders.map(toView);
}

export async function confirmOrderInDb(code: string, at = new Date()): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { code },
      include: { items: true },
    });
    if (!order || order.confirmedAt) return;

    const margin = order.items.reduce(
      (sum, item) => sum + (item.unitPriceInCents - item.unitCostInCents) * item.quantity,
      0
    );
    const shortfalls: string[] = [];

    for (const item of order.items) {
      const stock = await tx.variantStock.findUnique({
        where: {
          variantId_sizeLabel: {
            variantId: item.variantId,
            sizeLabel: item.sizeLabel,
          },
        },
      });
      if (!stock) {
        shortfalls.push(`${item.sizeLabel}: faltam ${item.quantity}`);
        continue;
      }
      const missing = Math.max(0, item.quantity - stock.stock);
      if (missing > 0) shortfalls.push(`${item.sizeLabel}: faltam ${missing}`);
      await tx.variantStock.update({
        where: { id: stock.id },
        data: { stock: Math.max(0, stock.stock - item.quantity) },
      });
    }

    await tx.order.update({
      where: { code },
      data: {
        status: "CONFIRMED",
        confirmedAt: at,
        commissionInCents: calculateCommission({
          costInCents: order.totalInCents - margin,
          receivedInCents: order.totalInCents,
        }),
        commissionStatus: "PENDING",
        commissionAvailableAt: commissionAvailableAt(at),
        stockShortfalls: shortfalls,
      },
    });
  });
}

export async function cancelOrderInDb(code: string, now = new Date()): Promise<void> {
  const order = await prisma.order.findUnique({ where: { code } });
  if (!order) return;
  const updated = advanceCommission(
    {
      confirmedAt: order.confirmedAt,
      commissionInCents: order.commissionInCents,
      commissionStatus: order.commissionStatus as CommissionStatus,
      commissionAvailableAt: order.commissionAvailableAt,
      totalInCents: order.totalInCents,
    },
    { now, cancelled: true }
  );
  await prisma.order.update({
    where: { code },
    data: { status: "CANCELLED", commissionStatus: updated.commissionStatus },
  });
}

export async function markOrderPaid(code: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { code } });
  if (!order || order.commissionStatus !== "PAYABLE") return;
  const updated = markCommissionPaid({
    confirmedAt: order.confirmedAt,
    commissionInCents: order.commissionInCents,
    commissionStatus: "PAYABLE",
    commissionAvailableAt: order.commissionAvailableAt,
    totalInCents: order.totalInCents,
  });
  await prisma.order.update({
    where: { code },
    data: { commissionStatus: updated.commissionStatus },
  });
}

export async function setNfNumberInDb(code: string, nfNumber: string): Promise<void> {
  await prisma.order.update({
    where: { code },
    data: { nfNumber: nfNumber.trim() },
  });
}

export async function refreshCommissionStatuses(now = new Date()): Promise<void> {
  const orders = await prisma.order.findMany({
    where: { commissionStatus: "PENDING", confirmedAt: { not: null } },
  });
  for (const order of orders) {
    const next = advanceCommission(
      {
        confirmedAt: order.confirmedAt,
        commissionInCents: order.commissionInCents,
        commissionStatus: order.commissionStatus as CommissionStatus,
        commissionAvailableAt: order.commissionAvailableAt,
        totalInCents: order.totalInCents,
      },
      { now }
    );
    if (next.commissionStatus !== order.commissionStatus) {
      await prisma.order.update({
        where: { code: order.code },
        data: { commissionStatus: next.commissionStatus },
      });
    }
  }
}
