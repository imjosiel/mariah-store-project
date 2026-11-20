"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  CircleDollarSign,
  Clock3,
  FileDown,
  LayoutDashboard,
  RotateCcw,
  ShoppingBag,
  Store,
  UserPlus,
  X,
} from "lucide-react";

import { PRODUCTS, formatBRL } from "@/data/catalog";
import type { OrderView } from "@/lib/orderStore";
import {
  cancelOrderAction,
  confirmOrderAction,
  markOrderPaidAction,
  setNfNumberAction,
} from "@/order-actions";
import { ordersToCsv } from "@/domain/report";
import { signOutFromAdmin } from "@/auth-actions";
import {
  getStockServerSnapshot,
  getStockSnapshot,
  subscribeStock,
} from "@/lib/stockStore";

const GLASS =
  "rounded-[22px] border border-white/70 bg-white/55 shadow-[0_14px_45px_-24px_rgba(59,35,22,0.35)] backdrop-blur-xl";

const STATUS_LABEL: Record<OrderView["commissionStatus"], string> = {
  PENDING: "Aguardando prazo",
  PAYABLE: "A receber",
  PAID: "Pago",
  REVERSED: "Revertido",
};

const ORDER_STATUS_LABEL: Record<OrderView["status"], string> = {
  DRAFT_BAG: "Rascunho",
  SENT_TO_WHATSAPP: "Enviado no WhatsApp",
  CONFIRMED: "Confirmado",
  SHIPPED: "Enviado",
  CANCELLED: "Cancelado",
};

function displayStatus(order: OrderView): { label: string; tone: string } {
  if (!order.confirmedAt) {
    return {
      label: "Aguardando confirmação",
      tone: "border-latte bg-sand/70 text-mocha",
    };
  }
  switch (order.commissionStatus) {
    case "PAYABLE":
      return { label: STATUS_LABEL.PAYABLE, tone: "border-copper/40 bg-copper/10 text-copper" };
    case "PAID":
      return { label: STATUS_LABEL.PAID, tone: "border-rosegold/50 bg-rosegold/15 text-espresso" };
    case "REVERSED":
      return { label: STATUS_LABEL.REVERSED, tone: "border-muted/40 bg-muted/10 text-muted" };
    default:
      return { label: STATUS_LABEL.PENDING, tone: "border-latte bg-sand/70 text-mocha" };
  }
}

