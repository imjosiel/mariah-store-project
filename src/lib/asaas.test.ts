import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AsaasError, createPixCharge } from "./asaas";

const resposta = (corpo: unknown) =>
  ({ ok: true, status: 200, json: async () => corpo }) as Response;

describe("cliente Asaas", () => {
  beforeEach(() => {
    process.env.ASAAS_API_KEY = "chave-de-teste";
    process.env.ASAAS_WALLET_ID = "wallet-dev-123";
    process.env.ASAAS_BASE_URL = "https://api-sandbox.asaas.com/v3";
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  it("cria cliente, cobrança Pix e QR Code com split em valor fixo", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(resposta({ id: "cus_1" }))
      .mockResolvedValueOnce(resposta({ id: "pay_1", value: 100, status: "PENDING" }))
      .mockResolvedValueOnce(resposta({ encodedImage: " base64 ", payload: "000201" }));

    const result = await createPixCharge({
      orderCode: "MS-1234",
      amountInCents: 10000,
      commissionInCents: 1500,
      customerName: "Ana Clara",
      customerCpfCnpj: "529.982.247-25",
    });

    expect(result.paymentId).toBe("pay_1");
    expect(result.qrCode.payload).toBe("000201");

    const [cliente, cobranca, qr] = fetchMock.mock.calls;
    expect(cliente[0]).toBe("https://api-sandbox.asaas.com/v3/customers");
    expect(JSON.parse(cliente[1]?.body as string)).toMatchObject({
      name: "Ana Clara",
      cpfCnpj: "52998224725",
    });

    const body = JSON.parse(cobranca[1]?.body as string);
    expect(body.billingType).toBe("PIX");
    expect(body.externalReference).toBe("MS-1234");
    expect(body.value).toBe(100);
    expect(body.split).toEqual([{ walletId: "wallet-dev-123", fixedValue: 15 }]);
    expect(qr[0]).toBe("https://api-sandbox.asaas.com/v3/payments/pay_1/pixQrCode");
  });

  it("exige CPF/CNPJ antes de chamar a API", async () => {
    await expect(
      createPixCharge({
        orderCode: "MS-1234",
        amountInCents: 10000,
        commissionInCents: 1000,
        customerName: "Ana",
        customerCpfCnpj: "   ",
      })
    ).rejects.toThrow(AsaasError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("traduz erros da API em mensagem legível", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ errors: [{ description: "CPF inválido" }] }),
    } as Response);

    await expect(
      createPixCharge({
        orderCode: "MS-1234",
        amountInCents: 10000,
        commissionInCents: 1000,
        customerName: "Ana",
        customerCpfCnpj: "52998224725",
      })
    ).rejects.toThrow("CPF inválido");
  });
});
