import type {
  FinancialEvent,
  FinancialEventType,
  Order,
  OrderItem,
  PaymentMethod,
  PostSaleEvent,
  Prisma,
  SaleChannel,
} from "@prisma/client";

import {
  advanceCommission,
  calculateCommission,
  commissionAvailableAt,
  commissionBpsOr,
  graceDaysForChannel,
  markCommissionPaid,
  type CommissionStatus,
} from "../domain/commission";
import { getCommissionSettings } from "./commissionSettings";
import {
  canCancelOrder,
  canConfirmOrder,
  canDeliverOrder,
  canShipOrder,
  shouldRestoreStock,
} from "../domain/order-status";
import type { BagItem } from "../types/store";
import { prisma } from "./prisma";

export interface FinancialEventView {
  id: string;
  orderCode: string | null;
  type: FinancialEventType;
  amountInCents: number;
  storeAmountInCents: number | null;
  feeInCents: number;
  occurredAt: string;
  externalId: string | null;
  receiptUrl: string | null;
  note: string | null;
}

/** Pedidos no Postgres (Fase 2). Datas serializadas para o Client Component. */
export interface OrderView {
  code: string;
  customerName: string;
  totalInCents: number;
  costInCents: number;
  marginInCents: number;
  whatsappPayload: string;
  status: Order["status"];
  channel: SaleChannel;
  paymentMethod: PaymentMethod | null;
  financialEvents: FinancialEventView[];
  postSales: Array<{
    id: string;
    type: PostSaleEvent["type"];
    reason: string;
    authorizedByEmail: string;
    restock: boolean;
    refunded: boolean;
    commissionReversed: boolean;
    createdAt: string;
  }>;
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
  order: Order & {
    items: OrderItem[];
    financialEvents?: FinancialEvent[];
    postSaleEvents?: PostSaleEvent[];
  }
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
    channel: order.channel,
    paymentMethod: order.paymentMethod,
    financialEvents: (order.financialEvents ?? []).map((event) => ({
      id: event.id,
      orderCode: null,
      type: event.type,
      amountInCents: event.amountInCents,
      storeAmountInCents: event.storeAmountInCents,
      feeInCents: event.feeInCents,
      occurredAt: event.occurredAt.toISOString(),
      externalId: event.externalId,
      receiptUrl: event.receiptUrl,
      note: event.note,
    })),
    postSales: (order.postSaleEvents ?? []).map((event) => ({
      id: event.id,
      type: event.type,
      reason: event.reason,
      authorizedByEmail: event.authorizedByEmail,
      restock: event.restock,
      refunded: event.refunded,
      commissionReversed: event.commissionReversed,
      createdAt: event.createdAt.toISOString(),
    })),
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
  channel?: SaleChannel;
  paymentMethod?: PaymentMethod | null;
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
      channel: input.channel ?? "ONLINE",
      paymentMethod: input.paymentMethod ?? null,
      whatsappPayload: input.whatsappPayload,
      items: { createMany: { data: items } },
    },
    include: { items: true },
  });

  return toView(created);
}

export async function listOrders(): Promise<OrderView[]> {
  const orders = await prisma.order.findMany({
    include: { items: true, financialEvents: true, postSaleEvents: true },
    orderBy: { createdAt: "desc" },
  });
  return orders.map(toView);
}

export interface RegisterFinancialEventInput {
  orderCode?: string | null;
  type: FinancialEventType;
  amountInCents: number;
  storeAmountInCents?: number | null;
  feeInCents?: number;
  occurredAt?: Date;
  externalId?: string | null;
  receiptUrl?: string | null;
  note?: string | null;
}

