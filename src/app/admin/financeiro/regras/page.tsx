// Lê sessão e banco no request — opt-out de prerender (Next 16).
export const instant = false;

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { canManageAdmins } from "@/domain/admin-access";
import { getSuperAdminEmail } from "@/lib/adminStore";
import { getCommissionSettings } from "@/lib/commissionSettings";
import {
  gatewayIsConfigured,
  getCheckoutSettings,
} from "@/lib/checkoutSettings";

import { CommissionRulesClient } from "./CommissionRulesClient";

export default async function CommissionRulesPage() {
  const session = await auth();
  if (!canManageAdmins(session?.user?.email, await getSuperAdminEmail())) {
    redirect("/admin");
  }

  const [settings, checkout] = await Promise.all([
    getCommissionSettings(),
    getCheckoutSettings(),
  ]);
  return (
    <CommissionRulesClient
      settings={settings}
      checkout={checkout}
      gatewayConfigured={gatewayIsConfigured()}
    />
  );
}
