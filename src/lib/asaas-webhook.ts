import type { RegisterFinancialEventInput } from "./orderStore";

export interface AsaasWebhook {
  id: string;
  event: string;
  payment?: {
    id: string;
    value: number;
    netValue?: number;
    externalReference?: string | null;
    split?: Array<{
      id: string;
      walletId: string;
      fixedValue?: number;
      percentualValue?: number;
      status: string;
    }>;
    refunds?: Array<{
      value: number;
      status: string;
      refundedSplits?: Array<{ id: string; value: number; done: boolean }>;
    }>;
  };
  additionalInfo?: { splitId?: string };
}

export interface AsaasWebhookDeps {
  registerFinancialEvent: (input: RegisterFinancialEventInput) => Promise<void>;
  setGatewayPayment: (code: string, paymentId: string) => Promise<void>;
}

const cents = (value: number | undefined) => Math.round((value ?? 0) * 100);

export function tokenAsaasValido(header: string | null, esperado: string | undefined): boolean {
  return Boolean(esperado?.trim() && header === esperado.trim());
}

/** Traduz os eventos do Asaas para os eventos financeiros internos. */
export async function handleAsaasWebhook(
  body: AsaasWebhook,
  deps: AsaasWebhookDeps
): Promise<void> {
  const payment = body.payment;
  const orderCode = payment?.externalReference?.trim() || null;
  const eventId = body.id?.trim();

  if (!eventId || !payment?.id || !orderCode) return;

  await deps.setGatewayPayment(orderCode, payment.id);

  if (body.event === "PAYMENT_RECEIVED") {
    await deps.registerFinancialEvent({
      orderCode,
      type: "PAYMENT_RECEIVED",
      amountInCents: cents(payment.netValue ?? payment.value),
      externalId: `asaas-received-${eventId}`,
      note: `Cobrança ${payment.id}`,
    });
  }

  if (body.event === "PAYMENT_SPLIT_DONE") {
    const splitId = body.additionalInfo?.splitId;
    const split = payment.split?.find((item) => item.id === splitId) ?? payment.split?.[0];
    await deps.registerFinancialEvent({
      orderCode,
      type: "COMMISSION_PAID",
      amountInCents: cents(split?.fixedValue),
      externalId: `asaas-split-${splitId ?? eventId}`,
      receiptUrl: payment.id,
      note: `Split ${splitId ?? payment.id}`,
    });
  }

  if (body.event === "PAYMENT_REFUNDED" || body.event === "PAYMENT_PARTIALLY_REFUNDED") {
    const refunds = (payment.refunds ?? []).filter((item) => item.status === "DONE");
    const refundedInCents = refunds.reduce((sum, item) => sum + cents(item.value), 0);
    if (refundedInCents > 0) {
      await deps.registerFinancialEvent({
        orderCode,
        type: "ORDER_REFUNDED",
        amountInCents: refundedInCents,
        externalId: `asaas-refund-${eventId}`,
      });
    }

    const splitRefundedInCents = refunds.reduce(
      (sum, refund) =>
        sum +
        (refund.refundedSplits ?? [])
          .filter((split) => split.done)
          .reduce((total, split) => total + cents(split.value), 0),
      0
    );
    if (splitRefundedInCents > 0) {
      await deps.registerFinancialEvent({
        orderCode,
        type: "COMMISSION_REFUNDED",
        amountInCents: splitRefundedInCents,
        externalId: `asaas-split-refund-${eventId}`,
      });
    }
  }
}
