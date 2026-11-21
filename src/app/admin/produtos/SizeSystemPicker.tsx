"use client";

import { useActionState } from "react";

import { setSizeSystemAction } from "@/admin-actions";
import { SIZE_LABELS, type SizeSystem } from "@/lib/productStore";

const OPTIONS: Array<{ value: SizeSystem; label: string }> = [
  { value: "numbers", label: "Números · 36, 38, 40, 42" },
  { value: "letters", label: "Letras · PP, P, M, G" },
  { value: "unique", label: "Único" },
];

export function SizeSystemPicker({
  productSlug,
  current,
}: {
  productSlug: string;
  current: SizeSystem;
}) {
  const [state, action, pending] = useActionState(setSizeSystemAction, { message: "" });

  return (
    <form action={action} className="mt-4 border-t border-[#EDE3D8] pt-5">
      <input type="hidden" name="productSlug" value={productSlug} />
      <h3 className="font-serif text-lg font-semibold">Sistema de tamanho</h3>
      <p className="mt-0.5 text-[11px] text-[#6E6660]">
        Troca os rótulos preservando o estoque por posição.
      </p>

      <div className="mt-3 space-y-2">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E4DED8] bg-white px-3 py-2.5 text-xs text-[#141210] transition-colors hover:border-rosegold"
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
              {SIZE_LABELS[option.value].join(" · ")}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-full border border-[#C0563E] px-4 py-2 text-[11px] font-semibold text-[#A8432F] transition-colors hover:bg-[#C0563E]/10 disabled:opacity-50"
        >
          {pending ? "Aplicando..." : "Aplicar tamanhos"}
        </button>
        {state.message && (
          <span className="text-[11px] font-semibold text-[#A8432F]">{state.message}</span>
        )}
      </div>
    </form>
  );
}
