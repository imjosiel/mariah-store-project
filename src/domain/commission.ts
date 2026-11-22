/**
 * Regras de dinheiro — puras, sem React/Prisma/Next.
 * Fonte da verdade: docs/07-COMMERCE-AND-MONEY.md
 *
 * margem  = preço efetivamente recebido − custo da peça
 * comissão = 10% da margem
 */

export const DEFAULT_COMMISSION_BPS = 1000; // 10%
export const REFUND_WINDOW_DAYS = 7; // CDC art. 49
export const MS_PER_DAY = 86_400_000;
export const BPS_DIVISOR = 10_000;

export type CommissionStatus =
  | "PENDING"
  | "PAYABLE"
  | "PAID"
  | "REVERSED";

export interface CommissionInput {
  costInCents: number;
  receivedInCents: number;
  /** Opcional: informado apenas para deixar explícito que NÃO entra na base. */
  shippingInCents?: number;
  commissionBps?: number;
}

export interface CommissionableOrder {
  confirmedAt: Date | null;
  commissionInCents: number;
  commissionStatus: CommissionStatus;
  commissionAvailableAt: Date | null;
  totalInCents: number;
}

/** 10% da margem, arredondado em centavos. Nunca negativo. */
export function calculateCommission(input: CommissionInput): number {
  const {
    costInCents,
    receivedInCents,
    commissionBps = DEFAULT_COMMISSION_BPS,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    shippingInCents = 0,
  } = input;

  const marginInCents = receivedInCents - costInCents;
  if (marginInCents <= 0) return 0;

  return Math.round((marginInCents * commissionBps) / BPS_DIVISOR);
}

/** O direito só se concretiza depois dos 7 dias de arrependimento. */
export function commissionAvailableAt(
  confirmedAt: Date,
  days: number = REFUND_WINDOW_DAYS
): Date {
  return new Date(confirmedAt.getTime() + days * MS_PER_DAY);
}

/**
 * Confirma o pedido e cria a comissão em PENDING.
 * Idempotente: se já foi confirmado, retorna o objeto original.
 */
export function confirmOrder<T extends CommissionableOrder>(
  order: T,
  input: {
    confirmedAt: Date;
    costInCents: number;
    receivedInCents?: number;
    commissionBps?: number;
  }
): T {
  if (order.confirmedAt) return order;

  const receivedInCents = input.receivedInCents ?? order.totalInCents;

  return {
    ...order,
    confirmedAt: input.confirmedAt,
    commissionInCents: calculateCommission({
      costInCents: input.costInCents,
      receivedInCents,
      commissionBps: input.commissionBps,
    }),
    commissionStatus: "PENDING",
    commissionAvailableAt: commissionAvailableAt(input.confirmedAt),
  };
}

/**
 * Avança o status conforme o tempo e o cancelamento.
 * - cancelado → REVERSED (exceto se já PAID, conforme docs/07 §4)
 * - PENDING + 7 dias → PAYABLE
 * - demais estados → inalterado
 */
export function advanceCommission<T extends CommissionableOrder>(
  order: T,
  { now, cancelled = false }: { now: Date; cancelled?: boolean }
): T {
  if (cancelled) {
    if (order.commissionStatus === "PAID") return order;
    return { ...order, commissionStatus: "REVERSED" };
  }

  if (order.commissionStatus !== "PENDING") return order;
  if (!order.commissionAvailableAt || now < order.commissionAvailableAt) {
    return order;
  }

  return { ...order, commissionStatus: "PAYABLE" };
}

export function markCommissionPaid<T extends CommissionableOrder>(order: T): T {
  if (order.commissionStatus !== "PAYABLE") return order;
  return { ...order, commissionStatus: "PAID" };
}

/** Soma margem/comissão a partir dos itens da sacola. */
export function calculateCartCommission(
  items: ReadonlyArray<{
    unitPriceInCents: number;
    unitCostInCents: number;
    quantity: number;
  }>,
  commissionBps?: number
): { totalInCents: number; costInCents: number; marginInCents: number; commissionInCents: number } {
  const totalInCents = items.reduce(
    (sum, item) => sum + item.unitPriceInCents * item.quantity,
    0
  );
  const costInCents = items.reduce(
    (sum, item) => sum + item.unitCostInCents * item.quantity,
    0
  );
  const marginInCents = totalInCents - costInCents;

  return {
    totalInCents,
    costInCents,
    marginInCents,
    commissionInCents: calculateCommission({
      costInCents,
      receivedInCents: totalInCents,
      commissionBps,
    }),
  };
}
