"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Search, Sparkles } from "lucide-react";

import { resetProductsAction } from "@/admin-actions";
import { formatBRL } from "@/data/catalog";
import type { AdminProductRow } from "@/lib/productStore";

import { ProductDrawer } from "./ProductDrawer";

const PANEL =
  "rounded-[20px] border border-[#E4DED8] bg-white shadow-[0_8px_28px_-20px_rgba(20,16,14,0.28)]";
const PAGE_SIZE = 20;

export function AdminProductsClient({ products }: { products: AdminProductRow[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AdminProductRow | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.categoryName.toLowerCase().includes(term) ||
        product.variants.some((variant) => variant.colorName.toLowerCase().includes(term))
    );
  }, [products, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-5xl">
      <div className={`${PANEL} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#C0563E] uppercase">
            Maria&apos;s Store · Admin
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-[#141210]">Produtos</h1>
          <p className="mt-0.5 text-[11px] text-[#6E6660]">
            {products.length} peças · clique numa linha para editar preço, estoque e fotos.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/produtos/novo"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#C0563E] px-4 py-2 text-[11px] font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Nova peça
          </Link>
          <form action={resetProductsAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E4DED8] px-4 py-2 text-[11px] font-semibold text-[#4A4440] transition-colors hover:text-[#141210]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar
            </button>
          </form>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E4DED8] px-4 py-2 text-[11px] font-semibold text-[#4A4440] transition-colors hover:text-[#141210]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Visão geral
          </Link>
        </div>
      </div>

      <div className={`${PANEL} mt-4 overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EDE3D8] p-4">
          <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl border border-[#E4DED8] bg-white px-3 py-2">
            <Search className="h-4 w-4 text-[#6E6660]" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Buscar por peça, categoria ou cor"
              className="w-full bg-transparent text-sm text-[#141210] outline-none placeholder:text-[#9A918B]"
            />
          </label>
          <span className="tabular-price text-[11px] text-[#6E6660]">
            {filtered.length === 0
              ? "Nenhuma peça"
              : `${safePage * PAGE_SIZE + 1}–${Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} de ${filtered.length}`}
          </span>
        </div>

        {visible.length === 0 ? (
          <p className="p-10 text-center text-sm text-[#6E6660]">Nenhuma peça encontrada.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#EDE3D8] bg-[#FDFAF8] text-[10px] font-semibold tracking-wider text-[#6E6660] uppercase">
              <tr>
                <th className="px-4 py-3">Peça</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-right">Preço</th>
                <th className="px-4 py-3 text-right">Custo</th>
                <th className="px-4 py-3 text-right">Estoque</th>
                <th className="px-4 py-3 text-right">Comissão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1ECE7]">
              {visible.map((product) => {
                const totalStock = product.variants.reduce(
                  (sum, variant) => sum + variant.stocks.reduce((s, st) => s + st.stock, 0),
                  0
                );
                const margin = product.priceInCents - product.costInCents;
                const commission = Math.round(
                  margin > 0 ? (margin * 1000) / 10000 : 0
                );
                const low = totalStock <= 5;

                return (
                  <tr
                    key={product.slug}
                    onClick={() => setSelected(product)}
                    className="cursor-pointer transition-colors hover:bg-[#FDFAF8]"
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-9 shrink-0 overflow-hidden rounded-md bg-[#F7F4F1]">
                          <Image
                            src={product.imageUrl}
                            alt=""
                            fill
                            sizes="36px"
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                        <span className="font-medium text-[#141210]">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[#4A4440]">{product.categoryName}</td>
                    <td className="tabular-price px-4 py-2.5 text-right text-[#141210]">
                      {formatBRL(product.priceInCents)}
                    </td>
                    <td className="tabular-price px-4 py-2.5 text-right text-[#4A4440]">
                      {formatBRL(product.costInCents)}
                    </td>
                    <td className="tabular-price px-4 py-2.5 text-right">
                      <span className={low ? "font-semibold text-[#C0563E]" : "text-[#141210]"}>
                        {totalStock}
                      </span>
                    </td>
                    <td className="tabular-price px-4 py-2.5 text-right font-semibold text-[#C0563E]">
                      {formatBRL(commission)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-[#EDE3D8] p-4">
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

      {selected && <ProductDrawer product={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
