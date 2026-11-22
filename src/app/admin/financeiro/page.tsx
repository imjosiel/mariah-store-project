// Lê sessão e allowlist no request — opt-out de prerender (Next 16).
export const instant = false;

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { canManageAdmins } from "@/domain/admin-access";
import { getSuperAdminEmail } from "@/lib/adminStore";
import { summarizeFinancialEvents } from "@/domain/financial";
import { listFinancialEvents, listOrders } from "@/lib/orderStore";

import { FinanceiroClient } from "./FinanceiroClient";

export default async function FinanceiroPage() {
  const session = await auth();
  if (!canManageAdmins(session?.user?.email, await getSuperAdminEmail())) {
    redirect("/admin");
  }

  const [events, orders] = await Promise.all([listFinancialEvents(), listOrders()]);
  const summary = summarizeFinancialEvents(events);

  return (
    <FinanceiroClient
      summary={summary}
      events={events}
      orders={orders.map((order) => ({
        code: order.code,
        customerName: order.customerName,
        totalInCents: order.totalInCents,
        commissionInCents: order.commissionInCents,
        commissionStatus: order.commissionStatus,
      }))}
    />
  );
}
