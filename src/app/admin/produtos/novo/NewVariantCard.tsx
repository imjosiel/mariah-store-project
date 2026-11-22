"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";

import { makeCutout } from "@/lib/cutout";
import { extractDominantColor } from "@/lib/dominantColor";
import { deriveAtmosphere, type Atmosphere } from "@/lib/atmosphere";
import { AtmosphereFields } from "../AtmosphereFields";

const input =
  "mt-1 w-full rounded-xl border border-[#E4DED8] bg-white/80 px-3 py-2.5 text-sm text-[#141210] placeholder:text-[#6E6660]/70 focus:border-rosegold";

export interface VariantDraft {
  colorName: string;
  colorSlug: string;
  slugTouched: boolean;
  swatchHex: string;
  atmosphere: Atmosphere;
  cutout: File | null;
  imageName: string;
  cutStatus: string;
  sizeRows: Array<{ sizeLabel: string; stock: string }>;
}

export function emptyVariantDraft(): VariantDraft {
  const swatchHex = "#6C2E3B";
  return {
    colorName: "",
    colorSlug: "",
    slugTouched: false,
    swatchHex,
    atmosphere: deriveAtmosphere(swatchHex),
    cutout: null,
    imageName: "",
    cutStatus: "",
    sizeRows: [{ sizeLabel: "", stock: "0" }],
  };
}

const suggestSlug = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export function NewVariantCard({
  index,
  value,
  canRemove,
  onChange,
  onRemove,
}: {
  index: number;
  value: VariantDraft;
  canRemove: boolean;
  onChange: (patch: Partial<VariantDraft>) => void;
  onRemove: () => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  const showPreview = (file: File) => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setPreview(url);
  };

  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  const setSwatch = (hex: string) => {
    onChange({ swatchHex: hex, atmosphere: deriveAtmosphere(hex) });
  };

  return (
    <div className="rounded-2xl border border-[#EDE3D8] bg-[#FDFAF8] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold text-[#141210]">Cor {index + 1}</p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remover cor ${index + 1}`}
            className="cursor-pointer rounded-full border border-[#E4DED8] p-1 text-[#6E6660] transition-colors hover:border-[#A8432F] hover:text-[#A8432F]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
            Nome da cor
          </span>
          <input
            value={value.colorName}
            onChange={(event) => {
              const text = event.target.value;
              onChange({
                colorName: text,
                colorSlug: value.slugTouched ? value.colorSlug : suggestSlug(text),
              });
            }}
            placeholder="Vinho Rosé"
            className={input}
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
            Slug da cor
          </span>
          <input
            value={value.colorSlug}
            onChange={(event) =>
              onChange({ colorSlug: event.target.value, slugTouched: true })
            }
            placeholder="vinho-rose"
            className={input}
          />
        </label>

        <div className="space-y-4">
          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Cor da amostra
            </span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={value.swatchHex}
                onChange={(event) => setSwatch(event.target.value)}
                className="h-9 w-12 cursor-pointer rounded-lg border border-[#E4DED8] bg-white"
                aria-label={`Cor da amostra da cor ${index + 1}`}
              />
              <input
                value={value.swatchHex}
                onChange={(event) => setSwatch(event.target.value)}
                className={input}
                placeholder="#6C2E3B"
              />
            </div>
          </label>
          <div>
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Imagem da peça
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E4DED8] bg-white px-3 py-2 text-[11px] font-semibold text-[#4A4440] transition-colors hover:border-rosegold hover:text-[#141210]">
                Selecionar arquivo
                <input
                  type="file"
                  accept="image/webp,image/png,image/jpeg"
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    onChange({ cutout: null, imageName: file.name, cutStatus: "Removendo fundo…" });
                    showPreview(file);
                    try {
                      const result = await makeCutout(file, (status) =>
                        onChange({ cutStatus: status })
                      );
                      const suggested = await extractDominantColor(result);
                      onChange({
                        cutout: result,
                        imageName: result.name,
                        cutStatus: "",
                        ...(suggested ? { swatchHex: suggested, atmosphere: deriveAtmosphere(suggested) } : {}),
                      });
                      showPreview(result);
                    } catch {
                      onChange({ cutStatus: "Não foi possível remover o fundo." });
                    }
                  }}
                />
              </label>
              {value.imageName && (
                <span className="text-[10px] text-[#6E6660]">{value.imageName}</span>
              )}
            </div>
            {value.cutStatus && (
              <p className="mt-1 text-[10px] text-[#6E6660]">{value.cutStatus}</p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center rounded-xl border border-dashed border-[#E4DED8] bg-white p-3 sm:min-h-[188px]">
          {preview ? (
            <div className="relative h-44 w-full">
              <Image
                src={preview}
                alt={`Prévia da cor ${index + 1}`}
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-contain"
                unoptimized
              />
            </div>
          ) : (
            <span className="text-center text-[11px] text-[#9A918B]">
              A prévia da peça aparece aqui
            </span>
          )}
        </div>

        <div className="sm:col-span-2 border-t border-[#E4DED8] pt-4">
          <AtmosphereFields
            swatchHex={value.swatchHex}
            value={value.atmosphere}
            onChange={(atmosphere) => onChange({ atmosphere })}
          />
        </div>

        <div className="sm:col-span-2">
          <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
            Estoque por tamanho
          </span>
          <div className="mt-2 space-y-2">
            {value.sizeRows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex items-center gap-1.5">
                <div className="flex items-center gap-1.5 rounded-lg border border-[#E4DED8] bg-white px-2 py-1.5">
                  <input
                    value={row.sizeLabel}
                    onChange={(event) =>
                      onChange({
                        sizeRows: value.sizeRows.map((item, i) =>
                          i === rowIndex ? { ...item, sizeLabel: event.target.value } : item
                        ),
                      })
                    }
                    placeholder="Tam."
                    aria-label={`Tamanho ${rowIndex + 1} da cor ${index + 1}`}
                    className="tabular-price w-14 rounded-md border border-[#E4DED8] bg-white px-2 py-1 text-center text-xs text-[#141210]"
                  />
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={row.stock}
                    onChange={(event) =>
                      onChange({
                        sizeRows: value.sizeRows.map((item, i) =>
                          i === rowIndex ? { ...item, stock: event.target.value } : item
                        ),
                      })
                    }
                    aria-label={`Quantidade do tamanho ${row.sizeLabel || rowIndex + 1} da cor ${index + 1}`}
                    className="tabular-price w-14 rounded-md border border-[#E4DED8] bg-white px-2 py-1 text-center text-xs text-[#141210]"
                  />
                  {value.sizeRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        onChange({ sizeRows: value.sizeRows.filter((_, i) => i !== rowIndex) })
                      }
                      aria-label={`Remover tamanho ${row.sizeLabel || rowIndex + 1}`}
                      className="cursor-pointer rounded-md px-1 py-0.5 text-sm text-[#6E6660] hover:text-[#A8432F]"
                    >
                      ×
                    </button>
                  )}
                </div>
                {rowIndex === value.sizeRows.length - 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({ sizeRows: [...value.sizeRows, { sizeLabel: "", stock: "0" }] })
                    }
                    aria-label="Adicionar tamanho"
                    className="cursor-pointer rounded-md px-1 py-0.5 text-sm text-[#6E6660] hover:text-[#A8432F]"
                  >
                    +
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
