"use client";

import { useActionState, useState } from "react";

import { setSizesAction, setSizeSystemAction } from "@/admin-actions";
import {
  SIZE_LABELS,
  type AdminProductRow,
  type SizeSystem,
} from "@/lib/productStore";

const PRESETS: Array<{ value: Exclude<SizeSystem, "custom">; label: string }> = [
  { value: "numbers", label: "Números · 36–42" },
  { value: "numbers-plus", label: "Números plus · 34–44" },
  { value: "letters", label: "Letras · PP–G" },
  { value: "letters-plus", label: "Letras plus · PP–EGG" },
  { value: "unique", label: "Único" },
];

export function SizeSystemPicker({
  product,
  current,
}: {
  product: AdminProductRow;
  current: SizeSystem;
}) {
  const [presetState, presetAction, presetPending] = useActionState(
    setSizeSystemAction,
    { message: "" }
  );
  const [customState, customAction, customPending] = useActionState(setSizesAction, {
    message: "",
  });

  const [labels, setLabels] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      product.variants.flatMap((variant) =>
        variant.stocks.map((stock) => [stock.sizeLabel, stock.sizeLabel])
      )
    )
  );

  const changes = product.variants.map((variant) => ({
    variantId: variant.id,
    labels: variant.stocks.map(
      (stock) => labels[stock.sizeLabel] ?? stock.sizeLabel
    ),
  }));

  const hasDuplicate = changes.some(
    (change) => new Set(change.labels).size !== change.labels.length
  );

  return (
    <div className="mt-5 border-t border-[#EDE3D8] pt-5">
      <h3 className="font-serif text-lg font-semibold">Tamanhos</h3>
      <p className="mt-0.5 text-[11px] text-[#6E6660]">
        Presets trocam o conjunto inteiro. A edição livre corrige um rótulo ou adiciona um
        tamanho sem apagar o estoque dos demais. Ao reduzir o número de tamanhos, o estoque
        dos tamanhos removidos é descartado.
      </p>

      <form action={presetAction} className="mt-3">
        <input type="hidden" name="productSlug" value={product.slug} />
        <div className="grid gap-2 sm:grid-cols-2">
          {PRESETS.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-[#E4DED8] bg-white px-3 py-2 text-xs text-[#141210] transition-colors hover:border-rosegold"
            >
              <input
                type="radio"
                name="sizeSystem"
                value={option.value}
                defaultChecked={current === option.value}
                className="h-4 w-4 accent-[#C0563E]"
              />
              <span className="flex-1">{option.label}</span>
              <span className="tabular-price text-[10px] text-[#6E6660]">
                {SIZE_LABELS[option.value].join("·")}
              </span>
            </label>
          ))}
        </div>
        <button
          type="submit"
          disabled={presetPending}
          className="mt-3 cursor-pointer rounded-full border border-[#C0563E] px-4 py-2 text-[11px] font-semibold text-[#A8432F] transition-colors hover:bg-[#C0563E]/10 disabled:opacity-50"
        >
          {presetPending ? "Aplicando..." : "Aplicar preset"}
        </button>
        {presetState.message && (
          <span className="ml-3 text-[11px] font-semibold text-[#A8432F]">
            {presetState.message}
          </span>
        )}
      </form>

      <form action={customAction} className="mt-5 rounded-xl bg-[#FDFAF8] p-4">
        <input type="hidden" name="productSlug" value={product.slug} />
        <input type="hidden" name="changes" value={JSON.stringify(changes)} />

        <p className="text-xs font-semibold text-[#141210]">Editar rótulos / adicionar tamanho</p>
        <div className="mt-3 flex flex-wrap gap-3">
          {product.variants[0]?.stocks.map((stock) => (
            <label key={stock.sizeLabel} className="flex items-center gap-1.5 text-xs text-[#4A4440]">
              <input
                value={labels[stock.sizeLabel] ?? stock.sizeLabel}
                onChange={(event) =>
                  setLabels((prev) => ({ ...prev, [stock.sizeLabel]: event.target.value }))
                }
                className="w-16 rounded-lg border border-[#E4DED8] bg-white px-2 py-1 text-center text-xs text-[#141210]"
                aria-label={`Rótulo do tamanho ${stock.sizeLabel}`}
              />
              <span className="text-[10px] text-[#6E6660]">qtd. {stock.stock}</span>
            </label>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={customPending || hasDuplicate}
            className="cursor-pointer rounded-full bg-[#161311] px-4 py-2 text-[11px] font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {customPending ? "Salvando..." : "Salvar tamanhos"}
          </button>
          {hasDuplicate && (
            <span className="text-[11px] font-semibold text-[#A8432F]">
              Não repita rótulos.
            </span>
          )}
          {customState.message && (
            <span className="text-[11px] font-semibold text-[#A8432F]">
              {customState.message}
            </span>
          )}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-[#6E6660]">
          Para adicionar um tamanho que faltou, use um preset maior (ex.: 36–44 ou PP–EGG).
          O estoque dos tamanhos existentes é preservado.
        </p>
      </form>
    </div>
  );
}
