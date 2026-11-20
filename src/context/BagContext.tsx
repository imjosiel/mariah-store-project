"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { BagItem, Product, ProductVariant } from "@/types/store";
import { formatBRL } from "@/data/catalog";
import {
  clearBag as clearBagStore,
  getOrderCode,
  getServerSnapshot,
  getSnapshot,
  subscribe,
  updateBag,
} from "@/lib/bagStore";
import { getStockLevel } from "@/lib/stockStore";
import { createOrderAction } from "@/order-actions";

interface BagContextValue {
  items: readonly BagItem[];
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
  registerCurrentOrder: (customerName?: string) => Promise<void>;
}

const BagContext = createContext<BagContextValue | undefined>(undefined);

export function BagProvider({ children }: { children: React.ReactNode }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isOpen, setIsOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const addItem = (product: Product, variant: ProductVariant, sizeLabel: string) => {
    const fallbackStock = variant.stocks.find((s) => s.sizeLabel === sizeLabel)?.stock ?? 0;
    if (getStockLevel(variant.id, sizeLabel, fallbackStock) <= 0) {
      showToast(`${product.name} (${sizeLabel}) está esgotado`);
      setIsOpen(true);
      return;
    }

    const key = `${product.id}:${variant.id}:${sizeLabel}`;
    updateBag((prev) => {
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
          // Custo definitivo é lido do banco na criação do pedido.
          unitCostInCents: product.costInCents,
          quantity: 1,
        },
      ];
    });
    showToast(`${product.name} (${variant.colorName} · ${sizeLabel}) na sacola`);
    setIsOpen(true);
  };

  const updateQuantity = (key: string, delta: number) => {
    updateBag((prev) =>
      prev
        .map((item) => {
          if (item.key !== key) return item;
          const cap = getStockLevel(
            item.variantId,
            item.sizeLabel,
            Math.max(item.quantity, 1)
          );
          return { ...item, quantity: Math.min(item.quantity + delta, cap) };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (key: string) => {
    updateBag((prev) => prev.filter((item) => item.key !== key));
  };

  const clearBag = () => clearBagStore();

  const totalItems = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  const subtotalInCents = useMemo(
    () => items.reduce((acc, item) => acc + item.unitPriceInCents * item.quantity, 0),
    [items]
  );

  const buildOrderSummaryText = (customerName?: string) => {
    const refCode = getOrderCode();
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

  const registerCurrentOrder = async (customerName?: string) => {
    if (items.length === 0) return;
    try {
      await createOrderAction(
        items,
        customerName ?? "",
        buildOrderSummaryText(customerName)
      );
    } catch {
      showToast("Não foi possível salvar o pedido no banco");
    }
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
    registerCurrentOrder,
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