function StatusPill({ order }: { order: OrderView }) {
  const { label, tone } = displayStatus(order);
  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = false,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof ShoppingBag;
  accent?: boolean;
}) {
  return (
    <div className={`${GLASS} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-mocha uppercase">
          {label}
        </p>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
            accent ? "bg-copper/12 text-copper" : "bg-sand/70 text-mocha"
          }`}
        >
          <Icon className="h-4 w-4" strokeWidth={1.8} />
        </span>
      </div>
      <p
        className={`tabular-price mt-4 font-serif text-3xl font-semibold ${
          accent ? "text-copper" : "text-espresso"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-[11px] text-muted">{hint}</p>
    </div>
  );
}

function CommissionChart({ orders }: { orders: readonly OrderView[] }) {
  const days = useMemo(() => {
    // Referência determinística: a data do pedido mais recente (ou epoch se não houver pedidos).
    // Evita new Date() no render de Client Component durante o prerender.
    const timestamps = orders.map((order) => new Date(order.createdAt).getTime());
    const reference = new Date(timestamps.length ? Math.max(...timestamps) : 0);
    const buckets = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(reference);
      date.setDate(reference.getDate() - (6 - index));
      return {
        key: date.toDateString(),
        label: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
        value: 0,
      };
    });

    for (const order of orders) {
      const key = new Date(order.createdAt).toDateString();
      const bucket = buckets.find((item) => item.key === key);
      if (bucket) bucket.value += order.commissionInCents;
    }

    return buckets;
  }, [orders]);

  const max = Math.max(1, ...days.map((day) => day.value));

  return (
    <div className={`${GLASS} p-5 sm:p-6`}>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold">Comissões nos últimos 7 dias</h2>
          <p className="mt-0.5 text-[11px] text-muted">Valores calculados nos pedidos confirmados</p>
        </div>
        <span className="tabular-price text-xs font-semibold text-copper">
          {formatBRL(days.reduce((sum, day) => sum + day.value, 0))}
        </span>
      </div>

      <div className="mt-6 flex h-40 items-end gap-2 sm:gap-3">
        {days.map((day) => (
          <div key={day.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="tabular-price text-[10px] text-mocha">
              {day.value > 0 ? formatBRL(day.value) : ""}
            </span>
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-copper/45 to-rosegold transition-[height] duration-500"
                style={{ height: `${Math.max(day.value > 0 ? 8 : 2, (day.value / max) * 100)}%` }}
                title={`${day.label}: ${formatBRL(day.value)}`}
              />
            </div>
            <span className="text-[10px] font-medium text-muted capitalize">{day.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBreakdown({ orders }: { orders: readonly OrderView[] }) {
  const segments = [
    { label: "A receber", color: "#A86F50", count: orders.filter((o) => !o.confirmedAt || o.commissionStatus === "PENDING").length },
    { label: "Liberado", color: "#C58F70", count: orders.filter((o) => o.commissionStatus === "PAYABLE").length },
    { label: "Pago", color: "#6E4B3A", count: orders.filter((o) => o.commissionStatus === "PAID").length },
    { label: "Revertido", color: "#D9C7B6", count: orders.filter((o) => o.commissionStatus === "REVERSED").length },
  ];
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);
  let cursor = 0;
  const stops = segments
    .map((segment) => {
      const start = cursor;
      cursor += total === 0 ? 0 : (segment.count / total) * 100;
      return `${segment.color} ${start}% ${cursor}%`;
    })
    .join(", ");

  return (
    <div className={`${GLASS} p-5 sm:p-6`}>
      <h2 className="font-serif text-xl font-semibold">Status dos pedidos</h2>
      <p className="mt-0.5 text-[11px] text-muted">Distribuição por etapa da comissão</p>

      <div className="mt-5 flex items-center gap-6">
        <div
          className="h-28 w-28 shrink-0 rounded-full"
          style={{
            background:
              total === 0
                ? "conic-gradient(#E4D0BC 0% 100%)"
                : `conic-gradient(${stops})`,
            mask: "radial-gradient(farthest-side, transparent calc(100% - 18px), #000 calc(100% - 17px))",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 18px), #000 calc(100% - 17px))",
          }}
          aria-hidden="true"
        />
        <ul className="flex-1 space-y-2">
          {segments.map((segment) => (
            <li key={segment.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 text-mocha">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                {segment.label}
              </span>
              <span className="tabular-price font-semibold text-espresso">{segment.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StockPanel() {
  const stock = useSyncExternalStore(
    subscribeStock,
    getStockSnapshot,
    getStockServerSnapshot
  );

  const low = useMemo(() => {
    const rows: Array<{ key: string; label: string; qty: number }> = [];
    for (const product of PRODUCTS) {
      for (const variant of product.variants) {
        for (const size of variant.stocks) {
          const qty = stock.levels[`${variant.id}:${size.sizeLabel}`] ?? 0;
          if (qty <= 2) {
            rows.push({
              key: `${variant.id}:${size.sizeLabel}`,
              label: `${product.name} · ${variant.colorName} · ${size.sizeLabel}`,
              qty,
            });
          }
        }
      }
    }
    return rows.slice(0, 6);
  }, [stock]);

  return (
    <div className={`${GLASS} mt-4 p-5 sm:p-6`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold">Estoque</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            Baixa automática ao confirmar o pedido. Abaixo, peças com 2 unidades ou menos.
          </p>
        </div>
        <span className="tabular-price text-xs font-semibold text-mocha">
          {low.length} {low.length === 1 ? "item crítico" : "itens críticos"}
        </span>
      </div>

      {low.length === 0 ? (
        <p className="mt-4 text-xs text-mocha">Nenhum tamanho com estoque crítico.</p>
      ) : (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {low.map((item) => (
            <li
              key={item.key}
              className="flex items-center justify-between gap-3 rounded-xl border border-latte/70 bg-cream/70 px-3 py-2 text-[11px]"
            >
              <span className="text-mocha">{item.label}</span>
              <span
                className={`tabular-price font-semibold ${item.qty === 0 ? "text-copper" : "text-espresso"}`}
              >
                {item.qty}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminDashboard({ orders }: { orders: OrderView[] }) {
  const metrics = useMemo(() => {
    const payable = orders
      .filter((order) => order.commissionStatus === "PAYABLE")
      .reduce((sum, order) => sum + order.commissionInCents, 0);
    const paid = orders
      .filter((order) => order.commissionStatus === "PAID")
      .reduce((sum, order) => sum + order.commissionInCents, 0);
    const margin = orders
      .filter((order) => order.confirmedAt)
      .reduce((sum, order) => sum + order.marginInCents, 0);
    const ticket = orders.length
      ? Math.round(orders.reduce((sum, order) => sum + order.totalInCents, 0) / orders.length)
      : 0;

    return { payable, paid, margin, ticket };
  }, [orders]);

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

    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `marias-store-pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen bg-cream text-espresso">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 10% 6%, rgba(197,143,112,0.20), transparent 38%), radial-gradient(circle at 88% 14%, rgba(228,208,188,0.60), transparent 42%), radial-gradient(circle at 72% 92%, rgba(168,111,80,0.12), transparent 40%)",
        }}
      />

      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col p-4 lg:flex">
          <div className={`${GLASS} flex h-full flex-col p-5`}>
            <div className="border-b border-latte/70 pb-5">
              <p className="font-serif text-2xl font-semibold leading-none">Maria&apos;s</p>
              <p className="mt-1 font-serif text-xs tracking-[0.22em] text-rosegold uppercase">
                Store
              </p>
            </div>

            <nav className="mt-6 space-y-1" aria-label="Navegação administrativa">
              <span className="flex items-center gap-3 rounded-xl bg-espresso px-3 py-2.5 text-xs font-semibold text-cream">
                <LayoutDashboard className="h-4 w-4" strokeWidth={1.8} />
                Visão geral
              </span>
              <a
                href="#pedidos"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-mocha transition-colors hover:bg-sand/60 hover:text-espresso"
              >
                <ShoppingBag className="h-4 w-4" strokeWidth={1.8} />
                Pedidos
                <span className="tabular-price ml-auto text-[10px] text-muted">{orders.length}</span>
              </a>
              <Link
                href="/admin/produtos"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-mocha transition-colors hover:bg-sand/60 hover:text-espresso"
              >
                <CircleDollarSign className="h-4 w-4" strokeWidth={1.8} />
                Custos das peças
              </Link>
              <Link
                href="/admin/usuarios"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-mocha transition-colors hover:bg-sand/60 hover:text-espresso"
              >
                <UserPlus className="h-4 w-4" strokeWidth={1.8} />
                Administradores
              </Link>
              <Link
                href="/"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium text-mocha transition-colors hover:bg-sand/60 hover:text-espresso"
              >
                <Store className="h-4 w-4" strokeWidth={1.8} />
                Ver loja
              </Link>
            </nav>

            <div className="mt-auto rounded-xl border border-latte/70 bg-sand/50 p-3">
              <p className="text-[10px] font-semibold tracking-wider text-mocha uppercase">
                Regra de ouro
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                10% da margem de cada peça, liberados 7 dias após a confirmação.
              </p>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          <div className={`${GLASS} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] text-copper uppercase">
                Painel administrativo
              </p>
              <h1 className="mt-1 font-serif text-2xl font-semibold">Visão geral</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExport}
                disabled={orders.length === 0}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-latte bg-cream/80 px-4 py-2 text-[11px] font-semibold text-mocha transition-colors hover:border-rosegold hover:text-espresso disabled:cursor-not-allowed disabled:opacity-40"
              >
                <FileDown className="h-3.5 w-3.5" />
                Exportar CSV
              </button>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-full border border-latte bg-cream/80 px-4 py-2 text-[11px] font-semibold text-mocha transition-colors hover:border-rosegold hover:text-espresso"
              >
                Ver loja
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <form action={signOutFromAdmin}>
                <button
                  type="submit"
                  className="cursor-pointer rounded-full border border-latte bg-cream/80 px-4 py-2 text-[11px] font-semibold text-mocha transition-colors hover:border-rosegold hover:text-espresso"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>

          <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="A receber"
              value={formatBRL(metrics.payable)}
              hint="Comissões já liberadas"
              icon={CircleDollarSign}
              accent
            />
            <KpiCard
              label="Já recebido"
              value={formatBRL(metrics.paid)}
              hint="Repasses marcados como pagos"
              icon={Check}
            />
            <KpiCard
              label="Margem confirmada"
              value={formatBRL(metrics.margin)}
              hint="Base dos 10%"
              icon={Clock3}
            />
            <KpiCard
              label="Ticket médio"
              value={formatBRL(metrics.ticket)}
              hint={`${orders.length} ${orders.length === 1 ? "pedido registrado" : "pedidos registrados"}`}
              icon={ShoppingBag}
            />
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
            <CommissionChart orders={orders} />
            <StatusBreakdown orders={orders} />
          </section>

          <StockPanel />

          <section id="pedidos" className={`${GLASS} mt-4 p-5 sm:p-6`}>
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl font-semibold">Pedidos</h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  Confirme para calcular a comissão. Cancelamentos dentro do prazo revertem o valor.
                </p>
              </div>
              <span className="tabular-price text-xs font-semibold text-mocha">
                {orders.length} {orders.length === 1 ? "pedido" : "pedidos"}
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-latte bg-sand/40 px-6 py-14 text-center">
                <p className="font-serif text-2xl">Nenhum pedido ainda</p>
                <p className="mt-2 text-xs text-mocha">
                  Eles aparecem aqui quando a sacola é enviada pelo WhatsApp ou copiada.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {orders.map((order) => (
                  <article
                    key={order.code}
                    className="rounded-2xl border border-latte/80 bg-cream/70 p-4 transition-colors hover:border-rosegold/60 hover:bg-white/70"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="tabular-price font-serif text-xl font-semibold">
                          #{order.code}
                        </h3>
                        <StatusPill order={order} />
                        <span className="text-[11px] text-muted">
                          {new Date(order.createdAt).toLocaleString("pt-BR")}
                          {order.customerName ? ` · ${order.customerName}` : ""}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="tabular-price font-serif text-xl font-semibold">
                          {formatBRL(order.totalInCents)}
                        </p>
                        <p className="tabular-price text-[11px] text-mocha">
                          margem {formatBRL(order.marginInCents)}
                        </p>
                      </div>
                    </div>

                    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-latte/70 pt-3 text-[11px] text-mocha">
                      {order.items.map((item) => (
                        <li key={item.key}>
                          {item.quantity}× {item.productName} · {item.colorName} · Tam.{" "}
                          {item.sizeLabel}
                        </li>
                      ))}
                    </ul>

                    {!!order.confirmedAt && (
                      <p
                        className={`mt-2 text-[10px] ${order.stockShortfalls.length ? "font-semibold text-copper" : "text-muted"}`}
                      >
                        {order.stockShortfalls.length
                          ? `Estoque insuficiente: ${order.stockShortfalls.join(" · ")}`
                          : "Estoque baixado na confirmação"}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-latte/70 pt-3">
                      <div>
                        <p className="text-[10px] font-semibold tracking-wider text-mocha uppercase">
                          Sua comissão · {ORDER_STATUS_LABEL[order.status]}
                        </p>
                        <p className="tabular-price font-serif text-lg font-semibold text-copper">
                          {formatBRL(order.commissionInCents)}
                        </p>
                        {order.commissionAvailableAt && order.commissionStatus === "PENDING" && (
                          <p className="text-[10px] text-muted">
                            libera em{" "}
                            {new Date(order.commissionAvailableAt).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>

                      <div className="min-w-[170px]">
                        <label
                          htmlFor={`nf-${order.code}`}
                          className="block text-[10px] font-semibold tracking-wider text-mocha uppercase"
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
                          className="tabular-price mt-1 w-full rounded-xl border border-latte bg-cream/80 px-3 py-1.5 text-xs text-espresso placeholder:text-muted/70 focus:border-rosegold"
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {!order.confirmedAt && (
                          <button
                            type="button"
                            onClick={() => void confirmOrderAction(order.code)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-espresso px-4 py-2 text-[11px] font-semibold text-cream transition-transform hover:-translate-y-0.5"
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
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-latte px-4 py-2 text-[11px] font-semibold text-mocha transition-colors hover:border-muted hover:text-espresso"
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
          </section>

          <p className="mt-6 text-[10px] leading-relaxed text-muted">
            Fase 1: pedidos salvos neste navegador (localStorage). Área administrativa sem
            autenticação — não exponha esta URL publicamente. Regras em docs/07.
          </p>
        </main>
      </div>
    </div>
  );
}
