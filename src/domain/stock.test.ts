import { describe, expect, it } from "vitest";

import {
  applyOrderToStock,
  buildInitialStock,
  liveStock,
  stockKey,
  type StockLine,
  type StockState,
} from "./stock";

function state(levels: Record<string, number> = {}): StockState {
  return { levels, deductedOrders: [] };
}

const linha = (quantity: number): StockLine => ({
  variantId: "var-a",
  sizeLabel: "P",
  quantity,
});

describe("stockKey", () => {
  it("monta chave estável por variação e tamanho", () => {
    expect(stockKey("var-a", "P")).toBe("var-a:P");
  });
});

describe("applyOrderToStock", () => {
  it("baixa o estoque da variação/tamanho", () => {
    const result = applyOrderToStock(state({ "var-a:P": 6 }), "MS-1", [linha(2)]);
    expect(result.state.levels["var-a:P"]).toBe(4);
    expect(result.shortfalls).toEqual([]);
  });

  it("nunca deixa estoque negativo e reporta a falta", () => {
    const result = applyOrderToStock(state({ "var-a:P": 1 }), "MS-1", [linha(3)]);
    expect(result.state.levels["var-a:P"]).toBe(0);
    expect(result.shortfalls).toEqual([
      { variantId: "var-a", sizeLabel: "P", missing: 2 },
    ]);
  });

  it("é idempotente para o mesmo pedido", () => {
    const first = applyOrderToStock(state({ "var-a:P": 6 }), "MS-1", [linha(2)]);
    const second = applyOrderToStock(first.state, "MS-1", [linha(2)]);

    expect(second.state).toBe(first.state);
    expect(second.state.levels["var-a:P"]).toBe(4);
  });

  it("pedidos diferentes baixam estoque acumulado", () => {
    const first = applyOrderToStock(state({ "var-a:P": 6 }), "MS-1", [linha(2)]);
    const second = applyOrderToStock(first.state, "MS-2", [linha(1)]);
    expect(second.state.levels["var-a:P"]).toBe(3);
  });

  it("trata várias linhas e tamanhos diferentes", () => {
    const result = applyOrderToStock(
      state({ "var-a:P": 5, "var-a:M": 4 }),
      "MS-1",
      [linha(2), { variantId: "var-a", sizeLabel: "M", quantity: 3 }]
    );
    expect(result.state.levels).toEqual({ "var-a:P": 3, "var-a:M": 1 });
  });

  it("linha sem estoque cadastrado gera falta total", () => {
    const result = applyOrderToStock(state(), "MS-1", [linha(2)]);
    expect(result.shortfalls).toEqual([
      { variantId: "var-a", sizeLabel: "P", missing: 2 },
    ]);
  });
});

describe("liveStock", () => {
  it("usa o nível dinâmico quando existe", () => {
    expect(liveStock({ "var-a:P": 0 }, "var-a", "P", 5)).toBe(0);
  });

  it("cai para o estoque do catálogo quando a chave não existe", () => {
    expect(liveStock({}, "var-a", "P", 5)).toBe(5);
  });
});

describe("buildInitialStock", () => {
  it("cria o mapa a partir das variações do catálogo", () => {
    const result = buildInitialStock([
      {
        id: "var-a",
        stocks: [
          { sizeLabel: "P", stock: 5 },
          { sizeLabel: "M", stock: 0 },
        ],
      },
    ]);
    expect(result).toEqual({ "var-a:P": 5, "var-a:M": 0 });
  });
});
