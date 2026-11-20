/** Converte a entrada de texto em reais para centavos, ou null se inválida. */
export function reaisToCents(raw: string): number | null {
  const cleaned = raw.replace(/[R$\s]/g, "").trim();
  if (!cleaned) return null;

  let normalized = cleaned;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  }

  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;

  return Math.round(value * 100);
}
