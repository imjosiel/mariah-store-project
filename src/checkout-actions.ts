"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { canManageAdmins } from "@/domain/admin-access";
import { calculateCommission, commissionBpsOr } from "@/domain/commission";
import { getSuperAdminEmail } from "@/lib/adminStore";
import { createPixCharge, getPixQrCode, type PixQrCode } from "@/lib/asaas";
import {
  gatewayIsConfigured,
  getCheckoutSettings,
  updateCheckoutSettings,
  type CheckoutSettings,
} from "@/lib/checkoutSettings";
import { getCommissionSettings } from "@/lib/commissionSettings";
import { setGatewayPayment } from "@/lib/orderStore";
import { prisma } from "@/lib/prisma";

export async function createPixChargeAction(input: {
  code: string;
  customerName: string;
  customerCpfCnpj: string;
}): Promise<{ paymentId: string; qrCode: PixQrCode }> {
  const checkout = await getCheckoutSettings();
  if (!checkout.pixGatewayEnabled || !gatewayIsConfigured()) {
    throw new Error("Pagamento via gateway indisponível.");
  }

  const order = await prisma.order.findUnique({
    where: { code: input.code },
    include: { items: true },
  });
  if (!order) throw new Error("Pedido não encontrado.");
  if (order.status !== "SENT_TO_WHATSAPP") {
    throw new Error("Este pedido não aceita nova cobrança.");
  }

  if (order.gatewayPaymentId) {
    return {
      paymentId: order.gatewayPaymentId,
      qrCode: await getPixQrCode(order.gatewayPaymentId),
    };
  }

  const settings = await getCommissionSettings();
  const costInCents = order.items.reduce(
    (sum, item) => sum + item.unitCostInCents * item.quantity,
    0
  );
  const commissionInCents =
    order.commissionInCents > 0
      ? order.commissionInCents
      : calculateCommission({
          costInCents,
          receivedInCents: order.totalInCents,
          commissionBps: commissionBpsOr(settings),
        });

  const result = await createPixCharge({
    orderCode: order.code,
    amountInCents: order.totalInCents,
    commissionInCents,
    customerName: input.customerName,
    customerCpfCnpj: input.customerCpfCnpj,
    description: `Pedido ${order.code}`,
  });

  await setGatewayPayment(order.code, result.paymentId, commissionInCents);
  return result;
}

export async function updateCheckoutSettingsAction(
  input: CheckoutSettings
): Promise<void> {
  const session = await auth();
  if (!canManageAdmins(session?.user?.email, await getSuperAdminEmail())) {
    throw new Error("Acesso negado");
  }

  await updateCheckoutSettings(input, session?.user?.email ?? "desconhecido");
  revalidatePath("/admin/financeiro/regras");
  revalidatePath("/");
}
