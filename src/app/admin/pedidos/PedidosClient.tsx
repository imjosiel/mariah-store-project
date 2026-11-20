"use client";

import {
  Check,
  CircleDollarSign,
  FileDown,
  RotateCcw,
  X,
} from "lucide-react";

import { formatBRL } from "@/data/catalog";
import { ordersToCsv } from "@/domain/report";
import {
  cancelOrderAction,
  confirmOrderAction,
  markOrderPaidAction,
  setNfNumberAction,
} from "@/order-actions";
import type { OrderView } from "@/lib/orderStore";
import { PANEL } from "@/components/admin/AdminShell";

const STATUS_LABEL = {
  PENDING: "Aguardando prazo",
  PAYABLE: "A receber",
  PAID: "Pago",
  REVERSED: "Revertido",
};

const ORDER_STATUS_LABEL = {
  DRAFT_BAG: "Rascunho",
  SENT_TO_WHATSAPP: "Enviado no WhatsApp",
  CONFIRMED: "Confirmado",
  SHIPPED: "Enviado",
  CANCELLED: "Cancelado",
};

function StatusPill({ order }: { order: OrderView }) {
  if (!order.confirmedAt) {
    return (
      <span className="rounded-full border border-[#D9923F]/50 bg-[#D9923F]/10 px-3 py-1 text-[11px] font-semibold text-[#A66B23]">
        Aguardando confirmação
      </span>
    );
  }

  const tone =
    order.commissionStatus === "PAYABLE"
      ? "border-[#C0563E]/40 bg-[#C0563E]/10 text-[#A8432F]"
      : order.commissionStatus === "PAID"
        ? "border-[#3F8A64]/50 bg-[#3F8A64]/10 text-[#2E6B4C]"
        : order.commissionStatus === "REVERSED"
          ? "border-[#8E7FA8]/50 bg-[#8E7FA8]/10 text-[#6E5F88]"
          : "border-[#D9923F]/50 bg-[#D9923F]/10 text-[#A66B23]";

  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${tone}`}>
      {STATUS_LABEL[order.commissionStatus]}
    </span>
  );
}

export function PedidosClient({ orders }: { orders: OrderView[] }) {
  const handleExport = () => {
    if (orders.length === 0) return;
    const csv = ordersToCsv(
      orders.map((order) => ({
        code: order.code,
        createdAt: order.createdAt,
        customerName: order.customerName,
        totalInCents: order.totalInCents,
        costInCents: order.costInCents,
        marginInCents: order.marginInCents,
        commissionInCents: order.commissionInCents,
        commissionStatus: order.commissionStatus,
        orderStatus: order.status,
        nfNumber: order.nfNumber,
        itemsLabel: order.items.map((item) => `${item.quantity}x ${item.productName}`).join(", "),
      }))
    );

    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `marias-store-pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className={`${PANEL} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-copper uppercase">
            Maria&apos;s Store · Admin
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold">Pedidos</h1>
          <p className="mt-0.5 text-[11px] text-[#6E6660]">
            Confirme para calcular a comissão e baixar o estoque.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={orders.length === 0}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E4DED8] bg-white px-4 py-2 text-[11px] font-semibold text-[#4A4440] transition-colors hover:border-rosegold hover:text-[#141210] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileDown className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
          <span className="tabular-price text-xs font-semibold text-[#4A4440]">
            {orders.length} {orders.length === 1 ? "pedido" : "pedidos"}
          </span>
        </div>
      </div>

      <div className={`${PANEL} p-5 sm:p-6`}>
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E4DED8] bg-[#F7F4F1] px-6 py-14 text-center">
            <p className="font-serif text-2xl">Nenhum pedido ainda</p>
            <p className="mt-2 text-xs text-[#4A4440]">
              Eles aparecem aqui quando a sacola é enviada pelo WhatsApp.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <article
                key={order.code}
                className="rounded-2xl border border-[#EDE3D8] bg-[#FCFAF8] p-4 transition-colors hover:border-rosegold/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="tabular-price font-serif text-xl font-semibold">
                      #{order.code}
                    </h2>
                    <StatusPill order={order} />
                    <span className="text-[11px] text-[#6E6660]">
                      {new Date(order.createdAt).toLocaleString("pt-BR")}
                      {order.customerName ? ` · ${order.customerName}` : ""}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="tabular-price font-serif text-xl font-semibold">
                      {formatBRL(order.totalInCents)}
                    </p>
                    <p className="tabular-price text-[11px] text-[#4A4440]">
                      margem {formatBRL(order.marginInCents)}
                    </p>
                  </div>
                </div>

                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-[#EDE3D8] pt-3 text-[11px] text-[#4A4440]">
                  {order.items.map((item) => (
                    <li key={item.key}>
                      {item.quantity}× {item.productName} · {item.colorName} · Tam.{" "}
                      {item.sizeLabel}
                    </li>
                  ))}
                </ul>

                {!!order.confirmedAt && (
                  <p
                    className={`mt-2 text-[10px] ${order.stockShortfalls.length ? "font-semibold text-copper" : "text-[#6E6660]"}`}
                  >
                    {order.stockShortfalls.length
                      ? `Estoque insuficiente: ${order.stockShortfalls.join(" · ")}`
                      : "Estoque baixado na confirmação"}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#EDE3D8] pt-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
                      Sua comissão · {ORDER_STATUS_LABEL[order.status]}
                    </p>
                    <p className="tabular-price font-serif text-lg font-semibold text-copper">
                      {formatBRL(order.commissionInCents)}
                    </p>
                    {order.commissionAvailableAt && order.commissionStatus === "PENDING" && (
                      <p className="text-[10px] text-[#6E6660]">
                        libera em{" "}
                        {new Date(order.commissionAvailableAt).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>

                  <div className="min-w-[170px]">
                    <label
                      htmlFor={`nf-${order.code}`}
                      className="block text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase"
                    >
                      Nota fiscal (NFF)
                    </label>
                    <input
                      id={`nf-${order.code}`}
                      defaultValue={order.nfNumber}
                      onBlur={(event) =>
                        void setNfNumberAction(order.code, event.target.value)
                      }
                      placeholder="Ex.: NFC-e 000123"
                      className="tabular-price mt-1 w-full rounded-xl border border-[#E4DED8] bg-white px-3 py-1.5 text-xs text-[#141210] placeholder:text-[#6E6660]/70 focus:border-rosegold"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!order.confirmedAt && (
                      <button
                        type="button"
                        onClick={() => void confirmOrderAction(order.code)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#161311] px-4 py-2 text-[11px] font-semibold text-cream transition-transform hover:-translate-y-0.5"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Confirmar pedido
                      </button>
                    )}
                    {order.commissionStatus === "PAYABLE" && (
                      <button
                        type="button"
                        onClick={() => void markOrderPaidAction(order.code)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-copper/60 px-4 py-2 text-[11px] font-semibold text-copper transition-colors hover:bg-copper/10"
                      >
                        <CircleDollarSign className="h-3.5 w-3.5" />
                        Marcar pago
                      </button>
                    )}
                    {order.status !== "CANCELLED" && (
                      <button
                        type="button"
                        onClick={() => void cancelOrderAction(order.code)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E4DED8] px-4 py-2 text-[11px] font-semibold text-[#4A4440] transition-colors hover:border-muted hover:text-[#141210]"
                      >
                        {order.confirmedAt ? (
                          <RotateCcw className="h-3.5 w-3.5" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
