import { PRODUCTS } from "@/data/catalog";
import {
  applyOrderToStock,
  buildInitialStock,
  liveStock,
  type StockLine,
  type StockShortfall,
  type StockState,
} from "@/domain/stock";

/**
 * Estado de estoque da Fase 1 (localStorage), semeado pelo catálogo mock.
 * Quando o Prisma entrar, este adaptador troca de backend; a regra em
 * src/domain/stock.ts continua a mesma.
 */

const STORAGE_KEY = "marias-store:stock:v1";
const INITIAL: StockState = Object.freeze({
  levels: buildInitialStock(PRODUCTS.flatMap((product) => product.variants)),
  deductedOrders: [],
});

let snapshot: StockState = INITIAL;
let initialized = false;
const listeners = new Set<() => void>();

function read(): StockState {
  if (!initialized) {
    initialized = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (
        parsed &&
        typeof parsed === "object" &&
        !Array.isArray(parsed) &&
        "levels" in parsed &&
        "deductedOrders" in parsed
      ) {
        const candidate = parsed as StockState;
        if (
          candidate.levels &&
          typeof candidate.levels === "object" &&
          Array.isArray(candidate.deductedOrders)
        ) {
          snapshot = candidate;
        }
      }
    } catch {
      snapshot = INITIAL;
    }
  }
  return snapshot;
}

function write(next: StockState): void {
  snapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignora cota cheia
  }
  listeners.forEach((listener) => listener());
}

export function subscribeStock(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getStockSnapshot(): StockState {
  return read();
}

export function getStockServerSnapshot(): StockState {
  return INITIAL;
}

export function getStockLevel(
  variantId: string,
  sizeLabel: string,
  fallback = 0
): number {
  return liveStock(read().levels, variantId, sizeLabel, fallback);
}

/** Chamada na confirmação do pedido. Idempotente por código. */
export function decrementStockForOrder(
  orderCode: string,
  lines: readonly StockLine[]
): StockShortfall[] {
  const result = applyOrderToStock(read(), orderCode, lines);
  if (result.state !== snapshot) write(result.state);
  return result.shortfalls;
}

/** Hidrata o estoque vindo do banco (Fase 2) no store do cliente. */
export function hydrateStockLevels(levels: Record<string, number>): void {
  const next: StockState = { levels, deductedOrders: [] };
  write(next);
}

export function resetStock(): void {
  write(INITIAL);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    initialized = false;
    snapshot = read();
    listeners.forEach((listener) => listener());
  });
}
