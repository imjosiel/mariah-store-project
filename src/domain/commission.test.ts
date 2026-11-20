import { describe, expect, it } from "vitest";

import {
  DEFAULT_COMMISSION_BPS,
  advanceCommission,
  calculateCartCommission,
  calculateCommission,
  commissionAvailableAt,
  confirmOrder,
  markCommissionPaid,
  type CommissionableOrder,
} from "./commission";

function makeOrder(overrides: Partial<CommissionableOrder> = {}): CommissionableOrder {
  return {
    confirmedAt: null,
    commissionInCents: 0,
    commissionStatus: "PENDING",
    commissionAvailableAt: null,
    totalInCents: 10_000,
    ...overrides,
  };
}

describe("calculateCommission", () => {
  it("10% da margem: custo 5000, preço 10000 → 500", () => {
    expect(calculateCommission({ costInCents: 5000, receivedInCents: 10_000 })).toBe(500);
  });

  it("desconto reduz a margem: custo 5000, preço 9000 → 400", () => {
    expect(calculateCommission({ costInCents: 5000, receivedInCents: 9000 })).toBe(400);
  });

  it("margem negativa não gera comissão negativa", () => {
    expect(calculateCommission({ costInCents: 6000, receivedInCents: 5000 })).toBe(0);
  });

  it("margem zero gera comissão zero", () => {
    expect(calculateCommission({ costInCents: 5000, receivedInCents: 5000 })).toBe(0);
  });

  it("arredonda em centavos: custo 3333, preço 10000 → 667", () => {
    expect(calculateCommission({ costInCents: 3333, receivedInCents: 10_000 })).toBe(667);
  });

  it("frete não entra na base", () => {
    expect(
      calculateCommission({
        costInCents: 5000,
        receivedInCents: 10_000,
        shippingInCents: 2000,
      })
    ).toBe(500);
  });

  it("respeita uma alíquota diferente", () => {
    expect(
      calculateCommission({ costInCents: 5000, receivedInCents: 10_000, commissionBps: 500 })
    ).toBe(250);
  });
});

describe("commissionAvailableAt", () => {
  it("é confirmedAt + 7 dias", () => {
    const confirmed = new Date("2026-11-19T12:00:00.000Z");
    expect(commissionAvailableAt(confirmed).toISOString()).toBe(
      "2026-11-26T12:00:00.000Z"
    );
  });
});

describe("confirmOrder", () => {
  const confirmedAt = new Date("2026-11-19T12:00:00.000Z");

  it("cria comissão PENDING com availableAt de 7 dias", () => {
    const result = confirmOrder(makeOrder(), { confirmedAt, costInCents: 5000 });

    expect(result.confirmedAt).toEqual(confirmedAt);
    expect(result.commissionInCents).toBe(500);
    expect(result.commissionStatus).toBe("PENDING");
    expect(result.commissionAvailableAt?.toISOString()).toBe("2026-11-26T12:00:00.000Z");
  });

  it("usa o total do pedido quando receivedInCents não é informado", () => {
    const result = confirmOrder(makeOrder({ totalInCents: 30_000 }), {
      confirmedAt,
      costInCents: 12_000,
    });
    expect(result.commissionInCents).toBe(1800);
  });

  it("duas confirmações não duplicam comissão", () => {
    const once = confirmOrder(makeOrder(), { confirmedAt, costInCents: 5000 });
    const twice = confirmOrder(once, {
      confirmedAt: new Date("2026-11-20T12:00:00.000Z"),
      costInCents: 5000,
    });

    expect(twice).toBe(once);
    expect(twice.commissionInCents).toBe(500);
  });
});

describe("advanceCommission", () => {
  const confirmedAt = new Date("2026-11-19T12:00:00.000Z");
  const pending = confirmOrder(makeOrder(), { confirmedAt, costInCents: 5000 });

  it("mantém PENDING antes dos 7 dias", () => {
    const result = advanceCommission(pending, {
      now: new Date("2026-11-25T23:59:59.000Z"),
    });
    expect(result.commissionStatus).toBe("PENDING");
  });

  it("libera para PAYABLE aos 7 dias", () => {
    const result = advanceCommission(pending, {
      now: new Date("2026-11-26T12:00:00.000Z"),
    });
    expect(result.commissionStatus).toBe("PAYABLE");
  });

  it("cancelamento dentro do prazo reverte a comissão", () => {
    const result = advanceCommission(pending, {
      now: new Date("2026-11-20T12:00:00.000Z"),
      cancelled: true,
    });
    expect(result.commissionStatus).toBe("REVERSED");
  });

  it("cancelamento depois do prazo também reverte (regra simplificada)", () => {
    const payable = advanceCommission(pending, {
      now: new Date("2026-11-27T12:00:00.000Z"),
    });
    const result = advanceCommission(payable, {
      now: new Date("2026-11-28T12:00:00.000Z"),
      cancelled: true,
    });
    expect(result.commissionStatus).toBe("REVERSED");
  });

  it("não altera um pedido já PAGO", () => {
    const payable = advanceCommission(pending, {
      now: new Date("2026-11-27T12:00:00.000Z"),
    });
    const paid = markCommissionPaid(payable);
    const result = advanceCommission(paid, {
      now: new Date("2026-11-28T12:00:00.000Z"),
    });
    expect(result.commissionStatus).toBe("PAID");
  });
});

describe("markCommissionPaid", () => {
  it("só paga o que está PAYABLE", () => {
    const pending = confirmOrder(makeOrder(), {
      confirmedAt: new Date("2026-11-19T12:00:00.000Z"),
      costInCents: 5000,
    });
    expect(markCommissionPaid(pending).commissionStatus).toBe("PENDING");
  });
});

describe("calculateCartCommission", () => {
  it("soma margem e comissão de vários itens", () => {
    const result = calculateCartCommission([
      { unitPriceInCents: 10_000, unitCostInCents: 5000, quantity: 2 },
      { unitPriceInCents: 20_000, unitCostInCents: 12_000, quantity: 1 },
    ]);

    expect(result.totalInCents).toBe(40_000);
    expect(result.costInCents).toBe(22_000);
    expect(result.marginInCents).toBe(18_000);
    expect(result.commissionInCents).toBe(1800);
  });

  it("sacola vazia gera zeros", () => {
    expect(calculateCartCommission([])).toEqual({
      totalInCents: 0,
      costInCents: 0,
      marginInCents: 0,
      commissionInCents: 0,
    });
  });
});

describe("alíquota padrão", () => {
  it("é 1000 bps (10%)", () => {
    expect(DEFAULT_COMMISSION_BPS).toBe(1000);
  });
});
