"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { canAccessAdmin, canManageAdmins } from "@/domain/admin-access";
import { getAdminEmails, getSuperAdminEmail } from "@/lib/adminStore";
import {
  cancelOrderInDb,
  confirmOrderInDb,
  createOrder,
  createPosOrder,
  markOrderDeliveredInDb,
  markOrderPaid,
  markOrderShippedInDb,
  refreshCommissionStatuses,
  registerFinancialEvent,
  setNfNumberInDb,
  setOrderSaleInfo,
  type OrderView,
} from "@/lib/orderStore";
import type { BagItem } from "@/types/store";

async function requireAdmin(): Promise<void> {
  const session = await auth();
  const admins = await getAdminEmails();
  if (!canAccessAdmin(session?.user?.email, admins)) {
    throw new Error("Acesso negado");
  }
}

function revalidateAdmin(): void {
  revalidatePath("/admin");
  revalidatePath("/admin/produtos");
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/financeiro");
}

async function requireSuperAdmin(): Promise<void> {
  const session = await auth();
  if (!canManageAdmins(session?.user?.email, await getSuperAdminEmail())) {
    throw new Error("Acesso negado");
  }
}

export async function createOrderAction(
  items: readonly BagItem[],
  customerName: string,
  whatsappPayload: string,
  code: string
): Promise<OrderView> {
  return createOrder({ code, items, customerName, whatsappPayload });
}

export async function confirmOrderAction(code: string): Promise<void> {
  await requireAdmin();
  await confirmOrderInDb(code);
  revalidateAdmin();
}

export async function cancelOrderAction(code: string, reason = ""): Promise<void> {
  await requireAdmin();
  await cancelOrderInDb(code, reason);
  revalidateAdmin();
}

export async function markOrderShippedAction(code: string): Promise<void> {
  await requireAdmin();
  await markOrderShippedInDb(code);
  revalidateAdmin();
}

export async function markOrderDeliveredAction(code: string): Promise<void> {
  await requireAdmin();
  await markOrderDeliveredInDb(code);
  revalidateAdmin();
}

export async function markOrderPaidAction(code: string): Promise<void> {
  await requireAdmin();
  await markOrderPaid(code);
  revalidateAdmin();
}

export async function setNfNumberAction(code: string, nfNumber: string): Promise<void> {
  await requireAdmin();
  await setNfNumberInDb(code, nfNumber);
  revalidateAdmin();
}

export async function refreshCommissionsAction(): Promise<void> {
  await requireAdmin();
  await refreshCommissionStatuses();
  revalidateAdmin();
}

export async function createPosOrderAction(input: {
  variantId: string;
  sizeLabel: string;
  quantity: number;
  unitPriceInCents: number;
  paymentMethod: "PIX" | "DINHEIRO" | "CARTAO" | "OUTRO";
  customerName: string;
}): Promise<{ code: string; commissionInCents: number }> {
  await requireAdmin();
  const result = await createPosOrder(input);
  revalidateAdmin();
  return result;
}

export async function setOrderSaleInfoAction(
  code: string,
  channel: "ONLINE" | "LOJA",
  paymentMethod: "PIX" | "DINHEIRO" | "CARTAO" | "GATEWAY" | "OUTRO" | null
): Promise<void> {
  await requireAdmin();
  await setOrderSaleInfo(code, channel, paymentMethod);
  revalidateAdmin();
}

export async function registerFinancialEventAction(input: {
  orderCode?: string | null;
  type:
    | "PAYMENT_RECEIVED"
    | "COMMISSION_PAID"
    | "COMMISSION_REFUNDED"
    | "ORDER_REFUNDED";
  amountInCents: number;
  storeAmountInCents?: number | null;
  feeInCents?: number;
  note?: string | null;
  receiptUrl?: string | null;
}): Promise<void> {
  await requireSuperAdmin();
  await registerFinancialEvent(input);
  revalidateAdmin();
}
