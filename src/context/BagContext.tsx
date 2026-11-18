"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { BagItem, Product, ProductVariant } from "@/types/store";
import { formatBRL } from "@/data/catalog";

interface BagContextValue {
  items: BagItem[];
  isOpen: boolean;
  toastMessage: string | null;
  totalItems: number;
  subtotalInCents: number;
  openBag: () => void;
  closeBag: () => void;
  addItem: (product: Product, variant: ProductVariant, sizeLabel: string) => void;
  updateQuantity: (key: string, delta: number) => void;
  removeItem: (key: string) => void;
  clearBag: () => void;
  buildOrderSummaryText: (customerName?: string) => string;
}

const BagContext = createContext<BagContextValue | undefined>(undefined);

const STORAGE_KEY = "marias-store:bag:v1";

export function BagProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<BagItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setItems(parsed);
        }
      }
    } catch {
      // Ignore invalid localStorage state
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota issues
    }
  }, [items, hydrated]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const addItem = (product: Product, variant: ProductVariant, sizeLabel: string) => {
    const key = `${product.id}:${variant.id}:${sizeLabel}`;
    setItems((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          productSlug: product.slug,
          productName: product.name,
          variantId: variant.id,
          colorName: variant.colorName,
          swatchHex: variant.swatchHex,
          cutoutImageUrl: variant.cutoutImageUrl,
          sizeLabel,
          unitPriceInCents: product.priceInCents,
          quantity: 1,
        },
      ];
    });
    showToast(`${product.name} (${variant.colorName} · ${sizeLabel}) na sacola`);
    setIsOpen(true);
  };

  const updateQuantity = (key: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((item) => item.key !== key));
  };

  const clearBag = () => setItems([]);

  const totalItems = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  const subtotalInCents = useMemo(
    () => items.reduce((acc, item) => acc + item.unitPriceInCents * item.quantity, 0),
    [items]
  );

  const buildOrderSummaryText = (customerName?: string) => {
    const refCode = `MS-${String((subtotalInCents / 100 + totalItems * 37) % 9000 + 1000).slice(0, 4)}`;
    const greeting = customerName?.trim()
      ? `Olá, Maria's Store! Sou *${customerName.trim()}* e gostaria de finalizar minha sacola (*#${refCode}*):`
      : `Olá, Maria's Store! Gostaria de finalizar minha sacola (*#${refCode}*):`;

    const lines = items.map(
      (item, idx) =>
        `${idx + 1}. *${item.productName}* — Cor: ${item.colorName} | Tam: *${item.sizeLabel}* | Qtd: ${item.quantity} (${formatBRL(
          item.unitPriceInCents * item.quantity
        )})`
    );

    return [
      greeting,
      "",
      ...lines,
      "",
      `*Total da sacola:* ${formatBRL(subtotalInCents)}`,
      "Podemos confirmar a disponibilidade e o envio?",
    ].join("\n");
  };

  const value: BagContextValue = {
    items,
    isOpen,
    toastMessage,
    totalItems,
    subtotalInCents,
    openBag: () => setIsOpen(true),
    closeBag: () => setIsOpen(false),
    addItem,
    updateQuantity,
    removeItem,
    clearBag,
    buildOrderSummaryText,
  };

  return <BagContext.Provider value={value}>{children}</BagContext.Provider>;
}

export function useBag() {
  const ctx = useContext(BagContext);
  if (!ctx) {
    throw new Error("useBag must be used within BagProvider");
  }
  return ctx;
}
