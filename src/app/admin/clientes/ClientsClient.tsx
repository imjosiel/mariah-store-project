"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";

import { formatBRL } from "@/lib/money";
import { PANEL } from "@/components/admin/AdminShell";
import type { CustomerView } from "@/lib/customerStore";

const STATUS_LABEL: Record<string, string> = {
  SENT_TO_WHATSAPP: "Aguardando",
  CONFIRMED: "Confirmado",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  RETURNED: "Trocado/devolvido",
  CANCELLED: "Cancelado",
};

export function ClientsClient({ customers }: { customers: CustomerView[] }) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) ||
        customer.document.toLowerCase().includes(term) ||
        customer.orders.some((order) => order.code.toLowerCase().includes(term))
    );
  }, [customers, query]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className={`${PANEL} px-5 py-4`}>
        <p className="text-[10px] font-semibold tracking-[0.18em] text-copper uppercase">
          Maria&apos;s Store · Admin
        </p>
        <h1 className="mt-1 font-serif text-2xl font-semibold">Clientes</h1>
        <p className="mt-0.5 text-[11px] text-[#6E6660]">
          {customers.length} {customers.length === 1 ? "cliente cadastrado" : "clientes cadastrados"}{" "}
          · documentos mascarados nesta tela.
        </p>
      </div>

      <div className={`${PANEL} p-5 sm:p-6`}>
        <label className="flex items-center gap-2 rounded-xl border border-[#E4DED8] bg-white px-3 py-2">
          <Search className="h-4 w-4 text-[#6E6660]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome, documento ou pedido"
            className="w-full bg-transparent text-sm text-[#141210] outline-none placeholder:text-[#9A918B]"
          />
        </label>

        {filtered.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[#E4DED8] px-6 py-14 text-center">
            <Users className="mx-auto h-6 w-6 text-[#9A918B]" />
            <p className="mt-3 text-sm text-[#6E6660]">
              {customers.length === 0
                ? "Nenhum cliente ainda. Eles aparecem quando um pedido é pago com Pix."
                : "Nenhum cliente encontrado."}
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-[#F1ECE7]">
            {filtered.map((customer) => {
              const total = customer.orders.reduce((sum, order) => sum + order.totalInCents, 0);
              const isOpen = expanded === customer.id;
              return (
                <li key={customer.id} className="py-3">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : customer.id)}
                    className="flex w-full cursor-pointer flex-wrap items-center justify-between gap-3 text-left"
                  >
                    <div>
                      <p className="text-sm font-semibold text-[#141210]">{customer.name}</p>
                      <p className="tabular-price text-[10px] text-[#6E6660]">
                        {customer.document}
                        {customer.phone ? ` · ${customer.phone}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="tabular-price text-sm font-semibold text-[#141210]">
                        {formatBRL(total)}
                      </p>
                      <p className="text-[10px] text-[#6E6660]">
                        {customer.orders.length}{" "}
                        {customer.orders.length === 1 ? "pedido" : "pedidos"}
                      </p>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-3 rounded-xl bg-[#FDFAF8] p-3">
                      {customer.orders.length === 0 ? (
                        <p className="text-[11px] text-[#6E6660]">Sem pedidos registrados.</p>
                      ) : (
                        <ul className="space-y-2">
                          {customer.orders.map((order) => (
                            <li
                              key={order.code}
                              className="flex flex-wrap items-center justify-between gap-2 text-[11px]"
                            >
                              <span className="tabular-price font-semibold">#{order.code}</span>
                              <span className="text-[#6E6660]">
                                {new Date(order.createdAt).toLocaleDateString("pt-BR")} ·{" "}
                                {STATUS_LABEL[order.status] ?? order.status}
                              </span>
                              <span className="tabular-price font-semibold">
                                {formatBRL(order.totalInCents)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {customer.email && (
                        <p className="mt-3 border-t border-[#EDE3D8] pt-2 text-[10px] text-[#6E6660]">
                          {customer.email}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
