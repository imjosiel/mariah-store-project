import { describe, expect, it } from "vitest";

import {
  allocateDiscount,
  discountAmount,
  effectiveUnitPrice,
} from "./discount";

describe("effectiveUnitPrice", () => {
  it("desconto em reais", () => {
    expect(effectiveUnitPrice(20000, "BRL", 1500)).toBe(18500);
  });

  it("desconto percentual em centésimos", () => {
    expect(effectiveUnitPrice(20000, "PCT", 1000)).toBe(18000);
    expect(effectiveUnitPrice(19999, "PCT", 1050)).toBe(17899);
  });

  it("nunca fica negativo e ignora valor inválido", () => {
    expect(effectiveUnitPrice(20000, "BRL", 99999)).toBe(0);
    expect(effectiveUnitPrice(20000, "PCT", 10000)).toBe(0);
    expect(effectiveUnitPrice(20000, "PCT", -1)).toBe(20000);
  });
});

describe("discountAmount", () => {
  it("reporta o valor descontado", () => {
    expect(discountAmount(20000, "BRL", 1500)).toBe(1500);
    expect(discountAmount(20000, "PCT", 1000)).toBe(2000);
  });
});

describe("allocateDiscount", () => {
  const items = [
    { key: "a", grossInCents: 10000 },
    { key: "b", grossInCents: 30000 },
  ];

  it("rateia proporcionalmente e preserva a soma", () => {
    const result = allocateDiscount(items, 4000);
    expect(result.get("a")).toBe(9000);
    expect(result.get("b")).toBe(27000);
    expect(result.get("a")! + result.get("b")!).toBe(36000);
  });

  it("sem desconto mantém os valores", () => {
    const result = allocateDiscount(items, 0);
    expect(result.get("a")).toBe(10000);
    expect(result.get("b")).toBe(30000);
  });

  it("limita o desconto ao total dos itens", () => {
    const result = allocateDiscount(items, 99999);
    expect(result.get("a")! + result.get("b")!).toBe(0);
  });
});
