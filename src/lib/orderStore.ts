import type { Order, OrderItem, Prisma } from "@prisma/client";

import {
  advanceCommission,
  calculateCommission,
  commissionAvailableAt,
  markCommissionPaid,
  type CommissionStatus,
} from "../domain/commission";
import {
  canCancelOrder,
  canConfirmOrder,
  canDeliverOrder,
  canShipOrder,
  shouldRestoreStock,
} from "../domain/order-status";
import type { BagItem } from "../types/store";
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
  shippedAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string;
  stockRestored: boolean;
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
    shippedAt: order.shippedAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    cancelReason: order.cancelReason ?? "",
    stockRestored: order.stockRestoredAt !== null,
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
  code: string;
  customerName: string;
  items: readonly BagItem[];
  whatsappPayload: string;
}

/** Idempotente por código. O custo vem do banco, não do navegador. */
export async function createOrder(input: CreateOrderInput): Promise<OrderView> {
  const code = input.code;
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

  const totalInCents = input.items.reduce(
    (sum, item) => sum + item.unitPriceInCents * item.quantity,
    0
  );

  const variantIds = await prisma.productVariant.findMany({
    where: { id: { in: input.items.map((item) => item.variantId) } },
    select: { id: true },
  });
  const validVariantIds = new Set(variantIds.map((variant) => variant.id));

  const items: Prisma.OrderItemCreateManyOrderInput[] = input.items.map((item) => {
    const product = costBySlug.get(item.productSlug);

    return {
      productId: product?.id ?? item.productId,
      variantId: validVariantIds.has(item.variantId) ? item.variantId : "",
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
    if (!order || !canConfirmOrder(order)) return;

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

export async function cancelOrderInDb(
  code: string,
  reason = "",
  now = new Date()
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { code },
      include: { items: true },
    });
    if (!order || !canCancelOrder(order)) return;

    const restore = shouldRestoreStock(order);
    if (restore) {
      for (const item of order.items) {
        await tx.variantStock.updateMany({
          where: { variantId: item.variantId, sizeLabel: item.sizeLabel },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

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

    await tx.order.update({
      where: { code },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        cancelReason: reason.trim() || null,
        stockRestoredAt: restore ? now : order.stockRestoredAt,
        commissionStatus: updated.commissionStatus,
      },
    });
  });
}

export async function markOrderShippedInDb(code: string, at = new Date()): Promise<void> {
  const order = await prisma.order.findUnique({ where: { code } });
  if (!order || !canShipOrder(order)) return;
  await prisma.order.update({
    where: { code },
    data: { status: "SHIPPED", shippedAt: at },
  });
}

export async function markOrderDeliveredInDb(code: string, at = new Date()): Promise<void> {
  const order = await prisma.order.findUnique({ where: { code } });
  if (!order || !canDeliverOrder(order)) return;
  await prisma.order.update({
    where: { code },
    data: { status: "DELIVERED", deliveredAt: at },
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
