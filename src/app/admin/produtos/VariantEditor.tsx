"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { UploadCloud } from "lucide-react";

import { saveVariantAction } from "@/admin-actions";
import type { AdminProductRow } from "@/lib/productStore";

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
  const [imageName, setImageName] = useState("");

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

        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1.5">
          <span className="text-[10px] font-semibold tracking-wider text-[#6E6660] uppercase">
            Tamanho
          </span>
          <span className="text-[10px] font-semibold tracking-wider text-[#6E6660] uppercase">
            Qtd.
          </span>
          <span />

          {sizes.map((size, index) => (
            <div key={index} className="contents">
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
                className="tabular-price w-16 rounded-lg border border-[#E4DED8] bg-white px-2 py-1.5 text-center text-xs text-[#141210] placeholder:text-[#B5ACA6]"
              />
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
                className="tabular-price w-full max-w-20 rounded-lg border border-[#E4DED8] bg-white px-2 py-1.5 text-center text-xs text-[#141210]"
              />
              <button
                type="button"
                onClick={() => setSizes((prev) => prev.filter((_, i) => i !== index))}
                aria-label={`Remover tamanho ${size.label || index + 1} da cor ${variant.colorName}`}
                className="cursor-pointer rounded-full border border-[#E4DED8] px-2 py-1 text-[11px] text-[#9A918B] transition-colors hover:border-[#A8432F] hover:text-[#A8432F]"
              >
                Remover
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#EDE3D8] pt-3">
          <div className="relative h-10 w-9 shrink-0 overflow-hidden rounded-md bg-[#F7F4F1]">
            <Image
              src={variant.imageUrl}
              alt=""
              fill
              sizes="36px"
              className="object-contain"
              unoptimized
            />
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E4DED8] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#4A4440] transition-colors hover:border-rosegold hover:text-[#141210]">
            <UploadCloud className="h-3.5 w-3.5" />
            Trocar imagem
            <input
              type="file"
              name="image"
              accept="image/webp,image/png,image/jpeg"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setImageName(file ? file.name : "");
              }}
            />
          </label>
          {imageName && <span className="text-[10px] text-[#6E6660]">{imageName}</span>}

          <button
            type="submit"
            disabled={pending || hasDuplicate || invalidQty}
            className="cursor-pointer rounded-full bg-[#161311] px-4 py-1.5 text-[11px] font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Salvando..." : "Salvar"}
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
    </div>
  );
}
