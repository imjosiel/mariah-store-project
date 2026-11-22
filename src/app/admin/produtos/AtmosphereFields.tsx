"use client";

import { deriveAtmosphere, type Atmosphere } from "@/lib/atmosphere";

const input =
  "tabular-price mt-1 w-full rounded-xl border border-[#E4DED8] bg-white px-3 py-2.5 text-sm text-[#141210] focus:border-rosegold";

type AtmosphereField = "atmosphereBg" | "atmosphereGlow" | "atmosphereText";

function ColorField({
  name,
  label,
  field,
  value,
  onChange,
}: {
  name: string;
  label: string;
  field: AtmosphereField;
  value: Atmosphere;
  onChange: (next: Atmosphere) => void;
}) {
  const update = (hex: string) => onChange({ ...value, [field]: hex });

  return (
    <label className="block">
      <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
        {label}
      </span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          name={`${name}-picker`}
          value={value[field]}
          onChange={(event) => update(event.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border border-[#E4DED8] bg-white"
          aria-label={label}
        />
        <input
          name={name}
          value={value[field]}
          onChange={(event) => update(event.target.value)}
          className={input}
        />
      </div>
    </label>
  );
}

/**
 * Três pickers + tema claro. Os valores chegam automáticos a partir da cor
 * da peça e podem ser ajustados um a um — o que foi mexido não é sobrescrito.
 */
export function AtmosphereFields({
  swatchHex,
  value,
  onChange,
}: {
  swatchHex: string;
  value: Atmosphere;
  onChange: (next: Atmosphere) => void;
}) {
  const applySwatch = (hex: string) => onChange(deriveAtmosphere(hex));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] font-semibold text-[#141210]">Tema da página</p>
        <button
          type="button"
          onClick={() => applySwatch(swatchHex)}
          className="cursor-pointer rounded-full border border-[#E4DED8] px-3 py-1 text-[10px] font-semibold text-[#4A4440] transition-colors hover:border-rosegold hover:text-[#141210]"
        >
          Aplicar cor da peça
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ColorField
          name="atmosphereBg"
          label="Fundo"
          field="atmosphereBg"
          value={value}
          onChange={onChange}
        />
        <ColorField
          name="atmosphereGlow"
          label="Brilho"
          field="atmosphereGlow"
          value={value}
          onChange={onChange}
        />
        <ColorField
          name="atmosphereText"
          label="Texto"
          field="atmosphereText"
          value={value}
          onChange={onChange}
        />
        <label className="flex items-end gap-2 pb-2 text-xs text-[#4A4440]">
          <input
            name="isLightTheme"
            type="checkbox"
            checked={value.isLightTheme}
            onChange={(event) =>
              onChange({ ...value, isLightTheme: event.target.checked })
            }
            className="h-4 w-4 accent-copper"
          />
          Tema claro
        </label>
      </div>
    </div>
  );
}
