"use client";

import { useActionState, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Save, Sparkles } from "lucide-react";

import { resetProductsAction, saveProductsAction } from "@/admin-actions";
import { formatBRL } from "@/data/catalog";
import { calculateCommission } from "@/domain/commission";
import { reaisToCents } from "@/domain/money";
import type { AdminProductRow, ProductUpdate } from "@/lib/productStore";

import { AddVariantForm } from "./AddVariantForm";

const GLASS =
  "rounded-[20px] border border-[#E8DDD1] bg-white/90 shadow-[0_10px_32px_-22px_rgba(59,35,22,0.28)]";

type Draft = Record<
  string,
  { price: string; cost: string; stocks: Record<string, string> }
>;

const stockKey = (colorSlug: string, sizeLabel: string) => `${colorSlug}:${sizeLabel}`;
const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function AdminProductsClient({ products }: { products: AdminProductRow[] }) {
  const [draft, setDraft] = useState<Draft>(() =>
    Object.fromEntries(
      products.map((product) => [
        product.slug,
        {
          price: centsToInput(product.priceInCents),
          cost: centsToInput(product.costInCents),
          stocks: Object.fromEntries(
            product.variants.flatMap((variant) =>
              variant.stocks.map((stock) => [
                stockKey(variant.colorSlug, stock.sizeLabel),
                String(stock.stock),
              ])
            )
          ),
        },
      ])
    )
  );
  const [state, formAction, pending] = useActionState(saveProductsAction, { message: "" });
  const [addingSlug, setAddingSlug] = useState<string | null>(null);

  const parsed = useMemo(() => {
    const updates: ProductUpdate[] = [];
    let invalid = false;

    for (const product of products) {
      const row = draft[product.slug];
      if (!row) continue;
      const priceInCents = reaisToCents(row.price);
      const costInCents = reaisToCents(row.cost);
      if (priceInCents === null || costInCents === null) {
        invalid = true;
        continue;
      }

      const stocks: ProductUpdate["stocks"] = [];
      for (const variant of product.variants) {
        for (const stock of variant.stocks) {
          const value = Number(
            row.stocks[stockKey(variant.colorSlug, stock.sizeLabel)] ?? "0"
          );
          if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
            invalid = true;
            continue;
          }
          stocks.push({
            colorSlug: variant.colorSlug,
            sizeLabel: stock.sizeLabel,
            stock: value,
          });
        }
      }

      updates.push({ slug: product.slug, priceInCents, costInCents, stocks });
    }

    return { updates, invalid };
  }, [draft, products]);

  return (
    <div className="mx-auto max-w-6xl">
        <div className={`${GLASS} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-copper uppercase">
              Maria&apos;s Store · Admin
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold">Peças e estoque</h1>
            <p className="mt-0.5 text-[11px] text-muted">
              Preço, custo e estoque no Postgres. O pedido congela os valores ao ser confirmado.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/produtos/novo"
              className="inline-flex items-center gap-1.5 rounded-full bg-copper px-4 py-2 text-[11px] font-semibold text-cream transition-transform hover:-translate-y-0.5"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Nova peça
            </Link>
            <form action={resetProductsAction}>
              <button
                type="submit"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-latte px-4 py-2 text-[11px] font-semibold text-mocha transition-colors hover:border-rosegold hover:text-espresso"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restaurar catálogo
              </button>
            </form>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-full border border-latte px-4 py-2 text-[11px] font-semibold text-mocha transition-colors hover:border-rosegold hover:text-espresso"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Visão geral
            </Link>
          </div>
        </div>

        <div className={`${GLASS} mt-4 p-5 sm:p-6`}>
          <form action={formAction} id="products-save-form">
            <input type="hidden" name="products" value={JSON.stringify(parsed.updates)} />
          </form>

          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-latte/70 pb-4">
            <div>
              <h2 className="font-serif text-xl font-semibold">
                Catálogo · {products.length} peças
              </h2>
              <p className="mt-0.5 text-[11px] text-muted">
                Estoque por cor e tamanho. Use 0 para esgotado.
              </p>
            </div>
            <button
              type="submit"
              form="products-save-form"
              disabled={parsed.invalid || pending}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-espresso px-5 py-2.5 text-[11px] font-semibold text-cream transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {state.message ? (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  {state.message}
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Salvar alterações
                </>
              )}
            </button>
          </div>

          <ul className="mt-4 space-y-3">
            {products.map((product) => {
              const row = draft[product.slug];
              if (!row) return null;
              const price = reaisToCents(row.price);
              const cost = reaisToCents(row.cost);
              const margin = price !== null && cost !== null ? price - cost : 0;
              const commission = calculateCommission({
                costInCents: cost ?? 0,
                receivedInCents: price ?? 0,
              });

              return (
                <li
                  key={product.slug}
                  className="rounded-2xl border border-latte/80 bg-cream/70 p-4"
                >
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-sand/60 p-1">
                      <Image
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        sizes="56px"
                        className="object-contain"
                      />
                    </div>

                    <div className="min-w-[160px] flex-1">
                      <p className="font-serif text-lg font-semibold leading-tight">{product.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{product.categoryName}</p>
                    </div>

                    <MoneyInput
                      id={`price-${product.slug}`}
                      label="Preço (R$)"
                      value={row.price}
                      onChange={(value) =>
                        setDraft((prev) => ({
                          ...prev,
                          [product.slug]: { ...prev[product.slug], price: value },
                        }))
                      }
                    />
                    <MoneyInput
                      id={`cost-${product.slug}`}
                      label="Custo (R$)"
                      value={row.cost}
                      onChange={(value) =>
                        setDraft((prev) => ({
                          ...prev,
                          [product.slug]: { ...prev[product.slug], cost: value },
                        }))
                      }
                    />

                    <div className="min-w-[130px] text-right">
                      <p className="text-[10px] font-semibold tracking-wider text-mocha uppercase">
                        Margem / 10%
                      </p>
                      <p className="tabular-price mt-0.5 text-sm font-semibold">
                        {formatBRL(Math.max(0, margin))}
                        <span className="text-copper"> · {formatBRL(commission)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 border-t border-latte/70 pt-3 sm:grid-cols-2 lg:grid-cols-3">
                    {product.variants.map((variant) => (
                      <div key={variant.colorSlug} className="rounded-xl bg-white/60 p-3">
                        <p className="mb-2 text-[11px] font-semibold text-espresso">
                          {variant.colorName}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {variant.stocks.map((stock) => {
                            const key = stockKey(variant.colorSlug, stock.sizeLabel);
                            return (
                              <label key={key} className="flex items-center gap-1.5 text-[11px] text-mocha">
                                {stock.sizeLabel}
                                <input
                                  type="number"
                                  min={0}
                                  step={1}
                                  aria-label={`Estoque ${product.name} ${variant.colorName} ${stock.sizeLabel}`}
                                  value={row.stocks[key] ?? "0"}
                                  onChange={(event) =>
                                    setDraft((prev) => ({
                                      ...prev,
                                      [product.slug]: {
                                        ...prev[product.slug],
                                        stocks: {
                                          ...prev[product.slug].stocks,
                                          [key]: event.target.value,
                                        },
                                      },
                                    }))
                                  }
                                  className="tabular-price w-14 rounded-lg border border-latte bg-cream px-2 py-1 text-center text-xs text-espresso focus:border-rosegold"
                                />
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 border-t border-latte/70 pt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setAddingSlug((current) =>
                          current === product.slug ? null : product.slug
                        )
                      }
                      className="cursor-pointer rounded-full border border-latte px-4 py-1.5 text-[11px] font-semibold text-mocha transition-colors hover:border-rosegold hover:text-espresso"
                    >
                      {addingSlug === product.slug ? "Fechar" : "+ Adicionar cor"}
                    </button>
                    {addingSlug === product.slug && (
                      <AddVariantForm productSlug={product.slug} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {parsed.invalid && (
            <p className="mt-4 text-[11px] font-semibold text-copper">
              Confira os valores em vermelho antes de salvar.
            </p>
          )}
        </div>

        <p className="mt-6 text-[10px] leading-relaxed text-muted">
          Dados no Postgres (Fase 2). Regras em docs/07 e docs/10.
        </p>
    </div>
  );
}

function MoneyInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const invalid = reaisToCents(value) === null;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[10px] font-semibold tracking-wider text-mocha uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={invalid}
        className={`tabular-price mt-1 w-28 rounded-xl border bg-white/80 px-3 py-2 text-sm text-espresso focus:border-rosegold ${
          invalid ? "border-copper" : "border-latte"
        }`}
      />
    </div>
  );
}
