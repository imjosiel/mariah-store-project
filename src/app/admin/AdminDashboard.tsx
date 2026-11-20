"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CircleDollarSign,
  Clock3,
  ShoppingBag,
} from "lucide-react";

import { PRODUCTS, formatBRL } from "@/data/catalog";
import type { OrderView } from "@/lib/orderStore";
import {
  getStockServerSnapshot,
  getStockSnapshot,
  subscribeStock,
} from "@/lib/stockStore";
import { PANEL } from "@/components/admin/AdminShell";

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
    <div className={`${PANEL} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-mocha uppercase">
          {label}
        </p>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-xl ${
            accent ? "bg-copper/12 text-copper" : "bg-[#FBF6F1] text-mocha"
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
    <div className={`${PANEL} p-5 sm:p-6`}>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold">Comissões nos últimos 7 dias</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            Valores calculados nos pedidos confirmados
          </p>
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
                className="w-full rounded-t-lg bg-gradient-to-t from-copper/60 to-rosegold transition-[height] duration-500"
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
    {
      label: "A receber",
      color: "#A86F50",
      count: orders.filter((o) => !o.confirmedAt || o.commissionStatus === "PENDING").length,
    },
    {
      label: "Liberado",
      color: "#C58F70",
      count: orders.filter((o) => o.commissionStatus === "PAYABLE").length,
    },
    {
      label: "Pago",
      color: "#6E4B3A",
      count: orders.filter((o) => o.commissionStatus === "PAID").length,
    },
    {
      label: "Revertido",
      color: "#D9C7B6",
      count: orders.filter((o) => o.commissionStatus === "REVERSED").length,
    },
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
    <div className={`${PANEL} p-5 sm:p-6`}>
      <h2 className="font-serif text-xl font-semibold">Status dos pedidos</h2>
      <p className="mt-0.5 text-[11px] text-muted">
        Distribuição por etapa da comissão
      </p>

      <div className="mt-5 flex items-center gap-6">
        <div
          className="h-28 w-28 shrink-0 rounded-full"
          style={{
            background:
              total === 0 ? "conic-gradient(#E4D0BC 0% 100%)" : `conic-gradient(${stops})`,
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
    <div className={`${PANEL} p-5 sm:p-6`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold">Estoque</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            Baixa automática ao confirmar o pedido. Peças com 2 unidades ou menos.
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
              className="flex items-center justify-between gap-3 rounded-xl border border-[#EDE3D8] bg-[#FDFAF7] px-3 py-2 text-[11px]"
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
      ? Math.round(
          orders.reduce((sum, order) => sum + order.totalInCents, 0) / orders.length
        )
      : 0;

    return { payable, paid, margin, ticket };
  }, [orders]);

  return (
    <div className="space-y-4">
      <div className={`${PANEL} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-copper uppercase">
            Painel administrativo
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold">Visão geral</h1>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#E8DDD1] bg-white px-4 py-2 text-[11px] font-semibold text-mocha transition-colors hover:border-rosegold hover:text-espresso"
        >
          Ver loja
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          icon={ShoppingBag}
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
          hint={`${orders.length} ${orders.length === 1 ? "pedido" : "pedidos"} registrados`}
          icon={ShoppingBag}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <CommissionChart orders={orders} />
        <StatusBreakdown orders={orders} />
      </section>

      <StockPanel />
    </div>
  );
}
