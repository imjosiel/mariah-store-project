import { describe, expect, it } from "vitest";

import { ordersToCsv, type ReportOrder } from "./report";

function order(overrides: Partial<ReportOrder> = {}): ReportOrder {
  return {
    code: "MS-4821",
    createdAt: "2026-11-19T12:00:00.000Z",
    customerName: "Ana Clara",
    totalInCents: 34_900,
    costInCents: 15_000,
    marginInCents: 19_900,
    commissionInCents: 1_990,
    commissionStatus: "PENDING",
    orderStatus: "CONFIRMED",
    nfNumber: "",
    itemsLabel: "1x Jaqueta Puffer Serena · Vinho Rosé · Tam. PP",
    ...overrides,
  };
}

describe("ordersToCsv", () => {
  it("gera cabeçalho + uma linha por pedido", () => {
    const csv = ordersToCsv([order(), order({ code: "MS-4822" })]);
    const lines = csv.trim().split(/\r?\n/);

    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain("Codigo");
    expect(lines[1]).toContain("MS-4821");
    expect(lines[2]).toContain("MS-4822");
  });

  it("usa ponto e vírgula e vírgula decimal (Excel pt-BR)", () => {
    const line = ordersToCsv([order()]).split(/\r?\n/)[1];
    expect(line).toContain("349,00");
    expect(line).toContain("150,00");
    expect(line).toContain("199,00");
    expect(line).toContain("19,90");
  });

  it("escapa aspas e ponto e vírgula dentro dos campos", () => {
    const line = ordersToCsv([
      order({ customerName: 'Ana " Clara; Loja', nfNumber: "123;ABC" }),
    ]).split(/\r?\n/)[1];

    expect(line).toContain('"Ana "" Clara; Loja"');
    expect(line).toContain('"123;ABC"');
  });

  it("inclui a nota fiscal quando preenchida", () => {
    const line = ordersToCsv([order({ nfNumber: "NFe 998" })]).split(/\r?\n/)[1];
    expect(line).toContain("NFe 998");
  });

  it("pedido sem nota fiscal gera campo vazio", () => {
    const line = ordersToCsv([order()]).split(/\r?\n/)[1];
    const columns = line.split(";");
    expect(columns.some((column) => column === "")).toBe(true);
  });
});
