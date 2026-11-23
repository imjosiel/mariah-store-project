// Lê o catálogo no banco no request — opt-out de prerender (Next 16).
export const instant = false;

import { getAdminProducts } from "@/lib/productStore";
import { getCommissionSettings } from "@/lib/commissionSettings";

import { PdvClient } from "./PdvClient";

export default async function PdvPage() {
  const [products, settings] = await Promise.all([
    getAdminProducts(),
    getCommissionSettings(),
  ]);

  return (
    <PdvClient
      commissionBps={settings.commissionBps}
      products={products
        .filter((product) => !product.archived)
        .map((product) => ({
          slug: product.slug,
          name: product.name,
          categoryName: product.categoryName,
          imageUrl: product.imageUrl,
          priceInCents: product.priceInCents,
          costInCents: product.costInCents,
          variants: product.variants.map((variant) => ({
            id: variant.id,
            colorName: variant.colorName,
            swatchHex: variant.swatchHex,
            imageUrl: variant.imageUrl,
            stocks: variant.stocks,
          })),
        }))}
    />
  );
}
