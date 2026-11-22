import type { Prisma } from "@prisma/client";

import { prisma } from "./prisma";

/**
 * Dados editáveis dos produtos no Postgres (Fase 2).
 * O catálogo define nome/imagem/categorias; preço, custo e estoque são
 * operacionais e vivem no banco.
 */

export interface AdminProductRow {
  slug: string;
  name: string;
  archived: boolean;
  categoryName: string;
  imageUrl: string;
  priceInCents: number;
  costInCents: number;
  variants: Array<{
    id: string;
    colorSlug: string;
    colorName: string;
    swatchHex: string;
    imageUrl: string;
    stocks: Array<{ sizeLabel: string; stock: number }>;
  }>;
}

export interface ProductUpdate {
  slug: string;
  priceInCents: number;
  costInCents: number;
  stocks: Array<{ colorSlug: string; sizeLabel: string; stock: number }>;
}

export async function getAdminProducts(options?: {
  includeArchived?: boolean;
}): Promise<AdminProductRow[]> {
  const rows = await prisma.product.findMany({
    where: options?.includeArchived ? undefined : { archivedAt: null },
    include: {
      category: { select: { name: true } },
      variants: {
        include: { stocks: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    archived: row.archivedAt !== null,
    categoryName: row.category.name,
    imageUrl: row.variants[0]?.cutoutImageUrl ?? "",
    priceInCents: row.priceInCents,
    costInCents: row.costInCents,
    variants: row.variants.map((variant) => ({
      id: variant.id,
      colorSlug: variant.colorSlug,
      colorName: variant.colorName,
      swatchHex: variant.swatchHex,
      imageUrl: variant.cutoutImageUrl,
      stocks: variant.stocks
        .map((stock) => ({ sizeLabel: stock.sizeLabel, stock: stock.stock }))
        .sort((a, b) => a.sizeLabel.localeCompare(b.sizeLabel)),
    })),
  }));
}

export async function getProductCosts(): Promise<Record<string, number>> {
  const rows = await prisma.product.findMany({
    select: { slug: true, costInCents: true },
  });
  return Object.fromEntries(rows.map((row) => [row.slug, row.costInCents]));
}

export async function saveProducts(updates: readonly ProductUpdate[]): Promise<void> {
  const products = await prisma.product.findMany({
    select: { id: true, slug: true },
  });
  const idBySlug = new Map(products.map((product) => [product.slug, product.id]));

  const operations: Prisma.PrismaPromise<unknown>[] = [];
  for (const update of updates) {
    const id = idBySlug.get(update.slug);
    if (!id) continue;

    operations.push(
      prisma.product.update({
        where: { id },
        data: { priceInCents: update.priceInCents, costInCents: update.costInCents },
      })
    );

    for (const stock of update.stocks) {
      const variant = await prisma.productVariant.findFirst({
        where: { productId: id, colorSlug: stock.colorSlug },
        select: { id: true },
      });
      if (!variant) continue;
      operations.push(
        prisma.variantStock.updateMany({
          where: { variantId: variant.id, sizeLabel: stock.sizeLabel },
          data: { stock: stock.stock },
        })
      );
    }
  }

  await prisma.$transaction(operations);
}

export interface NewProductInput {
  slug: string;
  name: string;
  subtitle: string;
  heroWord: string;
  description: string;
  fabricDetails: string;
  careInstructions?: string;
  priceInCents: number;
  costInCents: number;
  categorySlug: string;
  featuredInHero: boolean;
  variant: {
    colorName: string;
    colorSlug: string;
    swatchHex: string;
    cutoutImageUrl: string;
    atmosphereBg: string;
    atmosphereGlow: string;
    atmosphereText: string;
    isLightTheme: boolean;
    stocks: Array<{ sizeLabel: string; stock: number }>;
  };
}

export async function createProduct(input: NewProductInput): Promise<void> {
  const category = await prisma.category.findUnique({
    where: { slug: input.categorySlug },
    select: { id: true },
  });
  if (!category) throw new Error("Categoria não encontrada");

  const existing = await prisma.product.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (existing) throw new Error("Já existe uma peça com esse slug");

  await prisma.product.create({
    data: {
      slug: input.slug,
      name: input.name,
      subtitle: input.subtitle,
      heroWord: input.heroWord,
      description: input.description,
      fabricDetails: input.fabricDetails,
      careInstructions: input.careInstructions,
      priceInCents: input.priceInCents,
      costInCents: input.costInCents,
      categoryId: category.id,
      featuredInHero: input.featuredInHero,
      variants: {
        create: {
          colorName: input.variant.colorName,
          colorSlug: input.variant.colorSlug,
          swatchHex: input.variant.swatchHex,
          cutoutImageUrl: input.variant.cutoutImageUrl,
          atmosphereBg: input.variant.atmosphereBg,
          atmosphereGlow: input.variant.atmosphereGlow,
          atmosphereText: input.variant.atmosphereText,
          isLightTheme: input.variant.isLightTheme,
          stocks: {
            create: input.variant.stocks.map((stock) => ({
              sizeLabel: stock.sizeLabel,
              stock: stock.stock,
            })),
          },
        },
      },
    },
  });
}

export interface NewVariantInput {
  productSlug: string;
  colorName: string;
  colorSlug: string;
  swatchHex: string;
  cutoutImageUrl: string;
  atmosphereBg: string;
  atmosphereGlow: string;
  atmosphereText: string;
  isLightTheme: boolean;
  stocks: Array<{ sizeLabel: string; stock: number }>;
}

export async function addVariant(input: NewVariantInput): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { slug: input.productSlug },
    select: { id: true },
  });
  if (!product) throw new Error("Peça não encontrada");

  const duplicate = await prisma.productVariant.findUnique({
    where: {
      productId_colorSlug: {
        productId: product.id,
        colorSlug: input.colorSlug,
      },
    },
    select: { id: true },
  });
  if (duplicate) throw new Error("Essa cor já existe nesta peça");

  const total = await prisma.productVariant.count({
    where: { productId: product.id },
  });

  await prisma.productVariant.create({
    data: {
      productId: product.id,
      colorName: input.colorName,
      colorSlug: input.colorSlug,
      swatchHex: input.swatchHex,
      cutoutImageUrl: input.cutoutImageUrl,
      atmosphereBg: input.atmosphereBg,
      atmosphereGlow: input.atmosphereGlow,
      atmosphereText: input.atmosphereText,
      isLightTheme: input.isLightTheme,
      sortOrder: total,
      stocks: {
        create: input.stocks.map((stock) => ({
          sizeLabel: stock.sizeLabel,
          stock: stock.stock,
        })),
      },
    },
  });
}

