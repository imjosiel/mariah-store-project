/**
 * Descontos do PDV — puro, sem React/Prisma/Next.
 * Valores percentuais são guardados em centésimos de % (1050 = 10,50%).
 */

export type DiscountMode = "BRL" | "PCT";

/** Preço efetivo de uma peça depois do desconto por peça. */
export function effectiveUnitPrice(
  listPriceInCents: number,
  mode: DiscountMode,
  value: number
): number {
  if (!Number.isFinite(value) || value < 0) return listPriceInCents;
  if (mode === "BRL") return Math.max(0, listPriceInCents - Math.round(value));
  const fraction = Math.min(10000, value) / 10000;
  return Math.max(0, Math.round(listPriceInCents * (1 - fraction)));
}

/** Quanto foi descontado de uma peça. */
export function discountAmount(
  listPriceInCents: number,
  mode: DiscountMode,
  value: number
): number {
  return Math.max(0, listPriceInCents - effectiveUnitPrice(listPriceInCents, mode, value));
}

/**
 * Rateia um desconto global entre os itens preservando a soma exata.
 * O último item absorve a sobra do arredondamento.
 */
export function allocateDiscount(
  items: ReadonlyArray<{ key: string; grossInCents: number }>,
  discountInCents: number
): Map<string, number> {
  const result = new Map<string, number>();
  const total = items.reduce((sum, item) => sum + item.grossInCents, 0);

  if (total <= 0 || discountInCents <= 0) {
    for (const item of items) result.set(item.key, item.grossInCents);
    return result;
  }

  const capped = Math.min(discountInCents, total);
  let remaining = capped;

  items.forEach((item, index) => {
    if (index === items.length - 1) {
      result.set(item.key, Math.max(0, item.grossInCents - remaining));
      return;
    }
    const share = Math.round((item.grossInCents / total) * capped);
    const applied = Math.min(share, item.grossInCents, remaining);
    result.set(item.key, item.grossInCents - applied);
    remaining -= applied;
  });

  return result;
}
