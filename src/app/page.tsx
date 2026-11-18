"use client";

import React, { useMemo, useState } from "react";
import { PRODUCTS } from "@/data/catalog";
import { Product } from "@/types/store";
import { HeroOrbitalShowcase } from "@/components/HeroOrbitalShowcase";
import { EditorialCatalog } from "@/components/EditorialCatalog";
import { BrandEssenceSection } from "@/components/BrandEssenceSection";
import { BagDrawer } from "@/components/BagDrawer";

export default function HomePage() {
  const heroProducts = useMemo(
    () => PRODUCTS.filter((p) => p.featuredInHero),
    []
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
        products={PRODUCTS}
        inspectedRequest={inspectedRequest}
      />

      <BrandEssenceSection />

      <BagDrawer />
    </main>
  );
}