export async function setVariantImage(
  productSlug: string,
  colorSlug: string,
  imageUrl: string
): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
    select: { id: true },
  });
  if (!product) throw new Error("Peça não encontrada");

  const result = await prisma.productVariant.updateMany({
    where: { productId: product.id, colorSlug },
    data: { cutoutImageUrl: imageUrl },
  });
  if (result.count === 0) throw new Error("Cor não encontrada nesta peça");
}

export type SizeSystem =
  | "numbers"
  | "numbers-plus"
  | "letters"
  | "letters-plus"
  | "unique"
  | "custom";

export const SIZE_LABELS: Record<Exclude<SizeSystem, "custom">, string[]> = {
  numbers: ["36", "38", "40", "42"],
  "numbers-plus": ["34", "36", "38", "40", "42", "44"],
  letters: ["PP", "P", "M", "G"],
  "letters-plus": ["PP", "P", "M", "G", "GG", "EGG"],
  unique: ["Único"],
};

/** Ordem canônica para ordenar rótulos antes de remapear o estoque. */
const SIZE_RANK: Record<string, number> = {
  PP: 1,
  P: 2,
  M: 3,
  G: 4,
  GG: 5,
  EGG: 6,
  Único: 1,
  "34": 1,
  "36": 2,
  "37": 3,
  "38": 4,
  "40": 5,
  "42": 6,
  "44": 7,
};

function rank(label: string): number {
  return SIZE_RANK[label.toUpperCase()] ?? SIZE_RANK[label] ?? 999;
}

function sortLabels(labels: readonly string[]): string[] {
  return [...labels].sort((a, b) => rank(a) - rank(b));
}

