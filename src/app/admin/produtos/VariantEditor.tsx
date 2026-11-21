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
    variant.stocks.map((stock) => ({
      label: stock.sizeLabel,
      stock: String(stock.stock),
      removed: false,
    }))
  );
  const [state, action] = useActionState(saveVariantAction, { message: "" });
  const [imageName, setImageName] = useState("");

  const active = sizes.filter((size) => !size.removed);
  const labels = active.map((size) => size.label.trim());
  const hasDuplicate = new Set(labels).size !== labels.length || labels.some((label) => !label);
  const invalidQty = active.some((size) => {
    const value = Number(size.stock);
    return !Number.isInteger(value) || value < 0;
  });
  const removedCount = sizes.length - active.length;

  // Só os tamanhos ativos vão para o banco; os marcados são descartados no Salvar.
  const payload = active.map((size) => ({ label: size.label, stock: Number(size.stock) }));

  return (
    <div className="rounded-xl bg-[#FDFAF8] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-[#141210]">{variant.colorName}</p>
        <span className="tabular-price text-[10px] text-[#6E6660]">
          {active.length} {active.length === 1 ? "tamanho" : "tamanhos"}
          {removedCount > 0 && (
            <span className="ml-1 text-[#A8432F]">
              · {removedCount} para descartar
            </span>
          )}
        </span>
      </div>

      <form action={action} className="mt-3" id="variant-form">
        <input type="hidden" name="productSlug" value={product.slug} />
        <input type="hidden" name="variantId" value={variant.id} />
        <input type="hidden" name="price" value={price} />
        <input type="hidden" name="cost" value={cost} />
        <input type="hidden" name="sizes" value={JSON.stringify(payload)} />

        <div className="flex items-start gap-4">
          <div className="w-fit shrink-0">
            <div className="grid grid-cols-[5rem_6rem_2rem] items-center gap-x-2 border-b border-[#EDE3D8] pb-1.5">
              <span className="text-[10px] font-semibold tracking-wider text-[#6E6660] uppercase">
                Tamanho
              </span>
              <span className="text-[10px] font-semibold tracking-wider text-[#6E6660] uppercase">
                Quantidade
              </span>
              <span />
            </div>

            {sizes.map((size, index) => (
              <div
                key={index}
                className={`grid grid-cols-[5rem_6rem_3rem] items-center gap-x-2 border-b border-[#F1ECE7] py-1.5 ${
                  size.removed ? "opacity-50" : ""
                }`}
              >
                <input
                  value={size.label}
                  disabled={size.removed}
                  onChange={(event) =>
                    setSizes((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, label: event.target.value } : item
                      )
                    )
                  }
                  aria-label={`Tamanho da cor ${variant.colorName}`}
                  placeholder="Tam."
                  className="tabular-price w-full rounded-md border border-[#E4DED8] bg-white px-2 py-1 text-center text-xs text-[#141210] placeholder:text-[#B5ACA6] disabled:line-through"
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={size.stock}
                  disabled={size.removed}
                  onChange={(event) =>
                    setSizes((prev) =>
                      prev.map((item, i) =>
                        i === index ? { ...item, stock: event.target.value } : item
                      )
                    )
                  }
                  aria-label={`Quantidade do tamanho ${size.label} em ${variant.colorName}`}
                  className="tabular-price w-full rounded-md border border-[#E4DED8] bg-white px-2 py-1 text-center text-xs text-[#141210] disabled:line-through"
                />
                {size.removed ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSizes((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, removed: false } : item
                        )
                      )
                    }
                    aria-label={`Desfazer remoção do tamanho ${size.label} da cor ${variant.colorName}`}
                    className="cursor-pointer rounded-md px-1 py-1 text-[10px] font-semibold text-[#3F8A64] transition-colors hover:bg-[#3F8A64]/10"
                  >
                    Desfazer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setSizes((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, removed: true } : item
                        )
                      )
                    }
                    aria-label={`Marcar tamanho ${size.label || index + 1} da cor ${variant.colorName} para descartar`}
                    className="cursor-pointer rounded-md px-1 py-1 text-xs text-[#9A918B] transition-colors hover:bg-[#A8432F]/10 hover:text-[#A8432F]"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={() =>
                setSizes((prev) => [...prev, { label: "", stock: "0", removed: false }])
              }
              className="mt-2 cursor-pointer rounded-full border border-[#E4DED8] px-3 py-1 text-[10px] font-semibold text-[#4A4440] transition-colors hover:border-rosegold hover:text-[#141210]"
            >
              + Adicionar tamanho
            </button>
          </div>

          <div className="ml-auto mt-6 flex w-32 shrink-0 flex-col items-center gap-1.5">
            <div className="relative h-[150px] w-[125px] overflow-hidden rounded-lg border border-[#EDE3D8] bg-[#F7F4F1]">
              <Image
                src={variant.imageUrl}
                alt=""
                fill
                sizes="125px"
                className="object-contain"
                unoptimized
              />
            </div>
            <label className="flex w-full cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-full border border-[#E4DED8] bg-white px-2 py-1 text-[10px] font-semibold text-[#4A4440] transition-colors hover:border-rosegold hover:text-[#141210]">
              <UploadCloud className="h-3 w-3" />
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
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {imageName && <span className="text-[10px] text-[#6E6660]">{imageName}</span>}
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
