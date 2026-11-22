import { describe, expect, it } from "vitest";

import {
  canCancelOrder,
  canConfirmOrder,
  canDeliverOrder,
  canShipOrder,
  shouldRestoreStock,
  type FulfillmentOrder,
  type FulfillmentStatus,
} from "./order-status";

const order = (
  status: FulfillmentStatus,
  overrides: Partial<FulfillmentOrder> = {}
): FulfillmentOrder => ({
  status,
  confirmedAt: null,
  stockRestoredAt: null,
  ...overrides,
});

describe("máquina de estados do pedido", () => {
  it("confirma somente pedidos ainda não confirmados e não cancelados", () => {
    expect(canConfirmOrder(order("SENT_TO_WHATSAPP"))).toBe(true);
    expect(canConfirmOrder(order("CANCELLED"))).toBe(false);
    expect(
      canConfirmOrder(order("CONFIRMED", { confirmedAt: new Date() }))
    ).toBe(false);
  });

  it("só envia depois de confirmado e só entrega depois de enviado", () => {
    expect(canShipOrder(order("CONFIRMED", { confirmedAt: new Date() }))).toBe(true);
    expect(canShipOrder(order("SENT_TO_WHATSAPP"))).toBe(false);
    expect(canDeliverOrder(order("SHIPPED", { confirmedAt: new Date() }))).toBe(true);
    expect(canDeliverOrder(order("CONFIRMED", { confirmedAt: new Date() }))).toBe(false);
  });

  it("não cancela pedido entregue ou já cancelado", () => {
    expect(canCancelOrder(order("SHIPPED", { confirmedAt: new Date() }))).toBe(true);
    expect(canCancelOrder(order("DELIVERED", { confirmedAt: new Date() }))).toBe(false);
    expect(canCancelOrder(order("CANCELLED"))).toBe(false);
  });

  it("estorna estoque uma única vez e só de pedido confirmado", () => {
    expect(shouldRestoreStock(order("SENT_TO_WHATSAPP"))).toBe(false);
    expect(shouldRestoreStock(order("CONFIRMED", { confirmedAt: new Date() }))).toBe(true);
    expect(
      shouldRestoreStock(
        order("CANCELLED", { confirmedAt: new Date(), stockRestoredAt: new Date() })
      )
    ).toBe(false);
  });
});
