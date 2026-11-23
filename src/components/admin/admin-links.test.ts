import { describe, expect, it } from "vitest";

import { visibleAdminLinks } from "./admin-links";

const links = [
  { href: "/admin" },
  { href: "/admin/pedidos" },
  { href: "/admin/usuarios" },
  { href: "/admin/armazenamento" },
];

describe("visibleAdminLinks", () => {
  it("mostra todas as rotas para o super admin", () => {
    expect(visibleAdminLinks(links, true).map((link) => link.href)).toEqual(
      links.map((link) => link.href)
    );
  });

  it("esconde usuários e armazenamento do admin comum", () => {
    expect(visibleAdminLinks(links, false).map((link) => link.href)).toEqual([
      "/admin",
      "/admin/pedidos",
    ]);
  });
});
