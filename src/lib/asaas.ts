/**
 * Cliente mínimo da API do Asaas (v3).
 * Nunca loga credenciais. Sem env vars, as funções lançam erro claro e a
 * vitrine simplesmente não oferece o Pix via gateway.
 */

const DEFAULT_BASE_URL = "https://api-sandbox.asaas.com/v3";

export class AsaasError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "AsaasError";
  }
}

function config() {
  const apiKey = process.env.ASAAS_API_KEY?.trim();
  const walletId = process.env.ASAAS_WALLET_ID?.trim();
  if (!apiKey || !walletId) {
    throw new AsaasError("Gateway não configurado (ASAAS_API_KEY / ASAAS_WALLET_ID).");
  }
  return {
    apiKey,
    walletId,
    baseUrl: (process.env.ASAAS_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, ""),
  };
}

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const { apiKey, baseUrl } = config();
  let response: Response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        access_token: apiKey,
        ...init.headers,
      },
    });
  } catch {
    throw new AsaasError("Não foi possível contatar o gateway.");
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { errors?: Array<{ description?: string }>; message?: string }
      | null;
    const detail =
      body?.errors?.map((error) => error.description).filter(Boolean).join("; ") ||
      body?.message ||
      "Erro na cobrança.";
    throw new AsaasError(detail, response.status);
  }

  return (await response.json()) as T;
}

export interface CreatePixChargeInput {
  orderCode: string;
  amountInCents: number;
  commissionInCents: number;
  customerName: string;
  customerPhone?: string;
  description?: string;
}

interface AsaasCustomer {
  id: string;
}

interface AsaasPayment {
  id: string;
  status: string;
  value: number;
  netValue: number;
  externalReference?: string | null;
}

export interface PixQrCode {
  encodedImage: string;
  payload: string;
}

export async function createPixCharge(
  input: CreatePixChargeInput
): Promise<{ paymentId: string; qrCode: PixQrCode }> {
  const { walletId } = config();
  const phone = input.customerPhone?.replace(/\D/g, "") || undefined;

  const customer = await request<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: input.customerName.trim() || "Cliente Maria's Store",
      ...(phone ? { mobilePhone: phone, phone } : {}),
      notificationEnabled: false,
    }),
  });

  const payment = await request<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify({
      customer: customer.id,
      billingType: "PIX",
      value: input.amountInCents / 100,
      dueDate: new Date().toISOString().slice(0, 10),
      description: input.description || `Pedido ${input.orderCode}`,
      externalReference: input.orderCode,
      // Valor fixo em centavos convertidos para reais: a comissão não muda
      // com taxas nem com a forma de pagamento (docs/07).
      split: [
        {
          walletId,
          fixedValue: input.commissionInCents / 100,
        },
      ],
    }),
  });

  const qrCode = await getPixQrCode(payment.id);
  return { paymentId: payment.id, qrCode };
}

export async function getPixQrCode(paymentId: string): Promise<PixQrCode> {
  return request<PixQrCode>(`/payments/${paymentId}/pixQrCode`);
}

export async function refundPixCharge(
  paymentId: string,
  description: string
): Promise<void> {
  await request(`/payments/${paymentId}/refund`, {
    method: "POST",
    body: JSON.stringify({ description }),
  });
}
