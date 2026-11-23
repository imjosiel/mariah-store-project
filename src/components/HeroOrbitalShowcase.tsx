"use client";

import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ShoppingBag,
} from "lucide-react";
import { Product, ProductVariant } from "@/types/store";
import { formatBRL } from "@/lib/money";
import { useBag } from "@/context/BagContext";
import { liveStock } from "@/domain/stock";
import { useStockLevels } from "@/lib/useStock";

interface HeroOrbitalShowcaseProps {
  products: Product[];
  onInspectProduct: (product: Product, variantId: string) => void;
}

export function HeroOrbitalShowcase({
  products,
  onInspectProduct,
}: HeroOrbitalShowcaseProps) {
  const { addItem, openBag, totalItems } = useBag();
  const stockLevels = useStockLevels();
  const stockOf = useCallback(
    (variantId: string, sizeLabel: string, fallback: number) =>
      liveStock(stockLevels.levels, variantId, sizeLabel, fallback),
    [stockLevels]
  );
  const [activeIndex, setActiveIndex] = useState(0);

  // Track chosen variant and size per product so switching back remembers choices
  const [variantMap, setVariantMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(products.map((p) => [p.id, p.variants[0].id]))
  );

  const [sizeMap, setSizeMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      products.map((p) => {
        const firstAvailable =
          p.variants[0].stocks.find(
            (s) => stockOf(p.variants[0].id, s.sizeLabel, s.stock) > 0
          )?.sizeLabel ??
          p.variants[0].stocks[0].sizeLabel;
        return [p.id, firstAvailable];
      })
    )
  );

  const len = products.length;
  const activeProduct = products[activeIndex];
  const prevIndex = (activeIndex - 1 + len) % len;
  const nextIndex = (activeIndex + 1) % len;

  const getActiveVariant = (product: Product): ProductVariant => {
    const vid = variantMap[product.id];
    return product.variants.find((v) => v.id === vid) ?? product.variants[0];
  };

  const activeVariant = getActiveVariant(activeProduct);
  const prevProduct = products[prevIndex];
  const nextProduct = products[nextIndex];
  const prevVariant = getActiveVariant(prevProduct);
  const nextVariant = getActiveVariant(nextProduct);

  const selectedSize = useMemo(() => {
    const current = sizeMap[activeProduct.id];
    const stockEntry = activeVariant.stocks.find((s) => s.sizeLabel === current);
    if (
      stockEntry &&
      stockOf(activeVariant.id, current, stockEntry.stock) > 0
    ) {
      return current;
    }
    return (
      activeVariant.stocks.find(
        (s) => stockOf(activeVariant.id, s.sizeLabel, s.stock) > 0
      )?.sizeLabel ?? activeVariant.stocks[0].sizeLabel
    );
  }, [activeProduct.id, activeVariant, sizeMap, stockOf]);

  const handleSelectVariant = (variant: ProductVariant) => {
    setVariantMap((prev) => ({ ...prev, [activeProduct.id]: variant.id }));
    const currentSize = sizeMap[activeProduct.id];
    const stillInStock = variant.stocks.find(
      (s) =>
        s.sizeLabel === currentSize &&
        stockOf(variant.id, s.sizeLabel, s.stock) > 0
    );
    if (!stillInStock) {
      const fallback = variant.stocks.find(
        (s) => stockOf(variant.id, s.sizeLabel, s.stock) > 0
      )?.sizeLabel;
      if (fallback) {
        setSizeMap((prev) => ({ ...prev, [activeProduct.id]: fallback }));
      }
    }
  };

  const goNext = () => setActiveIndex((i) => (i + 1) % len);
  const goPrev = () => setActiveIndex((i) => (i - 1 + len) % len);

  // Wheel scroll & Mobile Touch Swipe interaction: scrolling or swiping on the garment spins the rack
  const showcaseRef = useRef<HTMLDivElement>(null);
  const wasSwipingRef = useRef(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const el = showcaseRef.current;
    if (!el) return;

    // --- Desktop Mouse Wheel ---
    let accumulatedDelta = 0;
    let resetTimer: ReturnType<typeof setTimeout> | null = null;
    let lastActionTime = 0;
    const COOLDOWN_MS = 340;
    const ACCUMULATE_THRESHOLD = 32;

    const onWheel = (e: WheelEvent) => {
      // Intercept scroll specifically over the clothes
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
            setActiveIndex((i) => (i + 1) % len);
          } else {
            setActiveIndex((i) => (i - 1 + len) % len);
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

      // If user is intentionally dragging horizontally across the garment
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 8) {
        isHorizontalSwipe = true;
        if (e.cancelable) {
          e.preventDefault(); // Stop page from jittering vertically
        }
      }
    };

    const onTouchEnd = () => {
      if (!isHorizontalSwipe) return;

      const diffX = touchCurrentX - touchStartX;
      const diffY = touchCurrentY - touchStartY;

      if (Math.abs(diffX) > 36 && Math.abs(diffX) > Math.abs(diffY) * 1.1) {
        wasSwipingRef.current = true;
        window.setTimeout(() => {
          wasSwipingRef.current = false;
        }, 280);

        if (diffX < 0) {
          setActiveIndex((i) => (i + 1) % len);
        } else {
          setActiveIndex((i) => (i - 1 + len) % len);
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
  }, [len]);

  const isLight = activeVariant.isLightTheme;

  // Dynamic surface tokens derived from current garment's chromatic world
  const borderSubtle = isLight
    ? "rgba(59, 35, 22, 0.28)"
    : "rgba(250, 243, 235, 0.22)";
  const pillSurface = isLight
    ? "rgba(59, 35, 22, 0.08)"
    : "rgba(250, 243, 235, 0.12)";
  const btnBg = isLight ? "#3B2316" : "#FAF3EB";
  const btnText = isLight ? "#FAF3EB" : "#3B2316";

  // Build orbital items (prev, active, next) keyed by product.id so Motion animates along diagonal orbit
  const orbitalSlots = [
    {
      role: "prev" as const,
      product: prevProduct,
      variant: prevVariant,
      onClick: goPrev,
      label: `Voltar para ${prevProduct.name}`,
    },
    {
      role: "active" as const,
      product: activeProduct,
      variant: activeVariant,
      onClick: () => onInspectProduct(activeProduct, activeVariant.id),
      label: `Inspecionar ${activeProduct.name}`,
    },
    {
      role: "next" as const,
      product: nextProduct,
      variant: nextVariant,
      onClick: goNext,
      label: `Próxima peça: ${nextProduct.name}`,
    },
  ];

  return (
    <section
      id="vitrine"
      aria-label="Vitrine principal de peças em destaque"
      className="relative flex min-h-[100svh] w-full flex-col justify-between overflow-hidden transition-colors duration-700 ease-out"
      style={{
        backgroundColor: activeVariant.atmosphereBg,
        color: activeVariant.atmosphereText,
      }}
    >
      {/* Ambient Radial Studio Spotlight behind garment */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 transition-all duration-700 ease-out"
        style={{
          background: `radial-gradient(circle at 50% 48%, ${activeVariant.atmosphereGlow} 0%, transparent 62%)`,
          opacity: isLight ? 0.92 : 0.78,
        }}
      />

      {/* Top Navigation Bar */}
      <header className="relative z-30 mx-auto flex w-full max-w-[1380px] items-center justify-between px-5 pt-5 pb-3 sm:px-8 lg:px-12 lg:pt-7">
        {/* Brand Lockup faithful to logo.png */}
        <a
          href="#vitrine"
          className="group flex items-center gap-3 rounded-full pr-3 transition-transform duration-200 hover:-translate-y-0.5"
        >
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1 ring-[#C58F70]/60 shadow-sm">
            <Image
              src="/brand/logo-seal.webp"
              alt="Selo Maria's Store"
              width={88}
              height={88}
              className="h-full w-full object-cover"
              priority
            />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-serif text-xl font-semibold tracking-tight sm:text-2xl">
              Maria&apos;s
            </span>
            <span className="font-script -mt-1 text-lg opacity-90 sm:text-xl">
              Store
            </span>
          </span>
        </a>

        {/* Capsule Navigation inspired by 3.mp4 */}
        <nav
          aria-label="Navegação principal"
          className="hidden items-center gap-1 rounded-full p-1 backdrop-blur-md md:flex"
          style={{
            backgroundColor: pillSurface,
            border: `1px solid ${borderSubtle}`,
          }}
        >
          <a
            href="#vitrine"
            className="rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase transition-transform duration-200"
            style={{
              backgroundColor: btnBg,
              color: btnText,
            }}
          >
            Destaques
          </a>
          <a
            href="#catalogo"
            className="rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase opacity-85 transition-opacity hover:opacity-100"
          >
            Catálogo Completo
          </a>
          <a
            href="#essencia"
            className="rounded-full px-4 py-1.5 text-xs font-medium tracking-wide uppercase opacity-85 transition-opacity hover:opacity-100"
          >
            A Marca
          </a>
        </nav>

        {/* Right Bag Action */}
        <div className="flex items-center gap-2.5">
          <a
            href="#catalogo"
            className="hidden rounded-full px-4 py-2 text-xs font-semibold transition-transform duration-200 hover:-translate-y-0.5 sm:inline-flex"
            style={{
              backgroundColor: pillSurface,
              border: `1px solid ${borderSubtle}`,
              color: activeVariant.atmosphereText,
            }}
          >
            Ver todas ({products.length + 1})
          </a>
          <button
            type="button"
            onClick={openBag}
            aria-label={`Abrir sacola de compras (${totalItems} itens)`}
            className="group relative inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
            style={{
              backgroundColor: pillSurface,
              border: `1px solid ${borderSubtle}`,
            }}
          >
            <ShoppingBag className="h-4 w-4" strokeWidth={1.8} />
            <span className="hidden sm:inline">Sacola</span>
            <span
              className="tabular-price inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold"
              style={{
                backgroundColor: btnBg,
                color: btnText,
              }}
            >
              {totalItems}
            </span>
          </button>
        </div>
      </header>

      {/* Main 3-Column Hero Stage */}
      <div className="relative z-20 mx-auto grid w-full max-w-[1380px] flex-1 grid-cols-1 items-center gap-6 px-5 py-4 sm:px-8 lg:grid-cols-12 lg:gap-4 lg:px-12">
        {/* LEFT COLUMN: Editorial Copy & Primary CTA */}
        <div className="relative z-30 order-2 flex flex-col items-start justify-center lg:order-1 lg:col-span-4">
          {/* Orbital Prev / Next Controls */}
          <div className="mb-4 flex items-center gap-2.5">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Peça anterior em destaque"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
              style={{
                backgroundColor: pillSurface,
                border: `1px solid ${borderSubtle}`,
              }}
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="Próxima peça em destaque"
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
              style={{
                backgroundColor: pillSurface,
                border: `1px solid ${borderSubtle}`,
              }}
            >
              <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
            </button>
            <span
              className="tabular-price ml-1 text-xs font-medium tracking-wider"
              style={{ color: activeVariant.atmosphereMuted }}
            >
              {activeIndex + 1} / {len} · {activeProduct.categoryName}
            </span>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeProduct.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-md"
            >
              <h1 className="font-serif text-4xl leading-[1.03] font-semibold tracking-[-0.02em] sm:text-5xl lg:text-[3.35rem]">
                {activeProduct.name}
              </h1>
              <p
                className="mt-3 text-sm leading-relaxed sm:text-[15px]"
                style={{ color: activeVariant.atmosphereMuted }}
              >
                {activeProduct.description}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Two Hero Actions (Verb + Object) */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => addItem(activeProduct, activeVariant, selectedSize)}
              className="group inline-flex cursor-pointer items-center gap-2.5 rounded-full px-6 py-3.5 text-sm font-semibold shadow-lg transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{
                backgroundColor: btnBg,
                color: btnText,
              }}
            >
              <span>Adicionar à sacola</span>
              <ArrowUpRight
                className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                strokeWidth={2}
              />
            </button>

            <button
              type="button"
              onClick={() => onInspectProduct(activeProduct, activeVariant.id)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-3.5 text-sm font-medium transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{
                backgroundColor: pillSurface,
                border: `1px solid ${borderSubtle}`,
              }}
            >
              <span>Ver detalhes da peça</span>
            </button>
          </div>
        </div>

        {/* CENTER COLUMN: Monumental Word (1.mp4) + 3D Orbital Garment Trajectory (3.mp4) */}
        <motion.div
          ref={showcaseRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative z-10 order-1 flex h-[340px] items-center justify-center touch-pan-y select-none sm:h-[430px] lg:order-2 lg:col-span-5 lg:h-[540px]"
        >
          {/* Monumental Background Serif Word inspired by 1.mp4 */}
          <AnimatePresence mode="wait">
            <motion.span
              key={activeProduct.heroWord}
              aria-hidden="true"
              initial={{ opacity: 0, scale: 0.92, filter: "blur(6px)" }}
              animate={{ opacity: isLight ? 0.11 : 0.14, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.06, filter: "blur(6px)" }}
              transition={{ duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute z-0 font-serif text-[4.7rem] leading-none font-bold tracking-[-0.04em] select-none sm:text-[7.5rem] xl:text-[9.2rem]"
            >
              {activeProduct.heroWord}
            </motion.span>
          </AnimatePresence>

          {/* Soft Offset Floor Shadow underneath active floating garment */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-4 z-10 h-8 w-48 rounded-full blur-xl transition-opacity duration-500 sm:w-60"
            style={{
              backgroundColor: isLight
                ? "rgba(59, 35, 22, 0.22)"
                : "rgba(12, 5, 3, 0.52)",
            }}
          />

          {/* Orbital 3-Slot Stage: Prev (top-left blurred) -> Active (center crisp) -> Next (bottom-right preview) */}
          {orbitalSlots.map(({ role, product, variant, onClick, label }) => {
            const isCenter = role === "active";
            const isPrev = role === "prev";

            // Responsive percentage coordinates via Framer Motion
            const targetState = isCenter
              ? {
                  x: "0%",
                  y: "0%",
                  scale: 1,
                  opacity: 1,
                  filter: "blur(0px)",
                  rotate: 0,
                  zIndex: 20,
                }
              : isPrev
                ? {
                    x: "-68%",
                    y: "-48%",
                    scale: 0.29,
                    opacity: 0.38,
                    filter: "blur(4.5px)",
                    rotate: -6,
                    zIndex: 10,
                  }
                : {
                    x: "68%",
                    y: "50%",
                    scale: 0.31,
                    opacity: 0.88,
                    filter: "blur(0.4px)",
                    rotate: 5,
                    zIndex: 15,
                  };

            return (
              <motion.button
                key={product.id}
                type="button"
                onClick={() => {
                  if (!wasSwipingRef.current) onClick();
                }}
                aria-label={label}
                initial={false}
                animate={targetState}
                whileHover={
                  isCenter
                    ? { y: "-2%", scale: 1.025 }
                    : { scale: role === "next" ? 0.37 : 0.35, opacity: 0.95 }
                }
                transition={{
                  type: "spring",
                  stiffness: 210,
                  damping: 27,
                  mass: 0.95,
                }}
                className={`absolute flex cursor-pointer items-center justify-center focus:outline-none ${
                  !isCenter ? "hidden sm:flex" : "flex"
                }`}
                style={{
                  width: "min(78vw, 390px)",
                  height: "min(78vw, 460px)",
                }}
              >
                <AnimatePresence mode="popLayout">
                  <motion.div
                    key={variant.id}
                    initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 1.03, filter: "blur(4px)" }}
                    transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
                    className="relative h-full w-full"
                  >
                    <Image
                      src={variant.cutoutImageUrl}
                      alt={`${product.name} na cor ${variant.colorName}`}
                      fill
                      sizes="(max-width: 768px) 78vw, 420px"
                      className="object-contain drop-shadow-[0_22px_28px_rgba(20,10,6,0.28)]"
                      priority={isCenter}
                    />
                  </motion.div>
                </AnimatePresence>
              </motion.button>
            );
          })}

          {/* Interactive Wheel Scroll Badge indicator on hover */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className="pointer-events-none absolute bottom-1 z-30 hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold tracking-wide shadow-md backdrop-blur-md sm:flex"
                style={{
                  backgroundColor: pillSurface,
                  border: `1px solid ${borderSubtle}`,
                  color: activeVariant.atmosphereText,
                }}
              >
                <span>↕ Role o scroll para girar a arara</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* RIGHT COLUMN: Price, Color Swatch Selector & Circular Size Selector */}
        <div className="relative z-30 order-3 flex flex-col items-start justify-center lg:col-span-3 lg:items-end lg:text-right">
          {/* Price Block with Compare-At Strike-through like 3.mp4 */}
          <div className="flex flex-wrap items-baseline gap-3 lg:flex-col lg:items-end lg:gap-0.5">
            <span className="tabular-price font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
              {formatBRL(activeProduct.priceInCents)}
            </span>
            {activeProduct.compareAtInCents && (
              <span
                className="tabular-price text-base line-through opacity-75 sm:text-lg"
                style={{ color: activeVariant.atmosphereMuted }}
              >
                {formatBRL(activeProduct.compareAtInCents)}
              </span>
            )}
          </div>
          {/* Color Swatches ("the swatch changes the picture" + atmosphere!) */}
          <div className="mt-6 flex flex-col items-start lg:items-end">
            <span
              className="text-xs font-medium tracking-wide"
              style={{ color: activeVariant.atmosphereMuted }}
            >
              Tom selecionado:{" "}
              <strong style={{ color: activeVariant.atmosphereText }}>
                {activeVariant.colorName}
              </strong>
            </span>
            <div
              role="radiogroup"
              aria-label="Selecionar cor da peça"
              className="mt-2.5 flex items-center gap-3"
            >
              {activeProduct.variants.map((variant) => {
                const isSelected = variant.id === activeVariant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`Cor ${variant.colorName}`}
                    onClick={() => handleSelectVariant(variant)}
                    className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full transition-transform duration-200 hover:scale-105 active:scale-95"
                    style={{
                      border: isSelected
                        ? `2px solid ${activeVariant.atmosphereText}`
                        : `1px solid ${borderSubtle}`,
                    }}
                  >
                    <span
                      className="h-7 w-7 rounded-full shadow-inner"
                      style={{ backgroundColor: variant.swatchHex }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Circular Size Selector inspired by 1.mp4 & 3.mp4 */}
          <div className="mt-6 flex flex-col items-start lg:items-end">
            <span
              className="text-xs font-medium tracking-wide"
              style={{ color: activeVariant.atmosphereMuted }}
            >
              Escolha seu tamanho:
            </span>
            <div
              role="radiogroup"
              aria-label="Selecionar tamanho"
              className="mt-2.5 flex flex-wrap items-center gap-2.5"
            >
              {activeVariant.stocks.map(({ sizeLabel, stock }) => {
                const isSelected = selectedSize === sizeLabel;
                const isOut =
                  stockOf(activeVariant.id, sizeLabel, stock) === 0;
                return (
                  <button
                    key={sizeLabel}
                    type="button"
                    role="radio"
                    disabled={isOut}
                    aria-checked={isSelected}
                    aria-label={`Tamanho ${sizeLabel}${isOut ? " (esgotado)" : ""}`}
                    onClick={() =>
                      setSizeMap((prev) => ({
                        ...prev,
                        [activeProduct.id]: sizeLabel,
                      }))
                    }
                    className={`tabular-price flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-xs font-semibold transition-all duration-200 ${
                      isOut
                        ? "cursor-not-allowed line-through opacity-35"
                        : "cursor-pointer hover:-translate-y-0.5 active:scale-95"
                    }`}
                    style={{
                      backgroundColor: isSelected ? btnBg : "transparent",
                      color: isSelected ? btnText : activeVariant.atmosphereText,
                      border: `1px solid ${
                        isSelected ? btnBg : borderSubtle
                      }`,
                    }}
                  >
                    {sizeLabel}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
