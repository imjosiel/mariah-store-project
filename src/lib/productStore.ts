import { PRODUCTS } from "@/data/catalog";

import { prisma } from "./prisma";

/**
 * Custos no Postgres (Fase 2). O catálogo define nome/preço/imagem;
 * o custo editável mora em Product.costInCents.
 */

export async function getProductCosts(): Promise<Record<string, number>> {
  const rows = await prisma.product.findMany({
    select: { slug: true, costInCents: true },
  });
  return Object.fromEntries(rows.map((row) => [row.slug, row.costInCents]));
}

/** slug do catálogo → id do banco (para salvar pelo slug vindo do formulário). */
async function slugToId(): Promise<Record<string, string>> {
  const rows = await prisma.product.findMany({
    select: { id: true, slug: true },
  });
  return Object.fromEntries(rows.map((row) => [row.slug, row.id]));
}

export async function saveProductCosts(costs: Record<string, number>): Promise<void> {
  const ids = await slugToId();
  const entries = Object.entries(costs).filter(([slug, value]) =>
    ids[slug] && Number.isFinite(value) && value >= 0
  );

  await prisma.$transaction(
    entries.map(([slug, value]) =>
      prisma.product.update({
        where: { id: ids[slug] },
        data: { costInCents: value },
      })
    )
  );
}

export async function resetProductCosts(): Promise<void> {
  const ids = await slugToId();
  await prisma.$transaction(
    PRODUCTS.map((product) =>
      prisma.product.update({
        where: { id: ids[product.slug] },
        data: { costInCents: product.costInCents },
      })
    )
  );
}
