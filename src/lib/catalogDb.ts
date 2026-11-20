import { PRODUCTS } from "@/data/catalog";
import type { CategorySlug, Product, ProductVariant } from "@/types/store";

import { prisma } from "./prisma";

/**
 * Catálogo vindo do Postgres (Fase 2). O mock em src/data/catalog continua
 * fornecendo apenas os dados editoriais que ainda não estão no schema
 * (medidas, avaliações, atmosfera muta), até a próxima migration.
 */

export async function getProductsFromDb(): Promise<Product[]> {
  const rows = await prisma.product.findMany({
    include: {
      category: true,
      variants: { include: { stocks: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ featuredInHero: "desc" }, { heroSortOrder: "asc" }, { name: "asc" }],
  });

  return rows.map((row) => {
    const mock = PRODUCTS.find((item) => item.slug === row.slug);

    const variants: ProductVariant[] = row.variants.map((variant) => {
      const mockVariant = mock?.variants.find(
        (item) => item.colorSlug === variant.colorSlug
      );
      return {
        id: variant.id,
        colorName: variant.colorName,
        colorSlug: variant.colorSlug,
        swatchHex: variant.swatchHex,
        cutoutImageUrl: variant.cutoutImageUrl,
        atmosphereBg: variant.atmosphereBg,
        atmosphereGlow: variant.atmosphereGlow,
        atmosphereText: variant.atmosphereText,
        atmosphereMuted:
          mockVariant?.atmosphereMuted ?? variant.atmosphereText,
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
      categorySlug: row.category.slug as Exclude<CategorySlug, "todas">,
      categoryName: row.category.name,
      description: row.description,
      fabricDetails: row.fabricDetails,
      deliveryInfo: row.careInstructions ?? mock?.deliveryInfo ?? "",
      priceInCents: row.priceInCents,
      compareAtInCents: row.compareAtInCents,
      costInCents: row.costInCents,
      ncm: row.ncm ?? undefined,
      featuredInHero: row.featuredInHero,
      rating: row.rating,
      reviewCount: row.reviewCount,
      measurements: mock?.measurements ?? [],
      reviews: mock?.reviews ?? [],
      variants,
    };
  });
}
