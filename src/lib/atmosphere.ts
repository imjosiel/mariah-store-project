/**
 * Deriva a atmosfera cromática da página a partir da cor da peça.
 * Segue o padrão do DESIGN.md: fundo escuro e saturado da mesma família
 * da peça, glow mais claro, texto com contraste AA.
 */

export interface Atmosphere {
  atmosphereBg: string;
  atmosphereGlow: string;
  atmosphereText: string;
  isLightTheme: boolean;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const clean = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-f]{6}$/i.test(clean)) return null;
  return [
    parseInt(clean.slice(0, 2), 16),
    parseInt(clean.slice(2, 4), 16),
    parseInt(clean.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b]
    .map(clamp)
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return [0, 0, l];

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case rn:
      h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
      break;
    case gn:
      h = ((bn - rn) / d + 2) / 6;
      break;
    default:
      h = ((rn - gn) / d + 4) / 6;
  }
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360 / 360;
  const saturation = Math.max(0, Math.min(1, s));
  const lightness = Math.max(0, Math.min(1, l));

  if (saturation === 0) {
    const v = Math.round(lightness * 255);
    return rgbToHex(v, v, v);
  }

  const q = lightness < 0.5
    ? lightness * (1 + saturation)
    : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  const channel = (t: number) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };

  return rgbToHex(
    channel(hue + 1 / 3) * 255,
    channel(hue) * 255,
    channel(hue - 1 / 3) * 255
  );
}

const FALLBACK: Atmosphere = {
  atmosphereBg: "#FAF3EB",
  atmosphereGlow: "#FFFDF9",
  atmosphereText: "#3B2316",
  isLightTheme: true,
};

/** Luminância relativa (WCAG) — diz se a cor é percebida como clara. */
function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Cor clara/pastel → fundo claro e texto escuro; demais → fundo escuro e texto claro. */
export function deriveAtmosphere(swatchHex: string): Atmosphere {
  const rgb = hexToRgb(swatchHex);
  if (!rgb) return FALLBACK;

  const [h, s, l] = rgbToHsl(...rgb);

  // Pérola, areia, champagne e aveia: tons percebidos como claros (WCAG) ou
  // neutros quentes de luminância média mantêm o tema claro. Só saturação
  // deixava esses escuros.
  const isWarmNeutral = h >= 10 && h <= 55;
  if (relativeLuminance(rgb) >= 0.55 || (l >= 0.6 && s <= 0.415 && isWarmNeutral)) {
    return {
      atmosphereBg: hslToHex(h, Math.min(0.28, s * 0.6), 0.94),
      atmosphereGlow: hslToHex(h, Math.min(0.22, s * 0.5), 0.985),
      atmosphereText: "#3B2316",
      isLightTheme: true,
    };
  }

  // Azuis e outras cores saturadas: fundo profundo da mesma família.
  const isBlue = h >= 190 && h <= 260 && s > 0.4;
  return {
    atmosphereBg: hslToHex(h, Math.min(0.5, Math.max(0.22, s * 0.65)), isBlue ? 0.18 : 0.2),
    atmosphereGlow: hslToHex(h, Math.min(0.55, Math.max(0.25, s * 0.7)), 0.36),
    atmosphereText: isBlue ? "#F4F7FA" : "#FAF3EB",
    isLightTheme: false,
  };
}
