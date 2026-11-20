import { describe, expect, it } from "vitest";

import { reaisToCents } from "./money";

describe("reaisToCents", () => {
  it("converte reais com vírgula para centavos", () => {
    expect(reaisToCents("175,00")).toBe(17500);
  });

  it("aceita prefixo R$ e espaços", () => {
    expect(reaisToCents("R$ 175,00")).toBe(17500);
  });

  it("aceita ponto decimal (input type=number)", () => {
    expect(reaisToCents("175.50")).toBe(17550);
  });

  it("trata ponto como milhar quando há vírgula decimal", () => {
    expect(reaisToCents("1.250,75")).toBe(125075);
  });

  it("arredonda para o centavo", () => {
    expect(reaisToCents("10,999")).toBe(1100);
  });

  it("rejeita vazio", () => {
    expect(reaisToCents("")).toBeNull();
    expect(reaisToCents("   ")).toBeNull();
  });

  it("rejeita valor inválido", () => {
    expect(reaisToCents("abc")).toBeNull();
  });

  it("rejeita negativo", () => {
    expect(reaisToCents("-10,00")).toBeNull();
  });
});
