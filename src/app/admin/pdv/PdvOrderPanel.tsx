"use client";

import Image from "next/image";
import { Check, ShoppingBag, Trash2 } from "lucide-react";

import { formatBRL } from "@/lib/money";
import type { DiscountMode } from "@/domain/discount";
import { PANEL } from "@/components/admin/AdminShell";
import type { CartItem, Payment } from "./types";

const PAYMENT_LABEL: Record<Payment, string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão",
  OUTRO: "Outro",
};

const formatInputValue = (mode: DiscountMode, value: number) =>
  (value / 100).toFixed(2).replace(".", ",");

function DiscountInput({
  mode,
  value,
  onMode,
  onValue,
  label,
  compact = false,
}: {
  mode: DiscountMode;
  value: string;
  onMode: (mode: DiscountMode) => void;
  onValue: (value: string) => void;
  label: string;
  compact?: boolean;
}) {
  const button = (active: boolean) =>
    `cursor-pointer px-2 py-1 text-[10px] font-semibold ${
      active ? "bg-[#161311] text-white" : "bg-white text-[#4A4440]"
    }`;

  return (
    <div className="flex items-center gap-1">
      <div className="flex shrink-0 overflow-hidden rounded-lg border border-[#E4DED8] bg-white">
        <button type="button" onClick={() => onMode("BRL")} className={button(mode === "BRL")}>
          R$
        </button>
        <button type="button" onClick={() => onMode("PCT")} className={button(mode === "PCT")}>
          %
        </button>
      </div>
      <input
        value={value}
        onChange={(event) => onValue(event.target.value)}
        aria-label={label}
        placeholder="0,00"
        className={`tabular-price min-w-0 rounded-lg border border-[#E4DED8] bg-white text-right text-[11px] font-semibold text-[#141210] focus:border-rosegold ${
          compact ? "w-14 px-1.5 py-1" : "w-20 px-2 py-2"
        }`}
      />
    </div>
  );
}

export interface PdvSummary {
  itemsInCents: number;
  discountInCents: number;
  subtotalInCents: number;
  feesInCents: number;
  totalInCents: number;
}

