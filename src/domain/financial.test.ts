import { describe, expect, it } from "vitest";

import {
  summarizeFinancialEvents,
  type FinancialEventLike,
} from "./financial";

const event = (partial: Partial<FinancialEventLike> & Pick<FinancialEventLike, "type">): FinancialEventLike => ({
  amountInCents: 0,
  storeAmountInCents: null,
  feeInCents: 0,
  ...partial,
});

describe("summarizeFinancialEvents", () => {
  it("retorna zeros sem eventos", () => {
    expect(summarizeFinancialEvents([]).commissionNetInCents).toBe(0);
  });

  it("separa recebimento, comissão, taxas e parte da loja", () => {
    const result = summarizeFinancialEvents([
      event({ type: "PAYMENT_RECEIVED", amountInCents: 10000, storeAmountInCents: 9500, feeInCents: 250 }),
      event({ type: "COMMISSION_PAID", amountInCents: 500 }),
    ]);
    expect(result.receivedInCents).toBe(10000);
    expect(result.feesInCents).toBe(250);
    expect(result.commissionPaidInCents).toBe(500);
    expect(result.commissionNetInCents).toBe(500);
    expect(result.storeNetInCents).toBe(9500);
  });

  it("desconta estornos da comissão e da parte da loja", () => {
    const result = summarizeFinancialEvents([
      event({ type: "PAYMENT_RECEIVED", amountInCents: 10000, storeAmountInCents: 9500 }),
      event({ type: "COMMISSION_PAID", amountInCents: 500 }),
      event({ type: "COMMISSION_REFUNDED", amountInCents: 500 }),
      event({ type: "ORDER_REFUNDED", amountInCents: 10000 }),
    ]);
    expect(result.commissionNetInCents).toBe(0);
    expect(result.orderRefundedInCents).toBe(10000);
    expect(result.storeNetInCents).toBe(-500);
  });

  it("não considera eventos de outros tipos como comissão", () => {
    const result = summarizeFinancialEvents([
      event({ type: "ORDER_REFUNDED", amountInCents: 3000 }),
    ]);
    expect(result.commissionNetInCents).toBe(0);
  });
});
