import type { CheckoutMethod } from "@prisma/client";

import { prisma } from "./prisma";

export interface CheckoutSettings {
  pixGatewayEnabled: boolean;
  whatsappEnabled: boolean;
  preferredMethod: CheckoutMethod;
}

/** Singleton: cria a linha com o checkout tradicional ligado e o gateway desligado. */
export async function getCheckoutSettings(): Promise<CheckoutSettings> {
  let row = await prisma.checkoutSetting.findFirst();
  if (!row) row = await prisma.checkoutSetting.create({ data: {} });

  return {
    pixGatewayEnabled: row.pixGatewayEnabled,
    whatsappEnabled: row.whatsappEnabled,
    preferredMethod: row.preferredMethod,
  };
}

export async function updateCheckoutSettings(
  input: CheckoutSettings,
  email: string
): Promise<void> {
  const current = await prisma.checkoutSetting.findFirst();
  const data = { ...input, updatedByEmail: email };

  if (current) {
    await prisma.checkoutSetting.update({ where: { id: current.id }, data });
  } else {
    await prisma.checkoutSetting.create({ data });
  }
}

/** Sem chave e walletId não existe cobrança — a vitrine cai para o WhatsApp. */
export function gatewayIsConfigured(): boolean {
  return Boolean(
    process.env.ASAAS_API_KEY?.trim() && process.env.ASAAS_WALLET_ID?.trim()
  );
}
