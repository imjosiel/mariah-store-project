import type { Category, CategorySlug, Product, ProductVariant } from "@/types/store";

import { prisma } from "./prisma";

export async function getCategoriesFromDb(): Promise<Category[]> {
  const rows = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true },
  });

  return [
    { id: "cat-all", slug: "todas" as CategorySlug, name: "Todas as Peças" },
    ...rows.map((row) => ({
      id: row.id,
      slug: row.slug as CategorySlug,
      name: row.name,
    })),
  ];
}

/** Catálogo vindo do Postgres — única fonte da verdade. */

export async function getProductsFromDb(): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    where: { archivedAt: null },
    include: {
      category: true,
      variants: { include: { stocks: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ featuredInHero: "desc" }, { heroSortOrder: "asc" }, { name: "asc" }],
  });

  return rows.map((row) => {
    const variants: ProductVariant[] = row.variants.map((variant) => {
      return {
        id: variant.id,
        colorName: variant.colorName,
        colorSlug: variant.colorSlug,
        swatchHex: variant.swatchHex,
        cutoutImageUrl: variant.cutoutImageUrl,
        atmosphereBg: variant.atmosphereBg,
        atmosphereGlow: variant.atmosphereGlow,
        atmosphereText: variant.atmosphereText,
        atmosphereMuted: variant.atmosphereText,
        isLightTheme: variant.isLightTheme,
        stocks: variant.stocks.map((stock) => ({
          sizeLabel: stock.sizeLabel,
          stock: stock.stock,
        })),
      };
    });

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      subtitle: row.subtitle,
      heroWord: row.heroWord,
      categorySlug: row.category.slug,
      categoryName: row.category.name,
      description: row.description,
      fabricDetails: row.fabricDetails,
      deliveryInfo: row.careInstructions ?? "",
      priceInCents: row.priceInCents,
      compareAtInCents: row.compareAtInCents,
      costInCents: row.costInCents,
      ncm: row.ncm ?? undefined,
      featuredInHero: row.featuredInHero,
      rating: row.rating,
      reviewCount: row.reviewCount,
      measurements: [],
      reviews: [],
      variants,
    };
  });
}