export function PdvOrderPanel({
  cart,
  summary,
  payment,
  customerName,
  message,
  lastCode,
  saving,
  orderDiscountMode,
  orderDiscountValue,
  onPieceDiscount,
  onOrderDiscount,
  onRemove,
  onClear,
  onPayment,
  onCustomer,
  onSubmit,
}: {
  cart: CartItem[];
  summary: PdvSummary;
  payment: Payment;
  customerName: string;
  message: string;
  lastCode: string;
  saving: boolean;
  orderDiscountMode: DiscountMode;
  orderDiscountValue: string;
  onPieceDiscount: (key: string, mode: DiscountMode, value: string) => void;
  onOrderDiscount: (mode: DiscountMode, value: string) => void;
  onRemove: (key: string) => void;
  onClear: () => void;
  onPayment: (payment: Payment) => void;
  onCustomer: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <aside className={`${PANEL} flex w-full flex-col p-5 lg:w-80`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-xl font-semibold">Seu pedido</h2>
          <p className="mt-0.5 text-[11px] text-[#6E6660]">
            {cart.length === 0
              ? "Toque nas peças à esquerda"
              : `${cart.reduce((sum, item) => sum + item.quantity, 0)} item(ns)`}
          </p>
        </div>
        {cart.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="cursor-pointer text-[10px] font-semibold text-[#A8432F] underline"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-2 lg:max-h-[46vh] lg:overflow-y-auto">
        {cart.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E4DED8] px-4 py-10 text-center text-[11px] text-[#6E6660]">
            Nenhum item ainda.
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.key}
              className="rounded-xl border border-[#EDE3D8] bg-[#FDFAF8] p-2.5"
            >
              <div className="flex items-start gap-2.5">
                <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-[#F7F4F1]">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      sizes="48px"
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <span
                      className="block h-full w-full"
                      style={{ backgroundColor: item.swatchHex }}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-[#141210]">
                    {item.productName}
                  </p>
                  <p className="text-[10px] text-[#6E6660]">
                    {item.colorName} · Tam. {item.sizeLabel}
                  </p>
                  <div className="mt-1.5">
                    <button
                      type="button"
                      onClick={() => onRemove(item.key)}
                      aria-label={`Remover ${item.productName}`}
                      className="cursor-pointer rounded-full p-1 text-[#9A918B] hover:text-[#A8432F]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <DiscountInput
                    mode={item.pieceDiscountMode}
                    value={formatInputValue(item.pieceDiscountMode, item.pieceDiscountValue)}
                    onMode={(mode) =>
                      onPieceDiscount(
                        item.key,
                        mode,
                        formatInputValue(mode, item.pieceDiscountValue)
                      )
                    }
                    onValue={(value) => onPieceDiscount(item.key, item.pieceDiscountMode, value)}
                    label={`Desconto de ${item.productName}`}
                    compact
                  />
                  <p className="tabular-price mt-1 text-[11px] font-semibold text-[#141210]">
                    {formatBRL(item.unitPriceInCents * item.quantity)}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 space-y-3 border-t border-[#EDE3D8] pt-4">
        <div>
          <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
            Desconto no pedido
          </span>
          <div className="mt-1.5">
            <DiscountInput
              mode={orderDiscountMode}
              value={orderDiscountValue}
              onMode={(mode) => onOrderDiscount(mode, orderDiscountValue)}
              onValue={(value) => onOrderDiscount(orderDiscountMode, value)}
              label="Desconto no pedido"
            />
          </div>
        </div>

        <label className="block">
          <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
            Cliente (opcional)
          </span>
          <input
            value={customerName}
            onChange={(event) => onCustomer(event.target.value)}
            placeholder="Nome da cliente"
            className="mt-1 w-full rounded-xl border border-[#E4DED8] bg-white px-3 py-2 text-xs text-[#141210] placeholder:text-[#9A918B] focus:border-rosegold"
          />
        </label>

        <div>
          <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
            Pagamento
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {(Object.keys(PAYMENT_LABEL) as Payment[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onPayment(item)}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                  payment === item
                    ? "border-[#161311] bg-[#161311] text-white"
                    : "border-[#E4DED8] bg-white text-[#4A4440] hover:border-rosegold"
                }`}
              >
                {PAYMENT_LABEL[item]}
              </button>
            ))}
          </div>
        </div>

        <dl className="space-y-1.5 rounded-xl bg-[#FDFAF8] p-3 text-[11px]">
          <div className="flex justify-between text-[#4A4440]">
            <dt>Itens</dt>
            <dd className="tabular-price">{formatBRL(summary.itemsInCents)}</dd>
          </div>
          <div className="flex justify-between text-[#4A4440]">
            <dt>Desconto</dt>
            <dd className="tabular-price">− {formatBRL(summary.discountInCents)}</dd>
          </div>
          <div className="flex justify-between text-[#4A4440]">
            <dt>Subtotal</dt>
            <dd className="tabular-price">{formatBRL(summary.subtotalInCents)}</dd>
          </div>
          <div className="flex justify-between text-[#4A4440]">
            <dt title="Comissão, taxas do gateway, nota fiscal e impostos">Taxas</dt>
            <dd className="tabular-price">{formatBRL(summary.feesInCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-[#E4DED8] pt-2 text-sm font-semibold text-[#141210]">
            <dt>Total</dt>
            <dd className="tabular-price">{formatBRL(summary.totalInCents)}</dd>
          </div>
        </dl>

        {message && (
          <p
            className={`flex items-center gap-1.5 text-[11px] font-semibold ${lastCode ? "text-[#2E6B4C]" : "text-[#A8432F]"}`}
          >
            {lastCode && <Check className="h-3.5 w-3.5" />}
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={onSubmit}
          disabled={cart.length === 0 || saving}
          className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#161311] px-6 py-3 text-xs font-semibold text-cream transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShoppingBag className="h-4 w-4" />
          {saving ? "Registrando..." : "Registrar venda"}
        </button>
      </div>
    </aside>
  );
}
