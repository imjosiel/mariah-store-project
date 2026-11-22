"use client";

import { useState } from "react";

import { formatBRL } from "@/lib/money";
import { reaisToCents } from "@/domain/money";
import type { FinancialSummary } from "@/domain/financial";
import type { FinancialEventView } from "@/lib/orderStore";
import { registerFinancialEventAction } from "@/order-actions";
import { PANEL } from "@/components/admin/AdminShell";

const TYPE_LABEL = {
  PAYMENT_RECEIVED: "Recebimento",
  COMMISSION_PAID: "Comissão paga",
  COMMISSION_REFUNDED: "Comissão estornada",
  ORDER_REFUNDED: "Venda estornada",
} as const;

type EventType = keyof typeof TYPE_LABEL;

const input =
  "mt-1 w-full rounded-xl border border-[#E4DED8] bg-white px-3 py-2 text-xs text-[#141210] placeholder:text-[#9A918B] focus:border-rosegold";

export function FinanceiroClient({
  summary,
  events,
  orders,
}: {
  summary: FinancialSummary;
  events: FinancialEventView[];
  orders: Array<{
    code: string;
    customerName: string;
    totalInCents: number;
    commissionInCents: number;
    commissionStatus: string;
  }>;
}) {
  const [type, setType] = useState<EventType>("COMMISSION_PAID");
  const [orderCode, setOrderCode] = useState("");
  const [amount, setAmount] = useState("");
  const [storeAmount, setStoreAmount] = useState("");
  const [fee, setFee] = useState("");
  const [note, setNote] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const amountInCents = reaisToCents(amount);
    if (amountInCents === null || amountInCents <= 0) {
      setMessage("Informe um valor válido.");
      return;
    }
    const optional = (value: string) => {
      const cents = value.trim() ? reaisToCents(value) : null;
      return cents;
    };
    setSaving(true);
    try {
      await registerFinancialEventAction({
        orderCode: orderCode || null,
        type,
        amountInCents,
        storeAmountInCents: optional(storeAmount),
        feeInCents: optional(fee) ?? 0,
        note: note || null,
        receiptUrl: receiptUrl || null,
      });
      setMessage("Registro salvo.");
      setAmount("");
      setStoreAmount("");
      setFee("");
      setNote("");
      setReceiptUrl("");
    } catch {
      setMessage("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const cards = [
    { label: "Recebido", value: summary.receivedInCents, hint: "Pagamentos registrados" },
    {
      label: "Sua comissão",
      value: summary.commissionNetInCents,
      hint: "Paga menos estornada",
    },
    { label: "Parte da loja", value: summary.storeNetInCents, hint: "Após estornos" },
    { label: "Taxas", value: summary.feesInCents, hint: "Fora da base da comissão" },
  ];

  return (
    <div className="space-y-4">
      <div className={`${PANEL} px-5 py-4`}>
        <p className="text-[10px] font-semibold tracking-[0.18em] text-copper uppercase">
          Maria&apos;s Store · Super admin
        </p>
        <h1 className="mt-1 font-serif text-2xl font-semibold">Financeiro</h1>
        <p className="mt-0.5 text-[11px] text-[#6E6660]">
          Repasses e estornos registrados. Hoje manuais; quando houver gateway, os eventos chegam
          automaticamente.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className={`${PANEL} p-5`}>
            <p className="text-[10px] font-semibold tracking-wider text-[#6E6660] uppercase">
              {card.label}
            </p>
            <p className="tabular-price mt-2 font-serif text-2xl font-semibold text-[#141210]">
              {formatBRL(card.value)}
            </p>
            <p className="mt-1 text-[10px] text-[#6E6660]">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className={`${PANEL} p-5 sm:p-6`}>
        <h2 className="font-serif text-xl font-semibold">Registrar evento</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Tipo
            </span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as EventType)}
              className={input}
            >
              {(Object.keys(TYPE_LABEL) as EventType[]).map((item) => (
                <option key={item} value={item}>
                  {TYPE_LABEL[item]}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Pedido (opcional)
            </span>
            <select
              value={orderCode}
              onChange={(event) => setOrderCode(event.target.value)}
              className={input}
            >
              <option value="">Nenhum</option>
              {orders.map((order) => (
                <option key={order.code} value={order.code}>
                  #{order.code} · {order.customerName || "sem nome"} · {formatBRL(order.totalInCents)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Valor (R$)
            </span>
            <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="19,40" className={input} />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Parte da loja (R$, opcional)
            </span>
            <input value={storeAmount} onChange={(event) => setStoreAmount(event.target.value)} inputMode="decimal" placeholder="176,60" className={input} />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Taxa (R$, opcional)
            </span>
            <input value={fee} onChange={(event) => setFee(event.target.value)} inputMode="decimal" placeholder="0,00" className={input} />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Comprovante (link, opcional)
            </span>
            <input value={receiptUrl} onChange={(event) => setReceiptUrl(event.target.value)} placeholder="https://..." className={input} />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Observação (opcional)
            </span>
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Repasse semanal" className={input} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className="cursor-pointer rounded-full bg-[#161311] px-5 py-2.5 text-xs font-semibold text-cream transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar evento"}
          </button>
          {message && (
            <span className="text-[11px] font-semibold text-[#A8432F]">{message}</span>
          )}
        </div>
      </div>

      <div className={`${PANEL} overflow-hidden`}>
        <div className="border-b border-[#EDE3D8] px-5 py-4">
          <h2 className="font-serif text-xl font-semibold">
            {events.length} {events.length === 1 ? "evento" : "eventos"}
          </h2>
        </div>
        {events.length === 0 ? (
          <p className="p-10 text-center text-sm text-[#6E6660]">
            Nenhum evento financeiro registrado.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#EDE3D8] bg-[#FDFAF8] text-[10px] font-semibold tracking-wider text-[#6E6660] uppercase">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Pedido</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-right">Taxa</th>
                <th className="px-4 py-3">Comprovante</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1ECE7]">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-2.5 text-[11px] text-[#6E6660]">
                    {new Date(event.occurredAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="tabular-price px-4 py-2.5 text-[11px] font-semibold">
                    {event.orderCode ? `#${event.orderCode}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-[11px] text-[#4A4440]">
                    {TYPE_LABEL[event.type]}
                    {event.note && (
                      <span className="block text-[10px] text-[#9A918B]">{event.note}</span>
                    )}
                  </td>
                  <td className="tabular-price px-4 py-2.5 text-right font-semibold text-[#141210]">
                    {formatBRL(event.amountInCents)}
                  </td>
                  <td className="tabular-price px-4 py-2.5 text-right text-[#6E6660]">
                    {formatBRL(event.feeInCents)}
                  </td>
                  <td className="px-4 py-2.5 text-[11px]">
                    {event.receiptUrl ? (
                      <a
                        href={event.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-copper underline"
                      >
                        Abrir
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
