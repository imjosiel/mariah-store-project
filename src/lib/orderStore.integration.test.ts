import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getCommissionSettings } from "./commissionSettings";
import {
  cancelOrderInDb,
  confirmOrderInDb,
  createPosOrder,
} from "./orderStore";
import { prisma } from "./prisma";

const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const slug = `temp-itest-${suffix}`;
const cliente = `Cliente Teste ${suffix}`;
const clientePdv = `Cliente PDV ${suffix}`;
const codigos: string[] = [];
let productId = "";
let variantId = "";

async function novoCodigo(): Promise<string> {
  for (let tentativa = 0; tentativa < 20; tentativa++) {
    const code = `MS-${Math.floor(1000 + Math.random() * 9000)}`;
    const existe = await prisma.order.findUnique({ where: { code }, select: { id: true } });
    if (!existe) {
      codigos.push(code);
      return code;
    }
  }
  throw new Error("Não foi possível gerar código de teste");
}

async function estoque(): Promise<number> {
  const row = await prisma.variantStock.findUnique({
    where: { variantId_sizeLabel: { variantId, sizeLabel: "M" } },
  });
  return row?.stock ?? -1;
}

async function pedidoOnline(quantidade: number): Promise<string> {
  const code = await novoCodigo();
  await prisma.order.create({
    data: {
      code,
      customerName: cliente,
      totalInCents: 20000 * quantidade,
      status: "SENT_TO_WHATSAPP",
      items: {
        create: [{
          productId,
          variantId,
          sizeLabel: "M",
          quantity: quantidade,
          productName: "Peça Teste",
          colorName: "Azul",
          unitPriceInCents: 20000,
          unitCostInCents: 10000,
        }],
      },
    },
  });
  return code;
}

beforeAll(async () => {
  // Remove resíduos de execuções anteriores que tenham falhado no meio do teste.
  // Pedidos primeiro: OrderItem referencia Product com RESTRICT.
  const antigos = await prisma.product.findMany({
    where: { slug: { startsWith: "temp-itest-" } },
    select: { id: true },
  });
  const idsAntigos = antigos.map((item) => item.id);
  if (idsAntigos.length) {
    const pedidos = await prisma.order.findMany({
      where: { items: { some: { productId: { in: idsAntigos } } } },
      select: { id: true },
    });
    await prisma.order.deleteMany({
      where: { id: { in: pedidos.map((item) => item.id) } },
    });
  }
  await prisma.product.deleteMany({ where: { id: { in: idsAntigos } } });

  const category = await prisma.category.findFirst({ orderBy: { sortOrder: "asc" } });
  if (!category) throw new Error("Sem categoria no banco");

  const product = await prisma.product.create({
    data: {
      slug,
      name: "Peça Teste Integração",
      subtitle: "",
      heroWord: "",
      description: "",
      fabricDetails: "",
      priceInCents: 20000,
      costInCents: 10000,
      categoryId: category.id,
      variants: {
        create: [{
          colorName: "Azul",
          colorSlug: "azul",
          swatchHex: "#0000ff",
          cutoutImageUrl: "",
          atmosphereBg: "#000000",
          atmosphereGlow: "#111111",
          atmosphereText: "#ffffff",
          stocks: { create: [{ sizeLabel: "M", stock: 10 }] },
        }],
      },
    },
    include: { variants: true },
  });
  productId = product.id;
  variantId = product.variants[0].id;
});

afterAll(async () => {
  await prisma.order.deleteMany({
    where: { customerName: { in: [cliente, clientePdv] } },
  });
  if (codigos.length) {
    await prisma.order.deleteMany({ where: { code: { in: codigos } } });
  }
  if (productId) await prisma.product.delete({ where: { id: productId } });
});

describe("fluxo de pedidos no banco", () => {
  it("confirma uma vez, baixa estoque e cria comissão com prazo configurado", async () => {
    const code = await pedidoOnline(2);
    const settings = await getCommissionSettings();

    await confirmOrderInDb(code);
    await confirmOrderInDb(code); // idempotente

    const order = await prisma.order.findUnique({ where: { code } });
    const comissaoEsperada = Math.round((20000 * settings.commissionBps) / 10_000);
    expect(order?.status).toBe("CONFIRMED");
    expect(order?.commissionInCents).toBe(comissaoEsperada);
    expect(await estoque()).toBe(8);

    const dias = settings.onlineGraceDays;
    const esperado = new Date((order?.confirmedAt ?? new Date()).getTime() + dias * 86_400_000);
    expect(order?.commissionAvailableAt?.toISOString()).toBe(esperado.toISOString());
  });

  it("cancela pedido confirmado, devolve estoque e reverte comissão", async () => {
    const inicio = await estoque();
    const code = await pedidoOnline(2);
    await confirmOrderInDb(code);
    await cancelOrderInDb(code, "cliente desistiu");
    await cancelOrderInDb(code, "segundo cancelamento");

    const order = await prisma.order.findUnique({ where: { code } });
    expect(order?.status).toBe("CANCELLED");
    expect(order?.commissionStatus).toBe("REVERSED");
    expect(order?.cancelReason).toBe("cliente desistiu");
    expect(order?.stockRestoredAt).not.toBeNull();
    expect(await estoque()).toBe(inicio);
  });

  it("não confirma pedido cancelado antes da confirmação", async () => {
    const inicio = await estoque();
    const code = await pedidoOnline(1);
    await cancelOrderInDb(code, "cancelado na hora");
    await confirmOrderInDb(code);

    const order = await prisma.order.findUnique({ where: { code } });
    expect(order?.status).toBe("CANCELLED");
    expect(order?.commissionStatus).toBe("REVERSED");
    expect(await estoque()).toBe(inicio);
  });

  it("PDV cria pedido com vários itens e desfaz tudo se faltar estoque", async () => {
    const inicio = await estoque();
    const antes = await prisma.order.count();

    const venda = await createPosOrder({
      items: [
        { variantId, sizeLabel: "M", quantity: 1, unitPriceInCents: 20000 },
        { variantId, sizeLabel: "M", quantity: 1, unitPriceInCents: 19000 },
      ],
      paymentMethod: "PIX",
      customerName: clientePdv,
    });
    codigos.push(venda.code);

    const order = await prisma.order.findUnique({
      where: { code: venda.code },
      include: { items: true, financialEvents: true },
    });
    expect(order?.status).toBe("CONFIRMED");
    expect(order?.channel).toBe("LOJA");
    expect(order?.items).toHaveLength(2);
    expect(order?.totalInCents).toBe(39000);
    expect(order?.financialEvents[0]?.type).toBe("PAYMENT_RECEIVED");
    expect(await estoque()).toBe(inicio - 2);

    await expect(
      createPosOrder({
        items: [{ variantId, sizeLabel: "M", quantity: 999, unitPriceInCents: 20000 }],
        paymentMethod: "PIX",
        customerName: clientePdv,
      })
    ).rejects.toThrow(/Estoque insuficiente/);

    expect(await prisma.order.count()).toBe(antes + 1);
    expect(await estoque()).toBe(inicio - 2);
  });
});
