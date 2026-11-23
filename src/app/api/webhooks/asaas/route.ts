import { NextResponse } from "next/server";

import {
  registerFinancialEvent,
  setGatewayPayment,
} from "@/lib/orderStore";

interface AsaasWebhook {
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

const cents = (value: number | undefined) => Math.round((value ?? 0) * 100);

export async function POST(request: Request) {
  const token = process.env.ASAAS_WEBHOOK_TOKEN?.trim();
  if (!token || request.headers.get("asaas-access-token") !== token) {
    return NextResponse.json({ received: false }, { status: 401 });
  }

  let body: AsaasWebhook;
  try {
    body = (await request.json()) as AsaasWebhook;
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  const payment = body.payment;
  const orderCode = payment?.externalReference?.trim() || null;
  const eventId = body.id?.trim();

  if (!eventId || !payment?.id || !orderCode) {
    return NextResponse.json({ received: true });
  }

  try {
    await setGatewayPayment(orderCode, payment.id);

    if (body.event === "PAYMENT_RECEIVED") {
      const amountInCents = cents(payment.netValue ?? payment.value);
      await registerFinancialEvent({
        orderCode,
        type: "PAYMENT_RECEIVED",
        amountInCents,
        externalId: `asaas-received-${eventId}`,
        note: `Cobrança ${payment.id}`,
      });
    }

    if (body.event === "PAYMENT_SPLIT_DONE") {
      const splitId = body.additionalInfo?.splitId;
      const split =
        payment.split?.find((item) => item.id === splitId) ??
        payment.split?.[0];
      await registerFinancialEvent({
        orderCode,
        type: "COMMISSION_PAID",
        amountInCents: cents(split?.fixedValue),
        externalId: `asaas-split-${splitId ?? eventId}`,
        receiptUrl: payment.id,
        note: `Split ${splitId ?? payment.id}`,
      });
    }

    if (
      body.event === "PAYMENT_REFUNDED" ||
      body.event === "PAYMENT_PARTIALLY_REFUNDED"
    ) {
      const refunds = (payment.refunds ?? []).filter((item) => item.status === "DONE");
      const refundedInCents = refunds.reduce((sum, item) => sum + cents(item.value), 0);
      if (refundedInCents > 0) {
        await registerFinancialEvent({
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
        await registerFinancialEvent({
          orderCode,
          type: "COMMISSION_REFUNDED",
          amountInCents: splitRefundedInCents,
          externalId: `asaas-split-refund-${eventId}`,
        });
      }
    }
  } catch {
    // Responde 200 para o Asaas não reprocessar; o erro fica no log do servidor.
    console.error("Falha ao processar webhook do Asaas", eventId);
  }

  return NextResponse.json({ received: true });
}
