import { PrismaClient } from "@prisma/client";

import { CATEGORIES, PRODUCTS } from "../src/data/catalog";

const prisma = new PrismaClient();

async function main() {
  for (const category of CATEGORIES) {
    if (category.slug === "todas") continue;
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, sortOrder: CATEGORIES.indexOf(category) },
      create: {
        slug: category.slug,
        name: category.name,
        sortOrder: CATEGORIES.indexOf(category),
      },
    });
  }

  for (const product of PRODUCTS) {
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: product.categorySlug },
    });

    const saved = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        subtitle: product.subtitle,
        heroWord: product.heroWord,
        description: product.description,
        fabricDetails: product.fabricDetails,
        careInstructions: product.deliveryInfo,
        priceInCents: product.priceInCents,
        compareAtInCents: product.compareAtInCents,
        costInCents: product.costInCents,
        ncm: product.ncm ?? null,
        featuredInHero: product.featuredInHero,
        heroSortOrder: 0,
        rating: product.rating,
        reviewCount: product.reviewCount,
        categoryId: category.id,
      },
      create: {
        slug: product.slug,
        name: product.name,
        subtitle: product.subtitle,
        heroWord: product.heroWord,
        description: product.description,
        fabricDetails: product.fabricDetails,
        careInstructions: product.deliveryInfo,
        priceInCents: product.priceInCents,
        compareAtInCents: product.compareAtInCents,
        costInCents: product.costInCents,
        ncm: product.ncm ?? null,
        featuredInHero: product.featuredInHero,
        heroSortOrder: 0,
        rating: product.rating,
        reviewCount: product.reviewCount,
        categoryId: category.id,
      },
    });

    for (const [index, variant] of product.variants.entries()) {
      const savedVariant = await prisma.productVariant.upsert({
        where: {
          productId_colorSlug: {
            productId: saved.id,
            colorSlug: variant.colorSlug,
          },
        },
        update: {
          colorName: variant.colorName,
          swatchHex: variant.swatchHex,
          cutoutImageUrl: variant.cutoutImageUrl,
          galleryUrls: [],
          atmosphereBg: variant.atmosphereBg,
          atmosphereGlow: variant.atmosphereGlow,
          atmosphereText: variant.atmosphereText,
          isLightTheme: variant.isLightTheme,
          sortOrder: index,
        },
        create: {
          productId: saved.id,
          colorName: variant.colorName,
          colorSlug: variant.colorSlug,
          swatchHex: variant.swatchHex,
          cutoutImageUrl: variant.cutoutImageUrl,
          galleryUrls: [],
          atmosphereBg: variant.atmosphereBg,
          atmosphereGlow: variant.atmosphereGlow,
          atmosphereText: variant.atmosphereText,
          isLightTheme: variant.isLightTheme,
          sortOrder: index,
        },
      });

      for (const stock of variant.stocks) {
        await prisma.variantStock.upsert({
          where: {
            variantId_sizeLabel: {
              variantId: savedVariant.id,
              sizeLabel: stock.sizeLabel,
            },
          },
          update: { stock: stock.stock },
          create: {
            variantId: savedVariant.id,
            sizeLabel: stock.sizeLabel,
            stock: stock.stock,
          },
        });
      }
    }
  }

  const [categories, products, variants, stocks] = await Promise.all([
    prisma.category.count(),
    prisma.product.count(),
    prisma.productVariant.count(),
    prisma.variantStock.count(),
  ]);

  console.log(
    `seed concluído: ${categories} categorias, ${products} produtos, ${variants} variações, ${stocks} estoques`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
