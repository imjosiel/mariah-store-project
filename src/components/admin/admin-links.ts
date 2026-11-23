/** Rotas visíveis apenas para o super admin. */
const SUPER_ADMIN_HREFS = new Set(["/admin/usuarios", "/admin/armazenamento"]);

export function visibleAdminLinks<T extends { href: string }>(
  links: readonly T[],
  isSuperAdmin: boolean
): T[] {
  return isSuperAdmin
    ? [...links]
    : links.filter((link) => !SUPER_ADMIN_HREFS.has(link.href));
}
