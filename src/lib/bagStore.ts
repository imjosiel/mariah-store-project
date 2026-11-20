import type { BagItem } from "@/types/store";

/**
 * Store externo da sacola, consumido via useSyncExternalStore.
 * Evita setState dentro de useEffect e é hydration-safe no App Router:
 * o servidor usa getServerSnapshot (vazio) e o cliente troca para o
 * snapshot real depois da hidratação.
 */

const STORAGE_KEY = "marias-store:bag:v1";
const CODE_KEY = "marias-store:order-code:v1";
const EMPTY: readonly BagItem[] = [];

let snapshot: readonly BagItem[] = EMPTY;
let initialized = false;
let currentOrderCode: string | null = null;
const listeners = new Set<() => void>();

function read(): readonly BagItem[] {
  if (!initialized) {
    initialized = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed)) snapshot = parsed as BagItem[];
    } catch {
      snapshot = EMPTY;
    }
  }
  return snapshot;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    initialized = false;
    snapshot = read();
    listeners.forEach((listener) => listener());
  });
}

export function getSnapshot(): readonly BagItem[] {
  return read();
}

export function getServerSnapshot(): readonly BagItem[] {
  return EMPTY;
}

export function updateBag(
  updater: BagItem[] | ((prev: BagItem[]) => BagItem[])
): void {
  const prev = read() as BagItem[];
  snapshot = typeof updater === "function" ? updater(prev) : updater;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignora cota cheia / modo privado.
  }

  listeners.forEach((listener) => listener());
}

/**
 * Código único da sacola. Antes era derivado do subtotal — duas sacolas
 * iguais geravam o mesmo código. Ver docs/07, seção 5.
 */
export function getOrderCode(): string {
  if (currentOrderCode) return currentOrderCode;

  if (typeof window !== "undefined") {
    try {
      const saved = window.localStorage.getItem(CODE_KEY);
      if (saved) {
        currentOrderCode = saved;
        return saved;
      }
    } catch {
      // segue para gerar um novo
    }
  }

  const random = new Uint32Array(1);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(random);
  }
  currentOrderCode = `MS-${String((random[0] % 9000) + 1000)}`;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(CODE_KEY, currentOrderCode);
    } catch {
      // ignora
    }
  }

  return currentOrderCode;
}

export function clearBag(): void {
  updateBag([]);
  currentOrderCode = null;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(CODE_KEY);
    } catch {
      // ignora
    }
  }
}
