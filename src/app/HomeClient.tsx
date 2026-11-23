"use client";

import React, { useMemo, useState } from "react";
import { Category, Product } from "@/types/store";
import type { CheckoutSettings } from "@/lib/checkoutSettings";
import { HeroOrbitalShowcase } from "@/components/HeroOrbitalShowcase";
import { EditorialCatalog } from "@/components/EditorialCatalog";
import { BrandEssenceSection } from "@/components/BrandEssenceSection";
import { BagDrawer } from "@/components/BagDrawer";

export function HomeClient({
  products,
  categories,
  checkout,
}: {
  products: Product[];
  categories: Category[];
  checkout: CheckoutSettings;
}) {
  const heroProducts = useMemo(
    () => products.filter((p) => p.featuredInHero),
    [products]
  );

  const [inspectedRequest, setInspectedRequest] = useState<{
    productId: string;
    variantId?: string;
    nonce: number;
  } | null>(null);

  const handleInspectFromHero = (product: Product, variantId: string) => {
    setInspectedRequest({
      productId: product.id,
      variantId,
      nonce: Date.now(),
    });
    const el = document.getElementById("catalogo");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <main id="conteudo-principal" className="relative min-h-screen w-full">
      <HeroOrbitalShowcase
        products={heroProducts}
        onInspectProduct={handleInspectFromHero}
      />

      <EditorialCatalog
        products={products}
        categories={categories}
        inspectedRequest={inspectedRequest}
      />

      <BrandEssenceSection />

      <BagDrawer checkout={checkout} />
    </main>
  );
}
