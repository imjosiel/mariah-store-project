import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  handleAsaasWebhook,
  tokenAsaasValido,
  type AsaasWebhook,
} from "../../../../lib/asaas-webhook";

const registerFinancialEvent = vi.fn();
const setGatewayPayment = vi.fn();
const deps = { registerFinancialEvent, setGatewayPayment };

const splitPago: AsaasWebhook = {
  id: "evt_split_1",
  event: "PAYMENT_SPLIT_DONE",
  payment: {
    id: "pay_1",
    value: 100,
    externalReference: "MS-1234",
    split: [
      { id: "split_dev", walletId: "wallet-dev", fixedValue: 15, status: "DONE" },
    ],
  },
  additionalInfo: { splitId: "split_dev" },
};

describe("token do webhook", () => {
  it("valida o header contra a env var", () => {
    expect(tokenAsaasValido("token-x", "token-x")).toBe(true);
    expect(tokenAsaasValido("errado", "token-x")).toBe(false);
    expect(tokenAsaasValido("token-x", undefined)).toBe(false);
    expect(tokenAsaasValido(null, "token-x")).toBe(false);
  });
});

describe("tradução dos eventos do Asaas", () => {
  beforeEach(() => {
    registerFinancialEvent.mockClear();
    setGatewayPayment.mockClear();
  });

  it("registra split pago com externalId estável (idempotência)", async () => {
    await handleAsaasWebhook(splitPago, deps);
    await handleAsaasWebhook(splitPago, deps); // reentrega do mesmo evento

    expect(registerFinancialEvent).toHaveBeenCalledTimes(2);
    const chamadas = registerFinancialEvent.mock.calls.map((args) => args[0]);
    expect(new Set(chamadas.map((item) => item.externalId)).size).toBe(1);
    expect(chamadas[0]).toMatchObject({
      orderCode: "MS-1234",
      type: "COMMISSION_PAID",
      amountInCents: 1500,
      externalId: "asaas-split-split_dev",
    });
    expect(setGatewayPayment).toHaveBeenCalledWith("MS-1234", "pay_1");
  });

  it("registra recebimento usando o valor líquido", async () => {
    await handleAsaasWebhook(
      {
        id: "evt_received_1",
        event: "PAYMENT_RECEIVED",
        payment: { id: "pay_1", value: 100, netValue: 98, externalReference: "MS-1234" },
      },
      deps
    );

    expect(registerFinancialEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: "PAYMENT_RECEIVED", amountInCents: 9800 })
    );
  });

  it("registra estorno da venda e do split", async () => {
    await handleAsaasWebhook(
      {
        id: "evt_refund_1",
        event: "PAYMENT_REFUNDED",
        payment: {
          id: "pay_1",
          value: 100,
          externalReference: "MS-1234",
          refunds: [
            {
              value: 100,
              status: "DONE",
              refundedSplits: [{ id: "split_dev", value: 15, done: true }],
            },
          ],
        },
      },
      deps
    );

    const tipos = registerFinancialEvent.mock.calls.map((args) => args[0].type);
    expect(tipos).toEqual(["ORDER_REFUNDED", "COMMISSION_REFUNDED"]);
  });

  it("ignora estorno pendente e eventos sem pedido interno", async () => {
    await handleAsaasWebhook(
      {
        id: "evt_refund_pendente",
        event: "PAYMENT_REFUNDED",
        payment: {
          id: "pay_1",
          value: 100,
          externalReference: "MS-9999",
          refunds: [{ value: 100, status: "PENDING", refundedSplits: [] }],
        },
      },
      deps
    );
    expect(registerFinancialEvent).not.toHaveBeenCalled();

    setGatewayPayment.mockClear();
    await handleAsaasWebhook({ id: "evt_sem_pedido", event: "PAYMENT_RECEIVED" }, deps);
    expect(setGatewayPayment).not.toHaveBeenCalled();
  });
});
