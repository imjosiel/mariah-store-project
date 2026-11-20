import { describe, expect, it } from "vitest";

import {
  canAccessAdmin,
  canManageAdmins,
  parseAdminEmails,
} from "./admin-access";

describe("parseAdminEmails", () => {
  it("normaliza lista com espaços e caixa misturada", () => {
    expect(parseAdminEmails(" Ana@Gmail.com , , B@Gmail.com ")).toEqual([
      "ana@gmail.com",
      "b@gmail.com",
    ]);
  });

  it("lista vazia gera array vazio", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("   ")).toEqual([]);
  });
});

describe("canAccessAdmin", () => {
  const allowlist = ["ana@gmail.com", "b@gmail.com"];

  it("permite e-mail da lista, ignorando caixa", () => {
    expect(canAccessAdmin("ANA@Gmail.com", allowlist)).toBe(true);
  });

  it("nega e-mail fora da lista", () => {
    expect(canAccessAdmin("outro@gmail.com", allowlist)).toBe(false);
  });

  it("nega quando não há sessão", () => {
    expect(canAccessAdmin(null, allowlist)).toBe(false);
    expect(canAccessAdmin(undefined, allowlist)).toBe(false);
  });

  it("falha fechado quando a lista está vazia", () => {
    expect(canAccessAdmin("ana@gmail.com", [])).toBe(false);
  });
});

describe("canManageAdmins", () => {
  it("só o super admin pode gerenciar", () => {
    expect(canManageAdmins("dono@gmail.com", "dono@gmail.com")).toBe(true);
    expect(canManageAdmins("DONO@gmail.com", "dono@gmail.com")).toBe(true);
    expect(canManageAdmins("outro@gmail.com", "dono@gmail.com")).toBe(false);
    expect(canManageAdmins(null, "dono@gmail.com")).toBe(false);
  });

  it("sem super admin configurado, ninguém gerencia", () => {
    expect(canManageAdmins("dono@gmail.com", undefined)).toBe(false);
  });
});
