// Lê o catálogo no banco no request — opt-out de prerender (Next 16).
export const instant = false;

import { getAdminProducts } from "@/lib/productStore";

import { PdvClient } from "./PdvClient";

export default async function PdvPage() {
  const products = await getAdminProducts();

  return (
    <PdvClient
      products={products
        .filter((product) => !product.archived)
        .map((product) => ({
          slug: product.slug,
          name: product.name,
          priceInCents: product.priceInCents,
          costInCents: product.costInCents,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            colorName: variant.colorName,
            swatchHex: variant.swatchHex,
            stocks: variant.stocks,
          })),
        }))}
    />
  );
}
