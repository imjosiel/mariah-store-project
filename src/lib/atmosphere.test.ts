import { describe, expect, it } from "vitest";

import { deriveAtmosphere } from "./atmosphere";

describe("deriveAtmosphere", () => {
  it("mantém tema claro para tons neutros e pastéis", () => {
    for (const hex of [
      "#E7DAC8", // areia
      "#EAE0D3", // pérola
      "#EAD8CC", // champagne
      "#E6DED2", // aveia
      "#F1E4D5",
      "#EAD6CA",
      "#E5DCCB", // pérola (swatch real no banco)
      "#C9AE8C", // areia natural
      "#C8967C", // champagne rose
      "#A99E8E", // aveia taupe
    ]) {
      const atmosphere = deriveAtmosphere(hex);
      expect(atmosphere.isLightTheme, hex).toBe(true);
      expect(atmosphere.atmosphereText, hex).toBe("#3B2316");
    }
  });

  it("gera fundo azul profundo para a camiseta azul", () => {
    const atmosphere = deriveAtmosphere("#123f9f");
    expect(atmosphere.isLightTheme).toBe(false);
    expect(atmosphere.atmosphereBg).toBe("#172645");
    expect(atmosphere.atmosphereText).toBe("#F4F7FA");
  });

  it("mantém tema escuro para tons saturados e médios", () => {
    for (const hex of ["#6C2E3B", "#C58F70", "#566B5B", "#A36A3E", "#B3684E", "#8FA189"]) {
      const atmosphere = deriveAtmosphere(hex);
      expect(atmosphere.isLightTheme, hex).toBe(false);
    }
  });

  it("usa o fallback claro para cor inválida", () => {
    expect(deriveAtmosphere("não é hex").isLightTheme).toBe(true);
  });
});
