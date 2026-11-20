// A layout lê a sessão (cookies) e a allowlist em disco — não dá para
// prerender. Opt-out documentado:
// https://nextjs.org/docs/app/guides/authentication-with-cache-components
export const instant = false;

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { canAccessAdmin } from "@/domain/admin-access";
import { ensureFirstAdmin, getAdminEmails } from "@/lib/adminStore";

/**
 * Autorização fina: roda em runtime Node porque a allowlist mora em arquivo.
 * O proxy só garante que há sessão; aqui decidimos se o e-mail é admin.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  await ensureFirstAdmin(session.user.email);
  const admins = await getAdminEmails();
  if (!canAccessAdmin(session.user.email, admins)) redirect("/sem-acesso");

  return <>{children}</>;
}
