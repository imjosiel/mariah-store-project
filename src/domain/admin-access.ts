/**
 * Regras de acesso ao admin. Puras, sem Next/Prisma/fs.
 * - canAccessAdmin: allowlist dinâmica (fail-closed)
 * - canManageAdmins: apenas o super admin pode alterar a allowlist
 */

export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function canAccessAdmin(
  email: string | null | undefined,
  allowlist: readonly string[]
): boolean {
  if (!email || allowlist.length === 0) return false;
  return allowlist.includes(email.toLowerCase());
}

export function canManageAdmins(
  email: string | null | undefined,
  superAdminEmail: string | null | undefined
): boolean {
  if (!email || !superAdminEmail) return false;
  return email.toLowerCase() === superAdminEmail.toLowerCase();
}
