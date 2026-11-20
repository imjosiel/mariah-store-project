"use client";

import { useActionState, useState } from "react";

import { addVariantAction } from "@/admin-actions";

const input =
  "mt-1 w-full rounded-xl border border-latte bg-white/80 px-3 py-2.5 text-sm text-espresso placeholder:text-muted/70 focus:border-rosegold";

export function AddVariantForm({ productSlug }: { productSlug: string }) {
  const [state, action, pending] = useActionState(addVariantAction, { message: "" });
  const [colorName, setColorName] = useState("");
  const [colorSlug, setColorSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [stocks, setStocks] = useState("PP:0,P:0,M:0,G:0");

  const suggestion = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const parsedStocks = stocks
    .split(",")
    .map((part) => {
      const [sizeLabel, rawQty] = part.split(":").map((item) => item?.trim());
      const stock = Number(rawQty);
      if (!sizeLabel || !Number.isInteger(stock) || stock < 0) return null;
      return { sizeLabel, stock };
    })
    .filter((item): item is { sizeLabel: string; stock: number } => item !== null);

  return (
    <form action={action} className="mt-4 rounded-xl border border-latte bg-sand/40 p-4">
      <input type="hidden" name="variant" value={JSON.stringify({
        productSlug,
        colorName,
        colorSlug,
        swatchHex: "#C58F70",
        cutoutImageUrl: "",
        atmosphereBg: "#FAF3EB",
        atmosphereGlow: "#FFFDF9",
        atmosphereText: "#3B2316",
        isLightTheme: true,
        stocks: parsedStocks,
      })} />

      <p className="mb-3 text-[11px] font-semibold text-espresso">Nova cor</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[10px] font-semibold tracking-wider text-mocha uppercase">Nome</span>
          <input
            required
            value={colorName}
            onChange={(event) => {
              const value = event.target.value;
              setColorName(value);
              if (!slugTouched) setColorSlug(suggestion(value));
            }}
            className={input}
            placeholder="Terracota Suave"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold tracking-wider text-mocha uppercase">Slug</span>
          <input
            required
            value={colorSlug}
            onChange={(event) => {
              setSlugTouched(true);
              setColorSlug(event.target.value);
            }}
            className={input}
            placeholder="terracota-suave"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-[10px] font-semibold tracking-wider text-mocha uppercase">
            Estoque (PP:3,P:5,M:4,G:2)
          </span>
          <input value={stocks} onChange={(event) => setStocks(event.target.value)} className={input} />
        </label>
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-muted">
        A imagem e as cores da atmosfera usam os padrões do tema. Ajuste no banco se precisar de
        uma variação específica.
      </p>

      {state.message && <p className="mt-2 text-[11px] font-semibold text-copper">{state.message}</p>}

      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          disabled={pending || parsedStocks.length === 0}
          className="cursor-pointer rounded-full bg-espresso px-4 py-2 text-[11px] font-semibold text-cream transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {pending ? "Adicionando..." : "Adicionar cor"}
        </button>
      </div>
    </form>
  );
}
