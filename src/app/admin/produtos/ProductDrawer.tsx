"use client";

import { useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

import { formatBRL } from "@/lib/money";
import { calculateCommission } from "@/domain/commission";
import { reaisToCents } from "@/domain/money";
import type { AdminProductRow } from "@/lib/productStore";

import { AddVariantForm } from "./AddVariantForm";
import { ArchiveProductButton } from "./ArchiveProductButton";
import { DeleteProductButton } from "./DeleteProductButton";
import { VariantEditor } from "./VariantEditor";

const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const moneyInput =
  "tabular-price mt-1 w-28 rounded-xl border border-[#E4DED8] bg-white px-3 py-2 text-sm text-[#141210] focus:border-rosegold";

export function ProductDrawer({
  product,
  onClose,
}: {
  product: AdminProductRow;
  onClose: () => void;
}) {
  const [price, setPrice] = useState(centsToInput(product.priceInCents));
  const [cost, setCost] = useState(centsToInput(product.costInCents));
  const [activeVariantId, setActiveVariantId] = useState(
    product.variants[0]?.id ?? ""
  );

  const activeVariant =
    product.variants.find((variant) => variant.id === activeVariantId) ??
    product.variants[0];

  const parsedPrice = reaisToCents(price);
  const parsedCost = reaisToCents(cost);
  const invalid = parsedPrice === null || parsedCost === null;
  const margin = invalid ? 0 : parsedPrice - parsedCost;
  const commission = calculateCommission({
    costInCents: parsedCost ?? 0,
    receivedInCents: parsedPrice ?? 0,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar detalhes da peça"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-[#1A1512]/40 backdrop-blur-[3px]"
      />

      <aside className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] border border-[#E4DED8] bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-[#EDE3D8] bg-[#FDFAF8] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-[#F7F4F1]">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="48px"
                className="object-contain"
                unoptimized
              />
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-wider text-[#6E6660] uppercase">
                {product.categoryName}
              </p>
              <h2 className="font-serif text-2xl font-semibold text-[#141210]">{product.name}</h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="cursor-pointer rounded-full border border-[#E4DED8] p-2 text-[#4A4440] hover:text-[#141210]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          <section>
            <h3 className="font-serif text-lg font-semibold">Valores</h3>

            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="block text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
                  Preço (R$)
                </span>
                <input
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  inputMode="decimal"
                  className={moneyInput}
                />
              </label>
              <label className="block">
                <span className="block text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
                  Custo (R$)
                </span>
                <input
                  value={cost}
                  onChange={(event) => setCost(event.target.value)}
                  inputMode="decimal"
                  className={moneyInput}
                />
              </label>
              <div>
                <p className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
                  Margem / 10%
                </p>
                <p className="tabular-price mt-2 text-sm font-semibold text-[#141210]">
                  {formatBRL(Math.max(0, margin))}
                  <span className="text-[#C0563E]"> · {formatBRL(commission)}</span>
                </p>
              </div>
            </div>
          </section>

          <section className="mt-7 border-t border-[#EDE3D8] pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="font-serif text-lg font-semibold">Cores e tamanhos</h3>
              <span className="tabular-price text-[11px] text-[#6E6660]">
                {product.variants.length} {product.variants.length === 1 ? "cor" : "cores"}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Cores da peça">
              {product.variants.map((variant) => {
                const active = activeVariant?.id === variant.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setActiveVariantId(variant.id)}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                      active
                        ? "border-[#161311] bg-[#161311] text-white"
                        : "border-[#E4DED8] bg-white text-[#4A4440] hover:border-rosegold hover:text-[#141210]"
                    }`}
                  >
                    <span
                      className="inline-block h-3 w-3 rounded-full border border-black/10"
                      style={{ backgroundColor: variant.swatchHex }}
                    />
                    {variant.colorName}
                  </button>
                );
              })}
            </div>

            {activeVariant && (
              <div className="mt-4">
                <VariantEditor
                  key={activeVariant.id}
                  product={product}
                  variant={activeVariant}
                  price={price}
                  cost={cost}
                />
              </div>
            )}

            <AddVariantForm product={product} />
          </section>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[#EDE3D8] bg-[#FDFAF8] px-6 py-4">
          <p className="text-[10px] text-[#6E6660]">
            {invalid ? "Confira os valores." : ""}
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <ArchiveProductButton
                slug={product.slug}
                mode={product.archived ? "restore" : "archive"}
                onDone={onClose}
              />
              <DeleteProductButton slug={product.slug} onDone={onClose} />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-full border border-[#E4DED8] px-5 py-2.5 text-xs font-semibold text-[#4A4440] hover:text-[#141210]"
            >
              Fechar
            </button>
            <button
              type="submit"
              form="variant-form"
              disabled={invalid}
              className="cursor-pointer rounded-full bg-[#161311] px-6 py-2.5 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Salvar alterações
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
