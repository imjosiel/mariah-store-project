"use client";

import { useMemo, useState } from "react";
import {
  Check,
  CheckCheck,
  CircleDollarSign,
  FileDown,
  RotateCcw,
  Search,
  Truck,
  X,
} from "lucide-react";

import { formatBRL } from "@/lib/money";
import { ordersToCsv } from "@/domain/report";
import type { FulfillmentStatus } from "@/domain/order-status";
import {
  cancelOrderAction,
  confirmOrderAction,
  markOrderDeliveredAction,
  markOrderPaidAction,
  markOrderShippedAction,
  registerPostSaleAction,
  setNfNumberAction,
  setOrderSaleInfoAction,
} from "@/order-actions";
import type { OrderView } from "@/lib/orderStore";
import { PANEL } from "@/components/admin/AdminShell";

const COMMISSION_LABEL = {
  PENDING: "Aguardando prazo",
  PAYABLE: "A receber",
  PAID: "Pago",
  REVERSED: "Revertido",
};

const ORDER_STATUS_LABEL: Record<FulfillmentStatus, string> = {
  DRAFT_BAG: "Rascunho",
  SENT_TO_WHATSAPP: "Aguardando confirmação",
  CONFIRMED: "Confirmado",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  RETURNED: "Trocado / devolvido",
  CANCELLED: "Cancelado",
};

const POST_SALE_LABEL = {
  TROCA: "Troca",
  DEVOLUCAO: "Devolução",
  DEFEITO: "Defeito",
} as const;

type PostSaleType = keyof typeof POST_SALE_LABEL;

const PAGE_SIZE = 10;
const DAY_MS = 86_400_000;

const CHANNEL_LABEL = { ONLINE: "Online", LOJA: "Loja física" } as const;
const PAYMENT_LABEL = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão",
  GATEWAY: "Gateway",
  OUTRO: "Outro",
} as const;

type Channel = keyof typeof CHANNEL_LABEL;
type Payment = keyof typeof PAYMENT_LABEL;

