import type { Prisma } from "@prisma/client";

import { PRODUCTS } from "@/data/catalog";

import { prisma } from "./prisma";

/**
 * Dados editáveis dos produtos no Postgres (Fase 2).
 * O catálogo define nome/imagem/categorias; preço, custo e estoque são
 * operacionais e vivem no banco.
 */

export interface AdminProductRow {
  slug: string;
  name: string;
  categoryName: string;
  imageUrl: string;
  priceInCents: number;
  costInCents: number;
  variants: Array<{
    colorSlug: string;
    colorName: string;
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

export async function getAdminProducts(): Promise<AdminProductRow[]> {
  const rows = await prisma.product.findMany({
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
    categoryName: row.category.name,
    imageUrl: row.variants[0]?.cutoutImageUrl ?? "",
    priceInCents: row.priceInCents,
    costInCents: row.costInCents,
    variants: row.variants.map((variant) => ({
      colorSlug: variant.colorSlug,
      colorName: variant.colorName,
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

export async function resetProducts(): Promise<void> {
  const updates: ProductUpdate[] = PRODUCTS.map((product) => ({
    slug: product.slug,
    priceInCents: product.priceInCents,
    costInCents: product.costInCents,
    stocks: product.variants.flatMap((variant) =>
      variant.stocks.map((stock) => ({
        colorSlug: variant.colorSlug,
        sizeLabel: stock.sizeLabel,
        stock: stock.stock,
      }))
    ),
  }));
  await saveProducts(updates);
}