/** Idempotente por externalId — preparado para webhooks do gateway. */
export async function registerFinancialEvent(
  input: RegisterFinancialEventInput
): Promise<void> {
  if (!Number.isInteger(input.amountInCents) || input.amountInCents < 0) {
    throw new Error("Valor inválido");
  }

  const externalId = input.externalId?.trim() || null;
  if (externalId) {
    const existing = await prisma.financialEvent.findUnique({ where: { externalId } });
    if (existing) return;
  }

  let orderId: string | null = null;
  if (input.orderCode) {
    const order = await prisma.order.findUnique({
      where: { code: input.orderCode },
      select: { id: true },
    });
    if (!order) throw new Error("Pedido não encontrado");
    orderId = order.id;
  }

  await prisma.$transaction(async (tx) => {
    await tx.financialEvent.create({
      data: {
        orderId,
        type: input.type,
        amountInCents: input.amountInCents,
        storeAmountInCents: input.storeAmountInCents ?? null,
        feeInCents: input.feeInCents ?? 0,
        occurredAt: input.occurredAt ?? new Date(),
        externalId,
        receiptUrl: input.receiptUrl?.trim() || null,
        note: input.note?.trim() || null,
      },
    });

    if (orderId && input.type === "COMMISSION_PAID") {
      await tx.order.update({
        where: { id: orderId },
        data: { commissionStatus: "PAID" },
      });
    }
    if (orderId && input.type === "COMMISSION_REFUNDED") {
      await tx.order.update({
        where: { id: orderId },
        data: { commissionStatus: "REVERSED" },
      });
    }
  });
}

export async function listFinancialEvents(): Promise<FinancialEventView[]> {
  const events = await prisma.financialEvent.findMany({
    include: { order: { select: { code: true } } },
    orderBy: { occurredAt: "desc" },
  });
  return events.map((event) => ({
    id: event.id,
    orderCode: event.order?.code ?? null,
    type: event.type,
    amountInCents: event.amountInCents,
    storeAmountInCents: event.storeAmountInCents,
    feeInCents: event.feeInCents,
    occurredAt: event.occurredAt.toISOString(),
    externalId: event.externalId,
    receiptUrl: event.receiptUrl,
    note: event.note,
  }));
}

/** Gerado fora da transação: evita estourar o timeout do Prisma em conexões lentas. */
async function nextOrderCode(client: Pick<typeof prisma, "order">): Promise<string> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const code = `MS-${Math.floor(1000 + Math.random() * 9000)}`;
    const existing = await client.order.findUnique({ where: { code }, select: { id: true } });
    if (!existing) return code;
  }
  throw new Error("Não foi possível gerar um código de pedido");
}

export interface PosOrderInput {
  variantId: string;
  sizeLabel: string;
  quantity: number;
  /** Valor efetivamente recebido por peça — já com eventual desconto de balcão. */
  unitPriceInCents: number;
  paymentMethod: PaymentMethod;
  customerName: string;
}

/**
 * Venda presencial: pedido nasce CONFIRMED, estoque é baixado na mesma
 * transação e o recebimento vira evento financeiro. Nunca vende sem estoque.
 */
