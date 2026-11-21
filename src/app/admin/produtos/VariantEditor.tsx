"use client";

import { useActionState, useState } from "react";

import { saveVariantAction } from "@/admin-actions";
import type { AdminProductRow } from "@/lib/productStore";

import { ImageUpload } from "./ImageUpload";

type Variant = AdminProductRow["variants"][number];

export function VariantEditor({
  product,
  variant,
  price,
  cost,
}: {
  product: AdminProductRow;
  variant: Variant;
  price: string;
  cost: string;
}) {
  const [sizes, setSizes] = useState(
    variant.stocks.map((stock) => ({ label: stock.sizeLabel, stock: String(stock.stock) }))
  );
  const [state, action, pending] = useActionState(saveVariantAction, { message: "" });

  const labels = sizes.map((size) => size.label.trim());
  const hasDuplicate = new Set(labels).size !== labels.length || labels.some((label) => !label);
  const invalidQty = sizes.some((size) => {
    const value = Number(size.stock);
    return !Number.isInteger(value) || value < 0;
  });

  const payload = sizes.map((size) => ({ label: size.label, stock: Number(size.stock) }));

  return (
    <div className="rounded-xl bg-[#FDFAF8] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[#141210]">{variant.colorName}</p>
        <span className="tabular-price text-[10px] text-[#6E6660]">
          {sizes.length} {sizes.length === 1 ? "tamanho" : "tamanhos"}
        </span>
      </div>

      <form action={action} className="mt-3">
        <input type="hidden" name="productSlug" value={product.slug} />
        <input type="hidden" name="variantId" value={variant.id} />
        <input type="hidden" name="price" value={price} />
        <input type="hidden" name="cost" value={cost} />
        <input type="hidden" name="sizes" value={JSON.stringify(payload)} />

        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => setSizes((prev) => [...prev, { label: "", stock: "0" }])}
            className="cursor-pointer rounded-full border border-[#E4DED8] px-3 py-1 text-[10px] font-semibold text-[#4A4440] transition-colors hover:border-rosegold hover:text-[#141210]"
          >
            + Adicionar tamanho
          </button>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {sizes.map((size, index) => (
            <div key={index} className="flex items-center gap-1.5 text-xs text-[#4A4440]">
              <input
                value={size.label}
                onChange={(event) =>
                  setSizes((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, label: event.target.value } : item
                    )
                  )
                }
                aria-label={`Tamanho da cor ${variant.colorName}`}
                placeholder="Tam."
                className="w-16 rounded-lg border border-[#E4DED8] bg-white px-2 py-1 text-center text-xs text-[#141210] placeholder:text-[#B5ACA6]"
              />
              <button
                type="button"
                onClick={() => setSizes((prev) => prev.filter((_, i) => i !== index))}
                aria-label={`Remover tamanho ${size.label || index + 1} da cor ${variant.colorName}`}
                className="cursor-pointer text-[11px] text-[#9A918B] hover:text-[#A8432F]"
              >
                ×
              </button>
              <input
                type="number"
                min={0}
                step={1}
                value={size.stock}
                onChange={(event) =>
                  setSizes((prev) =>
                    prev.map((item, i) =>
                      i === index ? { ...item, stock: event.target.value } : item
                    )
                  )
                }
                aria-label={`Quantidade do tamanho ${size.label} em ${variant.colorName}`}
                className="tabular-price w-14 rounded-lg border border-[#E4DED8] bg-white px-2 py-1 text-center text-xs text-[#141210]"
              />
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending || hasDuplicate || invalidQty}
            className="cursor-pointer rounded-full bg-[#161311] px-4 py-1.5 text-[11px] font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Salvando..." : "Salvar tamanhos desta cor"}
          </button>
          {hasDuplicate && (
            <span className="text-[10px] font-semibold text-[#A8432F]">Rótulos repetidos ou vazios.</span>
          )}
          {invalidQty && (
            <span className="text-[10px] font-semibold text-[#A8432F]">Quantidade inválida.</span>
          )}
          {state.message && (
            <span className="text-[10px] font-semibold text-[#A8432F]">{state.message}</span>
          )}
        </div>
      </form>

      <ImageUpload
        productSlug={product.slug}
        colorSlug={variant.colorSlug}
        currentUrl={variant.imageUrl}
      />
    </div>
  );
}
