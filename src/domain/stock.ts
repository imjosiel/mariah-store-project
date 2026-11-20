/**
 * Baixa de estoque — regra pura, sem React/localStorage/Prisma.
 * Idempotente por código de pedido e nunca produz estoque negativo.
 */

export interface StockLine {
  variantId: string;
  sizeLabel: string;
  quantity: number;
}

export interface StockShortfall {
  variantId: string;
  sizeLabel: string;
  missing: number;
}

export interface StockState {
  levels: Record<string, number>;
  deductedOrders: string[];
}

export interface StockCandidate {
  id: string;
  stocks: ReadonlyArray<{ sizeLabel: string; stock: number }>;
}

export function stockKey(variantId: string, sizeLabel: string): string {
  return `${variantId}:${sizeLabel}`;
}

/** Nível atual de estoque, com fallback para o valor estático do catálogo. */
export function liveStock(
  levels: Readonly<Record<string, number>>,
  variantId: string,
  sizeLabel: string,
  fallback: number
): number {
  const value = levels[stockKey(variantId, sizeLabel)];
  return typeof value === "number" ? value : fallback;
}

export function buildInitialStock(
  variants: readonly StockCandidate[]
): Record<string, number> {
  const levels: Record<string, number> = {};
  for (const variant of variants) {
    for (const stock of variant.stocks) {
      levels[stockKey(variant.id, stock.sizeLabel)] = stock.stock;
    }
  }
  return levels;
}

export function applyOrderToStock(
  current: StockState,
  orderCode: string,
  lines: readonly StockLine[]
): { state: StockState; shortfalls: StockShortfall[] } {
  if (current.deductedOrders.includes(orderCode)) {
    return { state: current, shortfalls: [] };
  }

  const levels = { ...current.levels };
  const shortfalls: StockShortfall[] = [];

  for (const line of lines) {
    const key = stockKey(line.variantId, line.sizeLabel);
    const available = Math.max(0, levels[key] ?? 0);
    const deducted = Math.min(available, Math.max(0, line.quantity));
    levels[key] = available - deducted;

    const missing = line.quantity - deducted;
    if (missing > 0) {
      shortfalls.push({
        variantId: line.variantId,
        sizeLabel: line.sizeLabel,
        missing,
      });
    }
  }

  return {
    state: { levels, deductedOrders: [...current.deductedOrders, orderCode] },
    shortfalls,
  };
}
