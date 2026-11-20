import { parseAdminEmails } from "../domain/admin-access";
import { prisma } from "./prisma";

/**
 * Allowlist de admins no Postgres (Fase 2).
 * Regra: a PRIMEIRA conta Google que entrar no /admin vira super admin.
 * Depois disso, só ele pode adicionar/remover outros e-mails.
 */

export async function getSuperAdminEmail(): Promise<string> {
  const row = await prisma.admin.findFirst({
    where: { isSuper: true },
    select: { email: true },
  });
  return row?.email ?? "";
}

/** Chamado pela layout do /admin após autenticar. Só cria se a tabela estiver vazia. */
export async function ensureFirstAdmin(email: string | null | undefined): Promise<void> {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return;
  if ((await prisma.admin.count()) > 0) return;

  await prisma.admin.upsert({
    where: { email: normalized },
    update: { isSuper: true },
    create: { email: normalized, isSuper: true },
  });
}

export async function getAdminEmails(): Promise<string[]> {
  const rows = await prisma.admin.findMany({
    select: { email: true, isSuper: true },
    orderBy: { email: "asc" },
  });
  return rows.map((row) => row.email).sort((a, b) => {
    const aSuper = rows.find((row) => row.email === a)?.isSuper;
    const bSuper = rows.find((row) => row.email === b)?.isSuper;
    if (aSuper && !bSuper) return -1;
    if (bSuper && !aSuper) return 1;
    return a.localeCompare(b);
  });
}

export async function saveAdminEmails(emails: readonly string[]): Promise<string[]> {
  const superEmail = await getSuperAdminEmail();
  const normalized = Array.from(
    new Set([superEmail, ...parseAdminEmails(emails.join(","))].filter(Boolean))
  );

  await prisma.$transaction([
    prisma.admin.deleteMany({
      where: { email: { notIn: normalized }, isSuper: false },
    }),
    ...normalized.map((email) =>
      prisma.admin.upsert({
        where: { email },
        update: { isSuper: email === superEmail },
        create: { email, isSuper: email === superEmail },
      })
    ),
  ]);

  return getAdminEmails();
}

export async function addAdminEmail(email: string): Promise<string[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return getAdminEmails();

  const superEmail = await getSuperAdminEmail();
  await prisma.admin.upsert({
    where: { email: normalized },
    update: {},
    create: { email: normalized, isSuper: normalized === superEmail },
  });

  return getAdminEmails();
}

export async function removeAdminEmail(email: string): Promise<string[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return getAdminEmails();
  await prisma.admin.deleteMany({
    where: { email: normalized, isSuper: false },
  });
  return getAdminEmails();
}
