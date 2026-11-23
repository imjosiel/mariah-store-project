// Lê sessão e allowlist em disco no request — opt-out de prerender (Next 16).
export const instant = false;

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { canManageAdmins } from "@/domain/admin-access";
import { getAdminEmails, getSuperAdminEmail } from "@/lib/adminStore";

import { AdminUsersClient } from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const [admins, session, superAdminEmail] = await Promise.all([
    getAdminEmails(),
    auth(),
    getSuperAdminEmail(),
  ]);
  if (!canManageAdmins(session?.user?.email, superAdminEmail)) {
    redirect("/admin");
  }

  return (
    <AdminUsersClient
      admins={admins}
      superEmail={superAdminEmail}
      currentEmail={session?.user?.email ?? ""}
    />
  );
}
