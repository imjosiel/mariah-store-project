"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { canAccessAdmin } from "@/domain/admin-access";
import { getAdminEmails } from "@/lib/adminStore";
import {
  cancelOrderInDb,
  confirmOrderInDb,
  createOrder,
  markOrderDeliveredInDb,
  markOrderPaid,
  markOrderShippedInDb,
  refreshCommissionStatuses,
  setNfNumberInDb,
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