export async function createPosOrder(
  input: PosOrderInput
): Promise<{ code: string; commissionInCents: number }> {
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new Error("Quantidade inválida");
  }
  if (!Number.isInteger(input.unitPriceInCents) || input.unitPriceInCents <= 0) {
    throw new Error("Valor inválido");
  }

  const code = await nextOrderCode(prisma);
  const settings = await getCommissionSettings();

  return prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUnique({
      where: { id: input.variantId },
      include: { product: true },
    });
    if (!variant || variant.product.archivedAt) throw new Error("Peça não encontrada");

    const stock = await tx.variantStock.findUnique({
      where: {
        variantId_sizeLabel: { variantId: variant.id, sizeLabel: input.sizeLabel },
      },
    });
    if (!stock) throw new Error("Tamanho não disponível nesta cor");

    const decremented = await tx.variantStock.updateMany({
      where: { id: stock.id, stock: { gte: input.quantity } },
      data: { stock: { decrement: input.quantity } },
    });
    if (decremented.count !== 1) {
      throw new Error(`Estoque insuficiente: há ${stock.stock} disponível(is)`);
    }

    const totalInCents = input.unitPriceInCents * input.quantity;
    const costInCents = variant.product.costInCents * input.quantity;
    const commissionInCents = calculateCommission({
      costInCents,
      receivedInCents: totalInCents,
      commissionBps: commissionBpsOr(settings),
    });
    const now = new Date();

    await tx.order.create({
      data: {
        code,
        customerName: input.customerName.trim() || null,
        totalInCents,
        status: "CONFIRMED",
        channel: "LOJA",
        paymentMethod: input.paymentMethod,
        confirmedAt: now,
        commissionInCents,
        // Repasse da loja física ainda será decidido; mantém o padrão atual.
        commissionStatus: "PENDING",
        commissionAvailableAt: commissionAvailableAt(
          now,
          graceDaysForChannel(settings, "LOJA")
        ),
        items: {
          create: [{
            productId: variant.productId,
            variantId: variant.id,
            sizeLabel: input.sizeLabel,
            quantity: input.quantity,
            productName: variant.product.name,
            colorName: variant.colorName,
            unitPriceInCents: input.unitPriceInCents,
            unitCostInCents: variant.product.costInCents,
          }],
        },
        financialEvents: {
          create: [{
            type: "PAYMENT_RECEIVED",
            amountInCents: totalInCents,
            storeAmountInCents: totalInCents - commissionInCents,
            feeInCents: 0,
            note: "Venda presencial",
          }],
        },
      },
    });

    return { code, commissionInCents };
  }, { timeout: 15_000 });
}

export async function setOrderSaleInfo(
  code: string,
  channel: SaleChannel,
  paymentMethod: PaymentMethod | null
): Promise<void> {
  await prisma.order.update({
    where: { code },
    data: { channel, paymentMethod },
  });
}

export async function confirmOrderInDb(code: string, at = new Date()): Promise<void> {
  const settings = await getCommissionSettings();
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
          commissionBps: commissionBpsOr(settings),
        }),
        commissionStatus: "PENDING",
        commissionAvailableAt: commissionAvailableAt(
          at,
          graceDaysForChannel(settings, order.channel)
        ),
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

export interface RegisterPostSaleInput {
  orderCode: string;
  type: PostSaleEvent["type"];
  reason: string;
  authorizedByEmail: string;
  restock: boolean;
  refunded: boolean;
  commissionReversed: boolean;
  note?: string;
}

/** Troca/devolução: efeitos escolhidos pela loja, registrados na mesma transação. */
export async function registerPostSale(input: RegisterPostSaleInput): Promise<void> {
  if (!input.reason.trim()) throw new Error("Informe o motivo");

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { code: input.orderCode },
      include: { items: true },
    });
    if (!order) throw new Error("Pedido não encontrado");
    if (order.status === "RETURNED" || order.status === "CANCELLED") {
      throw new Error("Este pedido já foi encerrado");
    }

    const restore = input.restock && !order.stockRestoredAt;
    if (restore) {
      for (const item of order.items) {
        await tx.variantStock.updateMany({
          where: { variantId: item.variantId, sizeLabel: item.sizeLabel },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    if (input.refunded) {
      await tx.financialEvent.create({
        data: {
          orderId: order.id,
          type: "ORDER_REFUNDED",
          amountInCents: order.totalInCents,
          note: input.note?.trim() || `Estorno por ${input.type.toLowerCase()}`,
        },
      });
    }

    if (input.commissionReversed) {
      await tx.financialEvent.create({
        data: {
          orderId: order.id,
          type: "COMMISSION_REFUNDED",
          amountInCents: order.commissionInCents,
          note: input.note?.trim() || null,
        },
      });
      await tx.order.update({
        where: { id: order.id },
        data: { commissionStatus: "REVERSED" },
      });
    }

    await tx.postSaleEvent.create({
      data: {
        orderId: order.id,
        type: input.type,
        reason: input.reason.trim(),
        authorizedByEmail: input.authorizedByEmail,
        restock: input.restock,
        refunded: input.refunded,
        commissionReversed: input.commissionReversed,
        note: input.note?.trim() || null,
      },
    });

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "RETURNED",
        ...(restore ? { stockRestoredAt: new Date() } : {}),
      },
    });
  });
}
