/**
 * Resumo dos eventos financeiros — puro, sem React/Prisma/Next.
 * Alimenta o relatório do super admin. A fonte dos eventos pode mudar
 * (manual hoje, webhook do gateway no futuro) sem alterar esta regra.
 */

export type FinancialEventType =
  | "PAYMENT_RECEIVED"
  | "COMMISSION_PAID"
  | "COMMISSION_REFUNDED"
  | "ORDER_REFUNDED";

export interface FinancialEventLike {
  type: FinancialEventType;
  amountInCents: number;
  storeAmountInCents: number | null;
  feeInCents: number;
}

export interface FinancialSummary {
  receivedInCents: number;
  feesInCents: number;
  commissionPaidInCents: number;
  commissionRefundedInCents: number;
  orderRefundedInCents: number;
  commissionNetInCents: number;
  storeNetInCents: number;
}

const ZERO: FinancialSummary = {
  receivedInCents: 0,
  feesInCents: 0,
  commissionPaidInCents: 0,
  commissionRefundedInCents: 0,
  orderRefundedInCents: 0,
  commissionNetInCents: 0,
  storeNetInCents: 0,
};

export function summarizeFinancialEvents(
  events: readonly FinancialEventLike[]
): FinancialSummary {
  if (events.length === 0) return ZERO;

  const sum = (type: FinancialEventType) =>
    events.reduce(
      (total, event) => total + (event.type === type ? event.amountInCents : 0),
      0
    );

  const receivedInCents = sum("PAYMENT_RECEIVED");
  const commissionPaidInCents = sum("COMMISSION_PAID");
  const commissionRefundedInCents = sum("COMMISSION_REFUNDED");
  const orderRefundedInCents = sum("ORDER_REFUNDED");
  const storeAmountInCents = events.reduce(
    (total, event) =>
      total + (event.type === "PAYMENT_RECEIVED" ? (event.storeAmountInCents ?? 0) : 0),
    0
  );

  return {
    receivedInCents,
    feesInCents: events.reduce((total, event) => total + event.feeInCents, 0),
    commissionPaidInCents,
    commissionRefundedInCents,
    orderRefundedInCents,
    commissionNetInCents: commissionPaidInCents - commissionRefundedInCents,
    storeNetInCents: storeAmountInCents - orderRefundedInCents,
  };
}
