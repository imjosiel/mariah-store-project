import { NextResponse } from "next/server";

import { handleAsaasWebhook, tokenAsaasValido } from "@/lib/asaas-webhook";
import { registerFinancialEvent, setGatewayPayment } from "@/lib/orderStore";

export async function POST(request: Request) {
  if (
    !tokenAsaasValido(
      request.headers.get("asaas-access-token"),
      process.env.ASAAS_WEBHOOK_TOKEN
    )
  ) {
    return NextResponse.json({ received: false }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ received: false }, { status: 400 });
  }

  try {
    await handleAsaasWebhook(body as Parameters<typeof handleAsaasWebhook>[0], {
      registerFinancialEvent,
      setGatewayPayment,
    });
  } catch {
    // Responde 200 para o Asaas não reprocessar; o erro fica no log do servidor.
    console.error("Falha ao processar webhook do Asaas");
  }

  return NextResponse.json({ received: true });
}