export function detectSizeSystem(labels: readonly string[]): SizeSystem {
  if (labels.includes("Único")) return "unique";
  const normalized = sortLabels(labels);
  const exact = (Object.entries(SIZE_LABELS) as Array<
    [Exclude<SizeSystem, "custom">, string[]]
  >).find(([, value]) => value.join("|") === normalized.join("|"));
  if (exact) return exact[0];
  return "custom";
}

export interface SizeChange {
  variantId: string;
  labels: string[];
}

/**
 * Troca os rótulos de tamanho preservando o estoque por posição canônica.
 * Serve tanto para presets quanto para edição livre (ex.: corrigir 38→37).
 * Pedidos antigos não são alterados: OrderItem guarda o sizeLabel original.
 */
export async function setProductSizes(
  productSlug: string,
  changes: readonly SizeChange[]
): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
    select: { id: true },
  });
  if (!product) throw new Error("Peça não encontrada");

  await prisma.$transaction(async (tx) => {
    for (const change of changes) {
      const variant = await tx.productVariant.findFirst({
        where: { id: change.variantId, productId: product.id },
        select: { id: true },
      });
      if (!variant) continue;

      const labels = change.labels.map((label) => label.trim()).filter(Boolean);
      if (labels.length === 0 || new Set(labels).size !== labels.length) {
        throw new Error("Tamanhos inválidos ou repetidos.");
      }

      const existing = await tx.variantStock.findMany({
        where: { variantId: variant.id },
      });
      const byLabel = new Map(existing.map((stock) => [stock.sizeLabel, stock.stock]));
      const sorted = [...existing].sort(
        (a, b) => rank(a.sizeLabel) - rank(b.sizeLabel)
      );
      const positional = sorted.map((stock) => stock.stock);

      // Rótulos mantidos preservam seu estoque; rótulos novos (ou renomeados,
      // como 38→37) herdão a quantidade da mesma posição. Isso cobre tanto
      // corrigir um digitação quanto adicionar um tamanho que faltava.
      const resolved = labels.map((label, index) => ({
        label,
        stock: byLabel.has(label) ? byLabel.get(label)! : (positional[index] ?? 0),
      }));

      await tx.variantStock.deleteMany({ where: { variantId: variant.id } });
      await tx.variantStock.createMany({
        data: resolved.map((item) => ({
          variantId: variant.id,
          sizeLabel: item.label,
          stock: item.stock,
        })),
      });
    }
  });
}

/** Substitui os tamanhos de UMA variação pelos rótulos e quantidades exatos informados. */
export async function replaceVariantSizes(
  productSlug: string,
  variantId: string,
  sizes: readonly { label: string; stock: number }[]
): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
    select: { id: true },
  });
  if (!product) throw new Error("Peça não encontrada");

  const variant = await prisma.productVariant.findFirst({
    where: { id: variantId, productId: product.id },
    select: { id: true },
  });
  if (!variant) throw new Error("Cor não encontrada nesta peça");

  const labels = sizes.map((size) => size.label.trim()).filter(Boolean);
  if (labels.length === 0 || new Set(labels).size !== labels.length) {
    throw new Error("Tamanhos inválidos ou repetidos.");
  }
  if (sizes.some((size) => !Number.isInteger(size.stock) || size.stock < 0)) {
    throw new Error("Quantidade inválida.");
  }

  await prisma.$transaction([
    prisma.variantStock.deleteMany({ where: { variantId } }),
    prisma.variantStock.createMany({
      data: sizes.map((size) => ({
        variantId,
        sizeLabel: size.label.trim(),
        stock: size.stock,
      })),
    }),
  ]);
}

export async function setProductSizeSystem(
  productSlug: string,
  system: Exclude<SizeSystem, "custom">
): Promise<void> {
  const product = await prisma.product.findUnique({
    where: { slug: productSlug },
    select: { id: true },
  });
  if (!product) throw new Error("Peça não encontrada");

  const variants = await prisma.productVariant.findMany({
    where: { productId: product.id },
    select: { id: true, stocks: { select: { sizeLabel: true } } },
  });

  await setProductSizes(
    productSlug,
    variants.map((variant) => ({
      variantId: variant.id,
      labels: SIZE_LABELS[system],
    }))
  );
}

