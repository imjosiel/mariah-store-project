import { prisma } from "@/lib/prisma";

import { CategoriesClient } from "./CategoriesClient";

export const instant = false;

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      _count: { select: { products: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <CategoriesClient
      categories={categories.map((category) => ({
        slug: category.slug,
        name: category.name,
        products: category._count.products,
      }))}
    />
  );
}
