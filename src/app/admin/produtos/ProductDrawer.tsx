"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

import { saveProductsAction } from "@/admin-actions";
import { formatBRL } from "@/data/catalog";
import { calculateCommission } from "@/domain/commission";
import { reaisToCents } from "@/domain/money";
import {
  detectSizeSystem,
  type AdminProductRow,
  type ProductUpdate,
} from "@/lib/productStore";

import { AddVariantForm } from "./AddVariantForm";
import { ImageUpload } from "./ImageUpload";
import { SizeSystemPicker } from "./SizeSystemPicker";

const stockKey = (colorSlug: string, sizeLabel: string) => `${colorSlug}:${sizeLabel}`;
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
  const [draft, setDraft] = useState({
    price: centsToInput(product.priceInCents),
    cost: centsToInput(product.costInCents),
    stocks: Object.fromEntries(
      product.variants.flatMap((variant) =>
        variant.stocks.map((stock) => [
          stockKey(variant.colorSlug, stock.sizeLabel),
          String(stock.stock),
        ])
      )
    ) as Record<string, string>,
  });
  const [state, action, pending] = useActionState(saveProductsAction, { message: "" });

  const price = reaisToCents(draft.price);
  const cost = reaisToCents(draft.cost);
  const invalid = price === null || cost === null;

  const update: ProductUpdate = {
    slug: product.slug,
    priceInCents: price ?? product.priceInCents,
    costInCents: cost ?? product.costInCents,
    stocks: product.variants.flatMap((variant) =>
      variant.stocks.map((stock) => {
        const raw = draft.stocks[stockKey(variant.colorSlug, stock.sizeLabel)] ?? "0";
        const value = Number(raw);
        return {
          colorSlug: variant.colorSlug,
          sizeLabel: stock.sizeLabel,
          stock: Number.isInteger(value) && value >= 0 ? value : stock.stock,
        };
      })
    ),
  };

  const currentSystem = detectSizeSystem(
    product.variants[0]?.stocks.map((stock) => stock.sizeLabel) ?? []
  );

  const margin = invalid ? 0 : price - cost;
  const commission = calculateCommission({
    costInCents: cost ?? 0,
    receivedInCents: price ?? 0,
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
                  value={draft.price}
                  onChange={(event) => setDraft((d) => ({ ...d, price: event.target.value }))}
                  inputMode="decimal"
                  className={moneyInput}
                />
              </label>
              <label className="block">
                <span className="block text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
                  Custo (R$)
                </span>
                <input
                  value={draft.cost}
                  onChange={(event) => setDraft((d) => ({ ...d, cost: event.target.value }))}
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
            <h3 className="font-serif text-lg font-semibold">Cores e estoque</h3>
            <div className="mt-3 space-y-3">
              {product.variants.map((variant) => (
                <div key={variant.colorSlug} className="rounded-xl bg-[#FDFAF8] p-4">
                  <p className="mb-3 text-xs font-semibold text-[#141210]">{variant.colorName}</p>
                  <div className="flex flex-wrap gap-3">
                    {variant.stocks.map((stock) => {
                      const key = stockKey(variant.colorSlug, stock.sizeLabel);
                      return (
                        <label key={key} className="flex items-center gap-1.5 text-xs text-[#4A4440]">
                          {stock.sizeLabel}
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={draft.stocks[key] ?? "0"}
                            onChange={(event) =>
                              setDraft((d) => ({
                                ...d,
                                stocks: { ...d.stocks, [key]: event.target.value },
                              }))
                            }
                            className="tabular-price w-14 rounded-lg border border-[#E4DED8] bg-white px-2 py-1 text-center text-xs text-[#141210]"
                          />
                        </label>
                      );
                    })}
                  </div>
                  <ImageUpload
                    productSlug={product.slug}
                    colorSlug={variant.colorSlug}
                    currentUrl={variant.imageUrl}
                  />
                </div>
              ))}
            </div>

            <AddVariantForm productSlug={product.slug} />
          </section>

          <SizeSystemPicker product={product} current={currentSystem} />
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-[#EDE3D8] bg-[#FDFAF8] px-6 py-4">
          <p className="text-[10px] text-[#6E6660]">
            {invalid ? "Confira os valores." : "Alterações salvas no banco."}
          </p>
          <form action={action} id="product-drawer-form">
            <input type="hidden" name="products" value={JSON.stringify([update])} />
            <button
              type="submit"
              disabled={invalid || pending}
              className="cursor-pointer rounded-full bg-[#161311] px-6 py-3 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "Salvando..." : state.message || "Salvar alterações"}
            </button>
          </form>
        </footer>
      </aside>
    </div>
  );
}
