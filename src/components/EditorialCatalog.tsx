"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  GalleryHorizontal,
  LayoutGrid,
  MessageCircle,
  ShoppingBag,
  Star,
  ZoomIn,
} from "lucide-react";
import { formatBRL } from "@/lib/money";
import type { Category } from "@/types/store";
import { CategorySlug, Product, ProductVariant } from "@/types/store";
import { useBag } from "@/context/BagContext";
import { liveStock } from "@/domain/stock";
import { useStockLevels } from "@/lib/useStock";

interface EditorialCatalogProps {
  products: Product[];
  categories: Category[];
  inspectedRequest: { productId: string; variantId?: string; nonce: number } | null;
}

type ViewMode = "carousel" | "grid";

export function EditorialCatalog({
  products,
  categories,
  inspectedRequest,
}: EditorialCatalogProps) {
  const { addItem } = useBag();
  const stockLevels = useStockLevels();
  const stockOf = (variantId: string, sizeLabel: string, fallback: number) =>
    liveStock(stockLevels.levels, variantId, sizeLabel, fallback);

  const [activeCategory, setActiveCategory] = useState<CategorySlug>("todas");
  const [viewMode, setViewMode] = useState<ViewMode>("carousel");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [zoomedDetail, setZoomedDetail] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string>("details");

  // Variant & size choice per product across the catalog
  const [variantMap, setVariantMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(products.map((p) => [p.id, p.variants[0].id]))
  );
  const [sizeMap, setSizeMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      products.map((p) => [
        p.id,
        p.variants[0].stocks.find(
          (s) => stockOf(p.variants[0].id, s.sizeLabel, s.stock) > 0
        )?.sizeLabel ??
          p.variants[0].stocks[0].sizeLabel,
      ])
    )
  );

  // Respond when user clicks "Ver detalhes da peça" from Hero.
  // Padrão recomendado pelo React para "ajustar estado quando props mudam":
  // comparar com o valor anterior e atualizar durante o render (sem useEffect).
  const [lastInspectedNonce, setLastInspectedNonce] = useState<number | null>(
    inspectedRequest?.nonce ?? null
  );

  if (inspectedRequest && inspectedRequest.nonce !== lastInspectedNonce) {
    setLastInspectedNonce(inspectedRequest.nonce);
    if (inspectedRequest.variantId) {
      setVariantMap((prev) => ({
        ...prev,
        [inspectedRequest.productId]: inspectedRequest.variantId!,
      }));
    }
    setDetailProductId(inspectedRequest.productId);
    setZoomedDetail(false);
  }

  const filteredProducts = useMemo(() => {
    if (activeCategory === "todas") return products;
    return products.filter((p) => p.categorySlug === activeCategory);
  }, [activeCategory, products]);

  // Keep carouselIndex in bounds when category changes
  const safeCarouselIndex =
    filteredProducts.length > 0 ? carouselIndex % filteredProducts.length : 0;

  const getVariant = (product: Product): ProductVariant => {
    const vid = variantMap[product.id];
    return product.variants.find((v) => v.id === vid) ?? product.variants[0];
  };

  const getSelectedSize = (product: Product, variant: ProductVariant): string => {
    const chosen = sizeMap[product.id];
    const valid = variant.stocks.find(
      (s) =>
        s.sizeLabel === chosen && stockOf(variant.id, s.sizeLabel, s.stock) > 0
    );
    if (valid) return chosen;
    return (
      variant.stocks.find(
        (s) => stockOf(variant.id, s.sizeLabel, s.stock) > 0
      )?.sizeLabel ?? variant.stocks[0].sizeLabel
    );
  };

  const detailProduct = useMemo(
    () => products.find((p) => p.id === detailProductId) ?? null,
    [detailProductId, products]
  );

  const openDetail = (product: Product, variantId?: string) => {
    if (variantId) {
      setVariantMap((prev) => ({ ...prev, [product.id]: variantId }));
    }
    setDetailProductId(product.id);
    setZoomedDetail(false);
  };

  const handleCategoryChange = (slug: CategorySlug) => {
    setActiveCategory(slug);
    setCarouselIndex(0);
    setDetailProductId(null);
  };

  // Wheel scroll & Mobile Touch Swipe interaction: scrolling or swiping on the passarela garments spins the carousel
  const passarelaRef = useRef<HTMLDivElement>(null);
  const wasSwipingPassarelaRef = useRef(false);

  useEffect(() => {
    const el = passarelaRef.current;
    if (!el || filteredProducts.length <= 1) return;

    // --- Desktop Mouse Wheel ---
    let accumulatedDelta = 0;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;
    let lastActionTime = 0;
    const COOLDOWN_MS = 340;
    const ACCUMULATE_THRESHOLD = 32;
    const total = filteredProducts.length;

    const onWheel = (e: WheelEvent) => {
      // Intercept scroll specifically over the clothes in passarela
      e.preventDefault();

      const rawDelta =
        Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      accumulatedDelta += rawDelta;

      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(() => {
        accumulatedDelta = 0;
      }, 200);

      const now = Date.now();
      if (Math.abs(accumulatedDelta) >= ACCUMULATE_THRESHOLD) {
        if (now - lastActionTime >= COOLDOWN_MS) {
          if (accumulatedDelta > 0) {
            setCarouselIndex((i) => (i + 1) % total);
          } else {
            setCarouselIndex((i) => (i - 1 + total) % total);
          }
          lastActionTime = now;
        }
        accumulatedDelta = 0;
      }
    };

    // --- Mobile Touch Swipe ---
    let touchStartX = 0;
    let touchStartY = 0;
    let touchCurrentX = 0;
    let touchCurrentY = 0;
    let isHorizontalSwipe = false;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchCurrentX = touchStartX;
      touchCurrentY = touchStartY;
      isHorizontalSwipe = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      touchCurrentX = e.touches[0].clientX;
      touchCurrentY = e.touches[0].clientY;

      const diffX = touchCurrentX - touchStartX;
      const diffY = touchCurrentY - touchStartY;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 8) {
        isHorizontalSwipe = true;
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    };

    const onTouchEnd = () => {
      if (!isHorizontalSwipe) return;

      const diffX = touchCurrentX - touchStartX;
      const diffY = touchCurrentY - touchStartY;

      if (Math.abs(diffX) > 36 && Math.abs(diffX) > Math.abs(diffY) * 1.1) {
        wasSwipingPassarelaRef.current = true;
        window.setTimeout(() => {
          wasSwipingPassarelaRef.current = false;
        }, 280);

        if (diffX < 0) {
          setCarouselIndex((i) => (i + 1) % total);
        } else {
          setCarouselIndex((i) => (i - 1 + total) % total);
        }
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      if (resetTimer) clearTimeout(resetTimer);
    };
  }, [filteredProducts.length]);

  return (
    <section
      id="catalogo"
      aria-label="Catálogo editorial Maria's Store"
      className="relative min-h-[100svh] w-full bg-cream py-16 text-espresso sm:py-20"
    >
      <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
        {/* Top Bar: Heading (or Back button in Detail View) + View Switcher (Passarela vs Grade) */}
        <div className="relative z-40 flex flex-wrap items-end justify-between gap-4 border-b border-latte pb-6">
            {detailProduct ? (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setDetailProductId(null)}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-latte bg-sand/60 px-4 py-2 text-xs font-semibold tracking-wide uppercase text-espresso transition-all duration-200 hover:-translate-y-0.5 hover:border-rosegold"
                >
                  <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Voltar ao catálogo</span>
                </button>
                <span className="hidden text-xs text-mocha sm:inline">
                  {detailProduct.categoryName} /{" "}
                  <strong className="font-semibold text-espresso">
                    {detailProduct.name}
                  </strong>
                </span>
              </div>
            ) : (
              <div>
                <h2 className="font-serif text-4xl font-semibold tracking-[-0.02em] text-espresso sm:text-5xl">
                  Curadoria Casual Feminina
                </h2>
                <p className="mt-1.5 text-sm text-mocha">
                  Alterne entre o desfile em foco e a grade completa, ou troque os tons de cada peça ao vivo.
                </p>
              </div>
            )}

            {/* Mode Switcher inspired by 2.mp4 top-right icons */}
            {!detailProduct && (
              <div
                role="group"
                aria-label="Alternar visualização do catálogo"
                className="inline-flex items-center rounded-full border border-latte bg-sand/70 p-1"
              >
                <button
                  type="button"
                  onClick={() => setViewMode("carousel")}
                  aria-pressed={viewMode === "carousel"}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                    viewMode === "carousel"
                      ? "bg-espresso text-cream shadow-sm"
                      : "text-mocha hover:text-espresso"
                  }`}
                >
                  <GalleryHorizontal className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Passarela</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  aria-pressed={viewMode === "grid"}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 ${
                    viewMode === "grid"
                      ? "bg-espresso text-cream shadow-sm"
                      : "text-mocha hover:text-espresso"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" strokeWidth={2} />
                  <span>Grade</span>
                </button>
              </div>
            )}
          </div>

          {/* BODY: Either Shared-Element Detail View OR Sidebar + (Passarela | Grade) */}
          {detailProduct ? (
              /* ==============================================================
                 STATE C: SHARED-ELEMENT PRODUCT DETAIL VIEW (inspired by 2.mp4)
                 ============================================================== */
              <motion.div
                key={`detail-${detailProduct.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="mt-10 grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-12"
              >
                {(() => {
                  const variant = getVariant(detailProduct);
                  const chosenSize = getSelectedSize(detailProduct, variant);
                  const chosenStock = stockOf(
                    variant.id,
                    chosenSize,
                    variant.stocks.find((s) => s.sizeLabel === chosenSize)?.stock ?? 0
                  );

                  const whatsappQuestionText = encodeURIComponent(
                    `Olá, Maria's Store! Tenho interesse na peça *${detailProduct.name}* na cor *${variant.colorName}* (Tam ${chosenSize}). Poderia me ajudar?`
                  );

                  return (
                    <>
                      {/* Left Showcase Column */}
                      <div className="lg:col-span-6">
                        <div className="relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-latte bg-sand/45 p-6 sm:min-h-[540px] sm:p-10">
                          {/* Soft Rose-Gold / Cream Glow */}
                          <div
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-0"
                            style={{
                              background:
                                "radial-gradient(circle at 50% 48%, rgba(255,253,250,0.95) 0%, rgba(241,228,213,0.45) 68%, transparent 100%)",
                            }}
                          />

                          {/* Garment Cutout */}
                          <motion.div
                            key={variant.id}
                            initial={{ opacity: 0, scale: 0.94, filter: "blur(4px)" }}
                            animate={{
                              opacity: 1,
                              scale: zoomedDetail ? 1.32 : 1,
                              filter: "blur(0px)",
                            }}
                            transition={{
                              type: "spring",
                              stiffness: 220,
                              damping: 28,
                            }}
                            onClick={() => setZoomedDetail((z) => !z)}
                            className="relative z-10 h-[340px] w-full max-w-[380px] cursor-zoom-in sm:h-[430px]"
                          >
                            <Image
                              src={variant.cutoutImageUrl}
                              alt={`${detailProduct.name} — ${variant.colorName}`}
                              fill
                              sizes="(max-width: 1024px) 85vw, 480px"
                              className="object-contain drop-shadow-[0_20px_24px_rgba(59,35,22,0.16)]"
                            />
                          </motion.div>

                          {/* Zoom Toggle Pill */}
                          <button
                            type="button"
                            onClick={() => setZoomedDetail((z) => !z)}
                            className="relative z-20 mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-latte bg-cream/90 px-3.5 py-1.5 text-xs font-medium text-mocha transition-colors hover:border-rosegold hover:text-espresso"
                          >
                            <ZoomIn className="h-3.5 w-3.5" strokeWidth={1.8} />
                            <span>
                              {zoomedDetail
                                ? "Reduzir visualização"
                                : "Aproximar trama do tecido"}
                            </span>
                          </button>
                        </div>

                        {/* Variant Thumbnail Strip */}
                        {detailProduct.variants.length > 1 && (
                          <div className="mt-4 flex items-center gap-3">
                            {detailProduct.variants.map((v) => {
                              const active = v.id === variant.id;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() =>
                                    setVariantMap((prev) => ({
                                      ...prev,
                                      [detailProduct.id]: v.id,
                                    }))
                                  }
                                  className={`group flex cursor-pointer items-center gap-2.5 rounded-2xl border px-3 py-2 text-left transition-all duration-200 ${
                                    active
                                      ? "border-rosegold bg-sand/80 shadow-xs"
                                      : "border-latte/80 bg-cream hover:border-rosegold/60"
                                  }`}
                                >
                                  <span className="relative h-12 w-10 shrink-0">
                                    <Image
                                      src={v.cutoutImageUrl}
                                      alt={v.colorName}
                                      fill
                                      sizes="48px"
                                      className="object-contain"
                                    />
                                  </span>
                                  <span className="pr-1 text-xs font-medium text-espresso">
                                    {v.colorName}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Right Product Info & Accordions Column */}
                      <div className="relative z-30 flex flex-col lg:col-span-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h3 className="font-serif text-4xl font-semibold tracking-[-0.02em] text-espresso sm:text-5xl">
                              {detailProduct.name}
                            </h3>
                            <p className="mt-1.5 text-sm text-mocha">
                              {detailProduct.subtitle}
                            </p>
                          </div>

                          <div className="text-left sm:text-right">
                            <div className="flex items-baseline gap-2.5 sm:justify-end">
                              <span className="tabular-price font-serif text-3xl font-semibold text-espresso sm:text-4xl">
                                {formatBRL(detailProduct.priceInCents)}
                              </span>
                              {detailProduct.compareAtInCents && (
                                <span className="tabular-price text-sm text-muted line-through">
                                  {formatBRL(detailProduct.compareAtInCents)}
                                </span>
                              )}
                            </div>
                            <p className="tabular-price text-xs text-mocha">
                              ou 3x de{" "}
                              {formatBRL(
                                Math.round(detailProduct.priceInCents / 3)
                              )}{" "}
                              sem juros
                            </p>
                          </div>
                        </div>

                        {/* Rating Summary */}
                        <div className="mt-3 flex items-center gap-2 text-xs text-mocha">
                          <span className="inline-flex items-center gap-1 font-semibold text-espresso">
                            <Star className="h-3.5 w-3.5 fill-[#C58F70] text-[#C58F70]" />
                            {detailProduct.rating.toFixed(1)}
                          </span>
                          <span>·</span>
                          <span>{detailProduct.reviewCount} avaliações verificadas</span>
                        </div>

                        <p className="mt-5 text-[15px] leading-relaxed text-mocha">
                          {detailProduct.description}
                        </p>

                        {/* Color Swatches */}
                        <div className="mt-6">
                          <span className="text-xs font-medium text-mocha">
                            Cor:{" "}
                            <strong className="text-espresso">
                              {variant.colorName}
                            </strong>
                          </span>
                          <div className="mt-2.5 flex items-center gap-3">
                            {detailProduct.variants.map((v) => {
                              const isSelected = v.id === variant.id;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() =>
                                    setVariantMap((prev) => ({
                                      ...prev,
                                      [detailProduct.id]: v.id,
                                    }))
                                  }
                                  aria-label={`Selecionar cor ${v.colorName}`}
                                  className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border transition-transform duration-200 hover:scale-105 ${
                                    isSelected
                                      ? "border-2 border-espresso"
                                      : "border-latte"
                                  }`}
                                >
                                  <span
                                    className="h-7 w-7 rounded-full shadow-inner"
                                    style={{ backgroundColor: v.swatchHex }}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Size Selector + Live Stock Status */}
                        <div className="mt-6">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-mocha">
                              Tamanho:{" "}
                              <strong className="text-espresso">
                                {chosenSize}
                              </strong>
                            </span>
                            <span className="tabular-price text-xs font-medium text-copper">
                              {chosenStock <= 2 && chosenStock > 0
                                ? `Últimas ${chosenStock} unidades`
                                : "Disponível para envio imediato"}
                            </span>
                          </div>
                          <div className="mt-2.5 flex flex-wrap gap-2.5">
                            {variant.stocks.map(({ sizeLabel, stock }) => {
                              const isSelected = chosenSize === sizeLabel;
                              const isOut =
                                stockOf(variant.id, sizeLabel, stock) === 0;
                              return (
                                <button
                                  key={sizeLabel}
                                  type="button"
                                  disabled={isOut}
                                  onClick={() =>
                                    setSizeMap((prev) => ({
                                      ...prev,
                                      [detailProduct.id]: sizeLabel,
                                    }))
                                  }
                                  className={`tabular-price flex h-11 min-w-12 items-center justify-center rounded-full border px-4 text-xs font-semibold transition-all duration-200 ${
                                    isOut
                                      ? "cursor-not-allowed border-latte/60 text-muted/50 line-through"
                                      : isSelected
                                        ? "cursor-pointer border-espresso bg-espresso text-cream shadow-sm"
                                        : "cursor-pointer border-latte bg-cream text-espresso hover:-translate-y-0.5 hover:border-rosegold"
                                  }`}
                                >
                                  {sizeLabel}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Primary & WhatsApp CTAs */}
                        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            onClick={() =>
                              addItem(detailProduct, variant, chosenSize)
                            }
                            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-full bg-espresso px-7 py-4 text-sm font-semibold text-cream shadow-md transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                          >
                            <ShoppingBag className="h-4 w-4" strokeWidth={1.9} />
                            <span>Adicionar à sacola</span>
                          </button>

                          <a
                            href={`https://wa.me/?text=${whatsappQuestionText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-latte bg-sand/60 px-6 py-4 text-sm font-semibold text-espresso transition-all duration-200 hover:-translate-y-0.5 hover:border-rosegold"
                          >
                            <MessageCircle className="h-4 w-4" strokeWidth={1.9} />
                            <span>Perguntar no WhatsApp</span>
                          </a>
                        </div>

                        {/* Editorial Accordions inspired by 2.mp4 (Details / Sizing / Delivery / Reviews) */}
                        <div className="mt-8 divide-y divide-latte border-y border-latte">
                          {[
                            {
                              id: "details",
                              title: "Composição & Acabamento",
                              content: (
                                <p className="text-sm leading-relaxed text-mocha">
                                  {detailProduct.fabricDetails}
                                </p>
                              ),
                            },
                            {
                              id: "measurements",
                              title: "Tabela de Medidas da Peça",
                              content: (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs text-mocha">
                                    <thead>
                                      <tr className="border-b border-latte/70 text-espresso">
                                        <th className="py-2 pr-4 font-semibold">
                                          Tam.
                                        </th>
                                        <th className="py-2 pr-4 font-semibold">
                                          Referência Corporal
                                        </th>
                                        <th className="py-2 font-semibold">
                                          Comprimento
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="tabular-price divide-y divide-latte/40">
                                      {detailProduct.measurements.map((m) => (
                                        <tr key={m.size}>
                                          <td className="py-2 pr-4 font-semibold text-espresso">
                                            {m.size}
                                          </td>
                                          <td className="py-2 pr-4">
                                            {m.bustOrWaist}
                                          </td>
                                          <td className="py-2">{m.length}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ),
                            },
                            {
                              id: "delivery",
                              title: "Envio Rápido & Primeira Troca Grátis",
                              content: (
                                <p className="text-sm leading-relaxed text-mocha">
                                  {detailProduct.deliveryInfo}
                                </p>
                              ),
                            },
                            {
                              id: "reviews",
                              title: `Avaliações (${detailProduct.reviewCount})`,
                              content: (
                                <div className="space-y-3">
                                  {detailProduct.reviews.map((rev) => (
                                    <div
                                      key={rev.id}
                                      className="rounded-2xl bg-sand/55 p-3.5"
                                    >
                                      <div className="flex items-center justify-between text-xs">
                                        <strong className="text-espresso">
                                          {rev.author}{" "}
                                          <span className="font-normal text-muted">
                                            ({rev.city} · Veste {rev.sizeBought})
                                          </span>
                                        </strong>
                                        <span className="text-rosegold">
                                          {"★".repeat(rev.rating)}
                                        </span>
                                      </div>
                                      <p className="mt-1.5 text-xs leading-relaxed text-mocha">
                                        &ldquo;{rev.comment}&rdquo;
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ),
                            },
                          ].map((acc) => {
                            const isOpen = openAccordion === acc.id;
                            return (
                              <div key={acc.id} className="py-3.5">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenAccordion(isOpen ? "" : acc.id)
                                  }
                                  aria-expanded={isOpen}
                                  className="flex w-full cursor-pointer items-center justify-between py-1 text-left text-sm font-semibold text-espresso"
                                >
                                  <span>{acc.title}</span>
                                  <ChevronDown
                                    className={`h-4 w-4 text-mocha transition-transform duration-200 ${
                                      isOpen ? "rotate-180" : ""
                                    }`}
                                  />
                                </button>
                                <AnimatePresence initial={false}>
                                  {isOpen && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.24 }}
                                      className="overflow-hidden"
                                    >
                                      <div className="pt-2.5 pb-1">
                                        {acc.content}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            ) : (
              /* ==============================================================
                 SIDEBAR + PASSARELA CAROUSEL OR ARCHITECTURAL GRID (2.mp4)
                 ============================================================== */
              <motion.div
                key="catalog-browser"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10"
              >
                {/* Left Editorial Category Navigation (inspired by 2.mp4 outline/solid list) */}
                <aside
                  aria-label="Filtrar por categoria"
                  className="lg:col-span-3"
                >
                  {/* Mobile Horizontal Pills */}
                  <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
                    {categories.map((cat) => {
                      const active = activeCategory === cat.slug;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategoryChange(cat.slug)}
                          className={`shrink-0 cursor-pointer rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                            active
                              ? "border-espresso bg-espresso text-cream"
                              : "border-latte bg-sand/50 text-mocha"
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Desktop Typographic Outline/Solid Menu */}
                  <ul className="hidden space-y-1.5 lg:block">
                    {categories.map((cat) => {
                      const active = activeCategory === cat.slug;
                      const count =
                        cat.slug === "todas"
                          ? products.length
                          : products.filter((p) => p.categorySlug === cat.slug)
                              .length;
                      return (
                        <li key={cat.id}>
                          <button
                            type="button"
                            onClick={() => handleCategoryChange(cat.slug)}
                            className="group flex w-full cursor-pointer items-baseline justify-between py-1 text-left transition-transform duration-200 hover:translate-x-1"
                          >
                            <span
                              className={`font-serif text-3xl tracking-[-0.02em] uppercase xl:text-[2.15rem] ${
                                active
                                  ? "font-bold text-espresso"
                                  : "editorial-stroke font-semibold"
                              }`}
                            >
                              {cat.slug === "todas" ? "Coleção" : cat.name}
                            </span>
                            <span
                              className={`tabular-price text-xs ${
                                active
                                  ? "font-semibold text-copper"
                                  : "text-muted"
                              }`}
                            >
                              ({count})
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Subtle Botanical Seal Accent in Sidebar */}
                  <div className="mt-10 hidden rounded-2xl border border-latte/80 bg-sand/45 p-5 lg:block">
                    <div className="flex items-center gap-3">
                      <Image
                        src="/brand/flower-mark.webp"
                        alt=""
                        width={36}
                        height={44}
                        className="h-10 w-auto object-contain opacity-85"
                      />
                      <div>
                        <p className="font-serif text-lg font-semibold text-espresso">
                          Atendimento Consultivo
                        </p>
                        <p className="text-xs leading-relaxed text-mocha">
                          Dúvida entre dois tamanhos? Monte sua sacola e fale direto com a Maria.
                        </p>
                      </div>
                    </div>
                  </div>
                </aside>

                {/* Right 9 Columns: Passarela (Depth-of-Field Carousel) OR Grade (Grid) */}
                <div className="lg:col-span-9">
                  {viewMode === "carousel" ? (
                    /* ----------------------------------------------------------
                       STATE A: MODO PASSARELA (3D Depth-of-Field Blur Carousel)
                       ---------------------------------------------------------- */
                    <div className="relative flex flex-col items-center justify-center rounded-3xl border border-latte/80 bg-sand/35 px-4 py-10 sm:px-8 sm:py-12">
                      {filteredProducts.length > 0 && (() => {
                        const total = filteredProducts.length;
                        const centerProd = filteredProducts[safeCarouselIndex];
                        const centerVar = getVariant(centerProd);
                        const leftProd =
                          total > 1
                            ? filteredProducts[
                                (safeCarouselIndex - 1 + total) % total
                              ]
                            : null;
                        const rightProd =
                          total > 2
                            ? filteredProducts[(safeCarouselIndex + 1) % total]
                            : total === 2
                              ? filteredProducts[(safeCarouselIndex + 1) % total]
                              : null;

                        return (
                          <>
                            {/* Floating Garments Stage with Depth-of-Field Blur */}
                            <div
                              ref={passarelaRef}
                              className="relative flex h-[320px] w-full items-center justify-center touch-pan-y select-none sm:h-[390px]"
                            >
                              {/* Left Blurred Neighbor */}
                              {leftProd && total > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCarouselIndex(
                                      (safeCarouselIndex - 1 + total) % total
                                    )
                                  }
                                  aria-label={`Focar em ${leftProd.name}`}
                                  className="absolute left-2 z-10 hidden h-[250px] w-[200px] -rotate-6 cursor-pointer opacity-50 blur-[5px] transition-all duration-300 hover:opacity-75 hover:blur-[2px] sm:flex lg:left-8"
                                >
                                  <Image
                                    src={getVariant(leftProd).cutoutImageUrl}
                                    alt={leftProd.name}
                                    fill
                                    sizes="200px"
                                    className="object-contain"
                                  />
                                </button>
                              )}

                              {/* Center Crisp Featured Garment */}
                              <motion.button
                                key={`${centerProd.id}-${centerVar.id}`}
                                type="button"
                                initial={{ opacity: 0, scale: 0.93, filter: "blur(5px)" }}
                                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                transition={{
                                  type: "spring",
                                  stiffness: 230,
                                  damping: 26,
                                }}
                                onClick={() => {
                                  if (!wasSwipingPassarelaRef.current) {
                                    openDetail(centerProd, centerVar.id);
                                  }
                                }}
                                aria-label={`Inspecionar ${centerProd.name}`}
                                className="relative z-20 flex h-[300px] w-[260px] cursor-pointer items-center justify-center transition-transform duration-300 hover:-translate-y-1.5 sm:h-[370px] sm:w-[320px]"
                              >
                                <Image
                                  src={centerVar.cutoutImageUrl}
                                  alt={`${centerProd.name} — ${centerVar.colorName}`}
                                  fill
                                  sizes="(max-width: 640px) 260px, 340px"
                                  className="object-contain drop-shadow-[0_20px_24px_rgba(59,35,22,0.18)]"
                                />
                              </motion.button>

                              {/* Right Blurred Neighbor */}
                              {rightProd &&
                                total > 1 &&
                                rightProd.id !== leftProd?.id && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCarouselIndex(
                                        (safeCarouselIndex + 1) % total
                                      )
                                    }
                                    aria-label={`Focar em ${rightProd.name}`}
                                    className="absolute right-2 z-10 hidden h-[250px] w-[200px] rotate-6 cursor-pointer opacity-50 blur-[5px] transition-all duration-300 hover:opacity-75 hover:blur-[2px] sm:flex lg:right-8"
                                  >
                                    <Image
                                      src={getVariant(rightProd).cutoutImageUrl}
                                      alt={rightProd.name}
                                      fill
                                      sizes="200px"
                                      className="object-contain"
                                    />
                                  </button>
                                )}

                              {/* Prev / Next Runway Arrows */}
                              {total > 1 && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCarouselIndex(
                                        (safeCarouselIndex - 1 + total) % total
                                      )
                                    }
                                    aria-label="Peça anterior na passarela"
                                    className="absolute left-0 z-30 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-latte bg-cream/90 text-espresso shadow-xs transition-transform hover:-translate-y-0.5 sm:left-3"
                                  >
                                    <ArrowLeft className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setCarouselIndex(
                                        (safeCarouselIndex + 1) % total
                                      )
                                    }
                                    aria-label="Próxima peça na passarela"
                                    className="absolute right-0 z-30 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-latte bg-cream/90 text-espresso shadow-xs transition-transform hover:-translate-y-0.5 sm:right-3"
                                  >
                                    <ArrowRight className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>

                            {/* Centerpiece Label, Swatches & CTA (inspired by 2.mp4 bottom center) */}
                            <div className="relative z-30 mt-4 flex flex-col items-center text-center">
                              <h3 className="font-serif text-3xl font-semibold tracking-[-0.02em] text-espresso sm:text-4xl">
                                {centerProd.name}
                              </h3>
                              <p className="tabular-price mt-1 text-sm text-mocha">
                                {centerVar.colorName} ·{" "}
                                <strong className="font-semibold text-espresso">
                                  {formatBRL(centerProd.priceInCents)}
                                </strong>
                              </p>

                              {/* Live Swatch Dots */}
                              {centerProd.variants.length > 1 && (
                                <div className="mt-3 flex items-center gap-2.5">
                                  {centerProd.variants.map((v) => (
                                    <button
                                      key={v.id}
                                      type="button"
                                      aria-label={`Ver ${centerProd.name} na cor ${v.colorName}`}
                                      onClick={() =>
                                        setVariantMap((prev) => ({
                                          ...prev,
                                          [centerProd.id]: v.id,
                                        }))
                                      }
                                      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border transition-transform hover:scale-105 ${
                                        v.id === centerVar.id
                                          ? "border-2 border-espresso"
                                          : "border-latte"
                                      }`}
                                    >
                                      <span
                                        className="h-5.5 w-5.5 rounded-full"
                                        style={{ backgroundColor: v.swatchHex }}
                                      />
                                    </button>
                                  ))}
                                </div>
                              )}

                              <div className="mt-5 flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openDetail(centerProd, centerVar.id)
                                  }
                                  className="cursor-pointer rounded-full bg-espresso px-7 py-3 text-xs font-semibold tracking-wider uppercase text-cream transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
                                >
                                  Ver peça e medidas
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    addItem(
                                      centerProd,
                                      centerVar,
                                      getSelectedSize(centerProd, centerVar)
                                    )
                                  }
                                  className="cursor-pointer rounded-full border border-latte bg-cream px-5 py-3 text-xs font-semibold text-espresso transition-all duration-200 hover:-translate-y-0.5 hover:border-rosegold"
                                >
                                  + Sacola
                                </button>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    /* ----------------------------------------------------------
                       STATE B: MODO GRADE (Architectural Grid View — 2.mp4 00:14)
                       ---------------------------------------------------------- */
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {filteredProducts.map((product) => {
                        const variant = getVariant(product);
                        const defaultSize = getSelectedSize(product, variant);
                        return (
                          <article
                            key={product.id}
                            className="group flex flex-col justify-between rounded-3xl border border-latte/90 bg-sand/35 p-5 transition-all duration-250 hover:-translate-y-0.5 hover:border-rosegold/80 hover:bg-sand/55"
                          >
                            {/* Garment Cutout Frame */}
                            <button
                              type="button"
                              onClick={() => openDetail(product, variant.id)}
                              className="relative flex h-64 w-full cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-cream/65 p-4"
                            >
                              <div className="relative h-full w-full transition-transform duration-300 group-hover:scale-[1.03]">
                                <Image
                                  src={variant.cutoutImageUrl}
                                  alt={`${product.name} — ${variant.colorName}`}
                                  fill
                                  sizes="(max-width: 768px) 80vw, 280px"
                                  className="object-contain drop-shadow-[0_12px_16px_rgba(59,35,22,0.13)]"
                                />
                              </div>
                            </button>

                            {/* Card Footer */}
                            <div className="mt-4">
                              <div className="flex items-baseline justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => openDetail(product, variant.id)}
                                  className="cursor-pointer text-left font-serif text-2xl font-semibold tracking-tight text-espresso hover:text-copper"
                                >
                                  {product.name}
                                </button>
                                <span className="tabular-price shrink-0 text-sm font-semibold text-espresso">
                                  {formatBRL(product.priceInCents)}
                                </span>
                              </div>

                              <p className="mt-0.5 text-xs text-mocha">
                                {variant.colorName}
                              </p>

                              {/* Swatch Row + Quick Action */}
                              <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-latte/70 pt-3">
                                <div className="flex items-center gap-1.5">
                                  {product.variants.map((v) => (
                                    <button
                                      key={v.id}
                                      type="button"
                                      aria-label={`Cor ${v.colorName}`}
                                      onClick={() =>
                                        setVariantMap((prev) => ({
                                          ...prev,
                                          [product.id]: v.id,
                                        }))
                                      }
                                      className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border ${
                                        v.id === variant.id
                                          ? "border-espresso"
                                          : "border-latte"
                                      }`}
                                    >
                                      <span
                                        className="h-4 w-4 rounded-full"
                                        style={{ backgroundColor: v.swatchHex }}
                                      />
                                    </button>
                                  ))}
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    addItem(product, variant, defaultSize)
                                  }
                                  className="cursor-pointer rounded-full bg-espresso px-3.5 py-1.5 text-[11px] font-semibold text-cream transition-transform hover:-translate-y-0.5 active:scale-95"
                                >
                                  + Sacola ({defaultSize})
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
      </div>
    </section>
  );
}