function OrderStatusPill({ status }: { status: FulfillmentStatus }) {
  const tone =
    status === "DELIVERED"
      ? "border-[#3F8A64]/50 bg-[#3F8A64]/10 text-[#2E6B4C]"
      : status === "SHIPPED"
        ? "border-[#3D6E9E]/50 bg-[#3D6E9E]/10 text-[#31577E]"
        : status === "CONFIRMED"
          ? "border-[#C0563E]/40 bg-[#C0563E]/10 text-[#A8432F]"
          : status === "CANCELLED" || status === "RETURNED"
            ? "border-[#8E7FA8]/50 bg-[#8E7FA8]/10 text-[#6E5F88]"
            : "border-[#D9923F]/50 bg-[#D9923F]/10 text-[#A66B23]";

  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${tone}`}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

function CommissionPill({ order }: { order: OrderView }) {
  if (!order.confirmedAt) return null;
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
      Comissão: {COMMISSION_LABEL[order.commissionStatus]}
    </span>
  );
}

export function PedidosClient({ orders }: { orders: OrderView[] }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | FulfillmentStatus>("ALL");
  const [period, setPeriod] = useState<"ALL" | "7" | "30">("ALL");
  const [page, setPage] = useState(0);
  const [cancelingCode, setCancelingCode] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [editingSaleCode, setEditingSaleCode] = useState<string | null>(null);
  const [saleChannel, setSaleChannel] = useState<Channel>("ONLINE");
  const [salePayment, setSalePayment] = useState<Payment | "">("");
  const [postSaleCode, setPostSaleCode] = useState<string | null>(null);
  const [postSaleType, setPostSaleType] = useState<PostSaleType>("TROCA");
  const [postReason, setPostReason] = useState("");
  const [postRestock, setPostRestock] = useState(true);
  const [postRefunded, setPostRefunded] = useState(false);
  const [postCommission, setPostCommission] = useState(false);

  // Referência estável: o pedido mais recente da própria lista, em vez de Date.now().
  const newestOrderTime = useMemo(
    () => orders.reduce((max, order) => Math.max(max, new Date(order.createdAt).getTime()), 0),
    [orders]
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== "ALL" && order.status !== statusFilter) return false;
      if (
        period !== "ALL" &&
        newestOrderTime - new Date(order.createdAt).getTime() > Number(period) * DAY_MS
      ) {
        return false;
      }
      if (!term) return true;
      return (
        order.code.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term) ||
        order.items.some((item) => item.productName.toLowerCase().includes(term))
      );
    });
  }, [orders, query, statusFilter, period, newestOrderTime]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const handleExport = () => {
    if (filtered.length === 0) return;
    const csv = ordersToCsv(
      filtered.map((order) => ({
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
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E4DED8] bg-white px-4 py-2 text-[11px] font-semibold text-[#4A4440] transition-colors hover:border-rosegold hover:text-[#141210] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileDown className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
          <span className="tabular-price text-xs font-semibold text-[#4A4440]">
            {filtered.length} {filtered.length === 1 ? "pedido" : "pedidos"}
          </span>
        </div>
      </div>

      <div className={`${PANEL} flex flex-wrap items-center gap-3 p-4`}>
        <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#E4DED8] bg-white px-3 py-2">
          <Search className="h-4 w-4 text-[#6E6660]" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            placeholder="Buscar por código, cliente ou peça"
            className="w-full bg-transparent text-sm text-[#141210] outline-none placeholder:text-[#9A918B]"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as "ALL" | FulfillmentStatus);
            setPage(0);
          }}
          aria-label="Filtrar por situação"
          className="rounded-xl border border-[#E4DED8] bg-white px-3 py-2 text-xs font-semibold text-[#4A4440]"
        >
          <option value="ALL">Todas as situações</option>
          {(Object.keys(ORDER_STATUS_LABEL) as FulfillmentStatus[]).map((status) => (
            <option key={status} value={status}>
              {ORDER_STATUS_LABEL[status]}
            </option>
          ))}
        </select>
        <select
          value={period}
          onChange={(event) => {
            setPeriod(event.target.value as "ALL" | "7" | "30");
            setPage(0);
          }}
          aria-label="Filtrar por período"
          className="rounded-xl border border-[#E4DED8] bg-white px-3 py-2 text-xs font-semibold text-[#4A4440]"
        >
          <option value="ALL">Qualquer período</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
        </select>
      </div>

      <div className={`${PANEL} p-5 sm:p-6`}>
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#E4DED8] bg-[#F7F4F1] px-6 py-14 text-center">
            <p className="font-serif text-2xl">Nenhum pedido encontrado</p>
            <p className="mt-2 text-xs text-[#4A4440]">
              Ajuste a busca ou os filtros para ver outros pedidos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((order) => (
              <article
                key={order.code}
                className="rounded-2xl border border-[#EDE3D8] bg-[#FCFAF8] p-4 transition-colors hover:border-rosegold/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="tabular-price font-serif text-xl font-semibold">
                      #{order.code}
                    </h2>
                    <OrderStatusPill status={order.status} />
                    <CommissionPill order={order} />
                    <span className="text-[11px] text-[#6E6660]">
                      {new Date(order.createdAt).toLocaleString("pt-BR")}
                      {order.customerName ? ` · ${order.customerName}` : ""}
                    </span>
                  </div>
                  <div className="flex w-full flex-wrap items-center gap-2 text-[10px] text-[#6E6660]">
                    <span className="rounded-full bg-[#F1ECE7] px-2 py-0.5 font-semibold">
                      {CHANNEL_LABEL[order.channel]}
                    </span>
                    {order.paymentMethod && (
                      <span className="rounded-full bg-[#F1ECE7] px-2 py-0.5 font-semibold">
                        {PAYMENT_LABEL[order.paymentMethod]}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSaleCode(order.code);
                        setSaleChannel(order.channel);
                        setSalePayment(order.paymentMethod ?? "");
                      }}
                      className="cursor-pointer font-semibold text-copper underline"
                    >
                      classificar venda
                    </button>
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

                {order.confirmedAt && (
                  <p
                    className={`mt-2 text-[10px] ${order.stockShortfalls.length ? "font-semibold text-copper" : "text-[#6E6660]"}`}
                  >
                    {order.stockShortfalls.length
                      ? `Estoque insuficiente: ${order.stockShortfalls.join(" · ")}`
                      : order.stockRestored
                        ? "Estoque devolvido no cancelamento"
                        : "Estoque baixado na confirmação"}
                  </p>
                )}

                {(order.shippedAt || order.deliveredAt || order.cancelReason) && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-[#6E6660]">
                    {order.shippedAt && (
                      <span>Enviado em {new Date(order.shippedAt).toLocaleString("pt-BR")}</span>
                    )}
                    {order.deliveredAt && (
                      <span>Entregue em {new Date(order.deliveredAt).toLocaleString("pt-BR")}</span>
                    )}
                    {order.cancelReason && <span>Motivo: {order.cancelReason}</span>}
                  </div>
                )}

                {order.postSales.length > 0 && (
                  <div className="mt-2 rounded-xl border border-[#E4DED8] bg-white p-3 text-[10px] text-[#6E6660]">
                    <p className="font-semibold text-[#141210]">
                      {POST_SALE_LABEL[order.postSales[0].type]} · {order.postSales[0].reason}
                    </p>
                    <p className="mt-0.5">
                      Autorizado por {order.postSales[0].authorizedByEmail}
                      {order.postSales[0].restock ? " · estoque devolvido" : ""}
                      {order.postSales[0].refunded ? " · valor estornado" : ""}
                      {order.postSales[0].commissionReversed ? " · comissão revertida" : ""}
                    </p>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#EDE3D8] pt-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
                      Sua comissão
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
                    {order.status === "SENT_TO_WHATSAPP" && (
                      <button
                        type="button"
                        onClick={() => void confirmOrderAction(order.code)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-[#161311] px-4 py-2 text-[11px] font-semibold text-cream transition-transform hover:-translate-y-0.5"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Confirmar pedido
                      </button>
                    )}
                    {order.status === "CONFIRMED" && (
                      <button
                        type="button"
                        onClick={() => void markOrderShippedAction(order.code)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#3D6E9E]/60 px-4 py-2 text-[11px] font-semibold text-[#31577E] transition-colors hover:bg-[#3D6E9E]/10"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        Marcar enviado
                      </button>
                    )}
                    {order.status === "SHIPPED" && (
                      <button
                        type="button"
                        onClick={() => void markOrderDeliveredAction(order.code)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#3F8A64]/60 px-4 py-2 text-[11px] font-semibold text-[#2E6B4C] transition-colors hover:bg-[#3F8A64]/10"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Marcar entregue
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
                    {order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
                      <button
                        type="button"
                        onClick={() => {
                          setCancelingCode(order.code);
                          setCancelReason("");
                        }}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E4DED8] px-4 py-2 text-[11px] font-semibold text-[#4A4440] transition-colors hover:border-[#A8432F] hover:text-[#A8432F]"
                      >
                        {order.confirmedAt ? (
                          <RotateCcw className="h-3.5 w-3.5" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                        Cancelar
                      </button>
                    )}
                    {order.confirmedAt &&
                      order.status !== "CANCELLED" &&
                      order.status !== "RETURNED" && (
                        <button
                          type="button"
                          onClick={() => {
                            setPostSaleCode(order.code);
                            setPostSaleType("TROCA");
                            setPostReason("");
                            setPostRestock(true);
                            setPostRefunded(false);
                            setPostCommission(false);
                          }}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E4DED8] px-4 py-2 text-[11px] font-semibold text-[#4A4440] transition-colors hover:border-[#A8432F] hover:text-[#A8432F]"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Troca / devolução
                        </button>
                      )}
                  </div>
                </div>

                {editingSaleCode === order.code && (
                  <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-[#E4DED8] bg-white p-3">
                    <label className="block">
                      <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
                        Canal
                      </span>
                      <select
                        value={saleChannel}
                        onChange={(event) => setSaleChannel(event.target.value as Channel)}
                        className="mt-1 rounded-xl border border-[#E4DED8] bg-white px-3 py-2 text-xs text-[#141210]"
                      >
                        {(Object.keys(CHANNEL_LABEL) as Channel[]).map((channel) => (
                          <option key={channel} value={channel}>
                            {CHANNEL_LABEL[channel]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
                        Pagamento
                      </span>
                      <select
                        value={salePayment}
                        onChange={(event) => setSalePayment(event.target.value as Payment | "")}
                        className="mt-1 rounded-xl border border-[#E4DED8] bg-white px-3 py-2 text-xs text-[#141210]"
                      >
                        <option value="">Não informado</option>
                        {(Object.keys(PAYMENT_LABEL) as Payment[]).map((payment) => (
                          <option key={payment} value={payment}>
                            {PAYMENT_LABEL[payment]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        void setOrderSaleInfoAction(order.code, saleChannel, salePayment || null);
                        setEditingSaleCode(null);
                      }}
                      className="cursor-pointer rounded-full bg-[#161311] px-4 py-2 text-[11px] font-semibold text-cream"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingSaleCode(null)}
                      className="cursor-pointer rounded-full border border-[#E4DED8] px-4 py-2 text-[11px] font-semibold text-[#4A4440]"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {postSaleCode === order.code && (
                  <div className="mt-3 space-y-3 rounded-xl border border-[#E4DED8] bg-white p-3">
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={postSaleType}
                        onChange={(event) => setPostSaleType(event.target.value as PostSaleType)}
                        className="rounded-xl border border-[#E4DED8] bg-white px-3 py-2 text-xs text-[#141210]"
                      >
                        {(Object.keys(POST_SALE_LABEL) as PostSaleType[]).map((item) => (
                          <option key={item} value={item}>
                            {POST_SALE_LABEL[item]}
                          </option>
                        ))}
                      </select>
                      <input
                        value={postReason}
                        onChange={(event) => setPostReason(event.target.value)}
                        placeholder="Motivo (obrigatório)"
                        className="min-w-[200px] flex-1 rounded-xl border border-[#E4DED8] px-3 py-2 text-xs text-[#141210] outline-none placeholder:text-[#9A918B] focus:border-rosegold"
                      />
                    </div>
                    <div className="flex flex-wrap gap-4 text-[11px] text-[#4A4440]">
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={postRestock}
                          onChange={(event) => setPostRestock(event.target.checked)}
                          className="h-4 w-4 accent-copper"
                        />
                        Peça voltou ao estoque
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={postRefunded}
                          onChange={(event) => setPostRefunded(event.target.checked)}
                          className="h-4 w-4 accent-copper"
                        />
                        Valor estornado
                      </label>
                      <label className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={postCommission}
                          onChange={(event) => setPostCommission(event.target.checked)}
                          className="h-4 w-4 accent-copper"
                        />
                        Reverter comissão
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={!postReason.trim()}
                        onClick={() => {
                          void registerPostSaleAction({
                            orderCode: order.code,
                            type: postSaleType,
                            reason: postReason,
                            restock: postRestock,
                            refunded: postRefunded,
                            commissionReversed: postCommission,
                          });
                          setPostSaleCode(null);
                        }}
                        className="cursor-pointer rounded-full bg-[#A8432F] px-4 py-2 text-[11px] font-semibold text-white disabled:opacity-40"
                      >
                        Registrar
                      </button>
                      <button
                        type="button"
                        onClick={() => setPostSaleCode(null)}
                        className="cursor-pointer rounded-full border border-[#E4DED8] px-4 py-2 text-[11px] font-semibold text-[#4A4440]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {cancelingCode === order.code && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#E4DED8] bg-white p-3">
                    <input
                      value={cancelReason}
                      onChange={(event) => setCancelReason(event.target.value)}
                      placeholder="Motivo do cancelamento (opcional)"
                      className="min-w-[200px] flex-1 rounded-xl border border-[#E4DED8] px-3 py-2 text-xs text-[#141210] outline-none placeholder:text-[#9A918B] focus:border-rosegold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void cancelOrderAction(order.code, cancelReason);
                        setCancelingCode(null);
                      }}
                      className="cursor-pointer rounded-full bg-[#A8432F] px-4 py-2 text-[11px] font-semibold text-white"
                    >
                      Confirmar cancelamento
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelingCode(null)}
                      className="cursor-pointer rounded-full border border-[#E4DED8] px-4 py-2 text-[11px] font-semibold text-[#4A4440]"
                    >
                      Voltar
                    </button>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#EDE3D8] pt-4">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="cursor-pointer rounded-full border border-[#E4DED8] px-4 py-2 text-[11px] font-semibold text-[#4A4440] disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="tabular-price text-[11px] text-[#6E6660]">
              Página {safePage + 1} de {pages}
            </span>
            <button
              type="button"
              disabled={safePage >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="cursor-pointer rounded-full border border-[#E4DED8] px-4 py-2 text-[11px] font-semibold text-[#4A4440] disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
