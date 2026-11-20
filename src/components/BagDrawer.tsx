"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  Copy,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useBag } from "@/context/BagContext";
import { formatBRL } from "@/data/catalog";

export function BagDrawer() {
  const {
    items,
    isOpen,
    toastMessage,
    totalItems,
    subtotalInCents,
    closeBag,
    updateQuantity,
    removeItem,
    buildOrderSummaryText,
    registerCurrentOrder,
  } = useBag();

  const [customerName, setCustomerName] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopyOrder = async () => {
    void registerCurrentOrder(customerName);
    try {
      await navigator.clipboard.writeText(buildOrderSummaryText(customerName));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // Clipboard fallback ignored
    }
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    buildOrderSummaryText(customerName)
  )}`;

  return (
    <>
      {/* Subtle Bottom Toast Notification */}
      <AnimatePresence>
        {toastMessage && !isOpen && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed right-5 bottom-5 z-50 flex items-center gap-2.5 rounded-full bg-espresso px-5 py-3 text-xs font-medium text-cream shadow-xl"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-rosegold" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Slide-Over Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeBag}
              aria-hidden="true"
              className="fixed inset-0 z-50 bg-espresso/45 backdrop-blur-xs"
            />

            {/* Panel */}
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-label="Sacola de compras Maria's Store"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 32 }}
              className="fixed top-0 right-0 z-50 flex h-full w-full max-w-md flex-col border-l border-latte bg-cream text-espresso shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-latte px-6 py-5">
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="h-5 w-5 text-copper" strokeWidth={1.8} />
                  <h2 className="font-serif text-2xl font-semibold">
                    Sua Sacola
                  </h2>
                  <span className="tabular-price rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold text-mocha">
                    {totalItems} {totalItems === 1 ? "peça" : "peças"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={closeBag}
                  aria-label="Fechar sacola"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-latte text-mocha transition-colors hover:border-rosegold hover:text-espresso"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {items.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sand">
                      <ShoppingBag className="h-7 w-7 text-muted" strokeWidth={1.5} />
                    </div>
                    <p className="mt-4 font-serif text-2xl font-semibold text-espresso">
                      Sua sacola está vazia
                    </p>
                    <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-mocha">
                      Explore os tons e tamanhos na vitrine ou na passarela para montar seu look.
                    </p>
                    <button
                      type="button"
                      onClick={closeBag}
                      className="mt-6 cursor-pointer rounded-full bg-espresso px-6 py-3 text-xs font-semibold text-cream transition-transform hover:-translate-y-0.5"
                    >
                      Explorar peças
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-4">
                    {items.map((item) => (
                      <li
                        key={item.key}
                        className="flex gap-4 rounded-2xl border border-latte/90 bg-sand/40 p-3.5"
                      >
                        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-cream p-1.5">
                          <Image
                            src={item.cutoutImageUrl}
                            alt={`${item.productName} — ${item.colorName}`}
                            fill
                            sizes="80px"
                            className="object-contain"
                          />
                        </div>

                        <div className="flex flex-1 flex-col justify-between">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-serif text-lg leading-tight font-semibold text-espresso">
                                {item.productName}
                              </h3>
                              <div className="mt-1 flex items-center gap-2 text-xs text-mocha">
                                <span
                                  className="inline-block h-3 w-3 rounded-full border border-espresso/20"
                                  style={{ backgroundColor: item.swatchHex }}
                                />
                                <span>{item.colorName}</span>
                                <span>·</span>
                                <span>Tam. {item.sizeLabel}</span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeItem(item.key)}
                              aria-label={`Remover ${item.productName}`}
                              className="cursor-pointer p-1 text-muted transition-colors hover:text-espresso"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="inline-flex items-center rounded-full border border-latte bg-cream">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.key, -1)}
                                aria-label="Diminuir quantidade"
                                className="flex h-7 w-7 cursor-pointer items-center justify-center text-mocha hover:text-espresso"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="tabular-price min-w-6 text-center text-xs font-semibold">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.key, 1)}
                                aria-label="Aumentar quantidade"
                                className="flex h-7 w-7 cursor-pointer items-center justify-center text-mocha hover:text-espresso"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            <span className="tabular-price text-sm font-semibold text-espresso">
                              {formatBRL(item.unitPriceInCents * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer Checkout via WhatsApp */}
              {items.length > 0 && (
                <div className="border-t border-latte bg-sand/50 px-6 py-5">
                  <div className="mb-3.5">
                    <label
                      htmlFor="bag-customer-name"
                      className="block text-xs font-medium text-mocha"
                    >
                      Seu nome (opcional, para o atendimento no WhatsApp)
                    </label>
                    <input
                      id="bag-customer-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Ex.: Ana Clara"
                      className="mt-1.5 w-full rounded-xl border border-latte bg-cream px-3.5 py-2.5 text-sm text-espresso placeholder:text-muted/70 focus:border-rosegold"
                    />
                  </div>

                  <div className="flex items-baseline justify-between py-2">
                    <span className="text-xs font-medium text-mocha">
                      Subtotal estimado
                    </span>
                    <div className="text-right">
                      <span className="tabular-price font-serif text-2xl font-semibold text-espresso">
                        {formatBRL(subtotalInCents)}
                      </span>
                      <p className="tabular-price text-[11px] text-mocha">
                        ou {formatBRL(Math.round(subtotalInCents * 0.95))} no Pix
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-2.5">
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => void registerCurrentOrder(customerName)}
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-espresso px-6 py-3.5 text-sm font-semibold text-cream shadow-md transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                    >
                      <MessageCircle className="h-4 w-4" strokeWidth={1.9} />
                      <span>Enviar sacola pelo WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleCopyOrder}
                      className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-latte bg-cream px-5 py-2.5 text-xs font-semibold text-espresso transition-colors hover:border-rosegold"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-copper" />
                          <span>Resumo copiado para a área de transferência!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar resumo do pedido</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
