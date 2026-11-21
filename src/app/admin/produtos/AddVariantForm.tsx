"use client";

import { useActionState, useState } from "react";
import Image from "next/image";

import { addVariantAction } from "@/admin-actions";
import { extractDominantColor } from "@/lib/dominantColor";
import type { AdminProductRow } from "@/lib/productStore";

const input =
  "mt-1 w-full rounded-xl border border-latte bg-white/80 px-3 py-2.5 text-sm text-espresso placeholder:text-muted/70 focus:border-rosegold";

export function AddVariantForm({
  product,
}: {
  product: AdminProductRow;
}) {
  const [state, action, pending] = useActionState(addVariantAction, { message: "" });
  const [colorName, setColorName] = useState("");
  const [colorSlug, setColorSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [swatchHex, setSwatchHex] = useState("#C58F70");
  const [imageName, setImageName] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [colorSuggested, setColorSuggested] = useState(false);
  const [rows, setRows] = useState<Array<{ sizeLabel: string; stock: string }>>([
    { sizeLabel: "", stock: "0" },
  ]);

  const parsedStocks = rows.map((row) => ({
    sizeLabel: row.sizeLabel,
    stock: Number(row.stock),
  }));
  const invalidStocks =
    parsedStocks.some(
      (item) => !item.sizeLabel || !Number.isInteger(item.stock) || item.stock < 0
    ) ||
    new Set(parsedStocks.map((item) => item.sizeLabel)).size !== parsedStocks.length;

  const suggestion = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  return (
    <form action={action} className="mt-4 rounded-xl border border-latte bg-sand/40 p-4">
      <input
        type="hidden"
        name="variant"
        value={JSON.stringify({
          productSlug: product.slug,
          colorName,
          colorSlug,
          swatchHex,
          cutoutImageUrl: "",
          atmosphereBg: "#FAF3EB",
          atmosphereGlow: "#FFFDF9",
          atmosphereText: "#3B2316",
          isLightTheme: true,
          stocks: parsedStocks,
        })}
      />

      <p className="mb-3 text-[11px] font-semibold text-espresso">Nova cor</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="text-[10px] font-semibold tracking-wider text-mocha uppercase">
                Imagem da peça (opcional)
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-latte bg-white px-3 py-2 text-[11px] font-semibold text-mocha transition-colors hover:border-rosegold hover:text-espresso">
                  Selecionar arquivo
                  <input
                    type="file"
                    name="image"
                    accept="image/webp,image/png,image/jpeg"
                    className="sr-only"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setImageName(file.name);
                      setPreview(URL.createObjectURL(file));
                      const suggested = await extractDominantColor(file);
                      if (suggested) {
                        setSwatchHex(suggested);
                        setColorSuggested(true);
                      }
                    }}
                  />
                </label>
                {imageName && <span className="text-[10px] text-muted">{imageName}</span>}
              </div>
              <p className="mt-1 text-[10px] text-muted">
                A cor da amostra é sugerida pela imagem. O upload acontece ao Salvar.
              </p>
            </div>

            {preview && (
              <div className="relative h-24 w-[84px] shrink-0 overflow-hidden rounded-lg border border-latte bg-cream">
                <Image src={preview} alt="" fill sizes="84px" className="object-contain" unoptimized />
              </div>
            )}
          </div>
        </div>

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
            Cor da amostra
          </span>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={swatchHex}
              onChange={(event) => {
                setSwatchHex(event.target.value);
                setColorSuggested(false);
              }}
              className="h-9 w-12 cursor-pointer rounded-lg border border-latte bg-white"
              aria-label="Cor da amostra da nova cor"
            />
            <input
              value={swatchHex}
              onChange={(event) => {
                setSwatchHex(event.target.value);
                setColorSuggested(false);
              }}
              className={input}
              placeholder="#C58F70"
            />
          </div>
          {colorSuggested && (
            <span className="mt-1 block text-[10px] text-copper">
              Sugerida pela imagem — ajuste se quiser.
            </span>
          )}
        </label>

        <div className="sm:col-span-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-[10px] font-semibold tracking-wider text-mocha uppercase">
              Estoque inicial
            </span>
            <span className="text-[10px] text-muted">digite os tamanhos · + adiciona · × remove</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-2">
            {rows.map((row, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 rounded-lg border border-latte bg-white px-2 py-1.5 text-[11px] text-mocha">
                  <input
                    value={row.sizeLabel}
                    onChange={(event) =>
                      setRows((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, sizeLabel: event.target.value } : item
                        )
                      )
                    }
                    aria-label={`Tamanho ${index + 1}`}
                    placeholder="Tam."
                    className="tabular-price w-10 rounded-md border border-latte bg-cream px-1 py-0.5 text-center text-xs font-semibold text-espresso"
                  />
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={row.stock}
                    onChange={(event) =>
                      setRows((prev) =>
                        prev.map((item, i) =>
                          i === index ? { ...item, stock: event.target.value } : item
                        )
                      )
                    }
                    aria-label={`Estoque inicial do tamanho ${row.sizeLabel}`}
                    className="tabular-price w-12 rounded-md border border-latte bg-cream px-1 py-0.5 text-center text-xs text-espresso"
                  />
                  {rows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                      aria-label={`Remover tamanho ${row.sizeLabel || index + 1}`}
                      className="cursor-pointer rounded-md px-1 py-0.5 text-sm text-muted transition-colors hover:bg-copper/10 hover:text-copper"
                    >
                      ×
                    </button>
                  )}
                </div>
                {index === rows.length - 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setRows((prev) => [...prev, { sizeLabel: "", stock: "0" }])
                    }
                    aria-label="Adicionar tamanho"
                    className="cursor-pointer rounded-md px-1 py-0.5 text-sm text-muted transition-colors hover:bg-rosegold/10 hover:text-copper"
                  >
                    +
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {invalidStocks && (
        <p className="mt-2 text-[11px] font-semibold text-copper">
          Quantidades inválidas.
        </p>
      )}
      {state.message && (
        <p className="mt-2 text-[11px] font-semibold text-copper">{state.message}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
        <button
          type="submit"
          disabled={pending || invalidStocks || parsedStocks.length === 0}

          title={parsedStocks.length === 0 ? "Marque ao menos um tamanho" : undefined}
          className="cursor-pointer rounded-full bg-espresso px-4 py-2 text-[11px] font-semibold text-cream transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {pending ? "Adicionando..." : "Adicionar cor"}
        </button>
      </div>
    </form>
  );
}
