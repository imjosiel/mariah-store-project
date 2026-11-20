"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  getStockServerSnapshot,
  getStockSnapshot,
  hydrateStockLevels,
  subscribeStock,
} from "./stockStore";

export function useStockLevels() {
  const levels = useSyncExternalStore(
    subscribeStock,
    getStockSnapshot,
    getStockServerSnapshot
  );

  // O banco é a fonte da verdade na Fase 2; o localStorage é só cache de render.
  useEffect(() => {
    let active = true;
    fetch("/api/stock")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { levels?: Record<string, number> } | null) => {
        if (active && data?.levels) hydrateStockLevels(data.levels);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return levels;
}
