// Lê sessão e allowlist em disco no request — opt-out de prerender (Next 16).
export const instant = false;

import { auth } from "@/auth";
import { getAdminEmails, getSuperAdminEmail } from "@/lib/adminStore";

import { AdminUsersClient } from "./AdminUsersClient";

export default async function AdminUsersPage() {
  const [admins, session] = await Promise.all([getAdminEmails(), auth()]);

  return (
    <AdminUsersClient
      admins={admins}
      superEmail={await getSuperAdminEmail()}
      currentEmail={session?.user?.email ?? ""}
    />
  );
}
