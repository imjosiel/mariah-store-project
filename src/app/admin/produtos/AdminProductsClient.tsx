"use client";

import { useActionState, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Save, Sparkles } from "lucide-react";

import { saveCostsAction, resetCostsAction } from "@/admin-actions";
import { CATEGORIES, PRODUCTS, formatBRL } from "@/data/catalog";
import { calculateCommission } from "@/domain/commission";
import { reaisToCents } from "@/domain/money";

const GLASS =
  "rounded-[22px] border border-white/70 bg-white/55 shadow-[0_14px_45px_-24px_rgba(59,35,22,0.35)] backdrop-blur-xl";

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function AdminProductsClient({
  initialCosts,
}: {
  initialCosts: Record<string, number>;
}) {
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      PRODUCTS.map((product) => [
        product.slug,
        centsToInput(initialCosts[product.slug] ?? product.costInCents),
      ])
    )
  );
  const [state, formAction, pending] = useActionState(saveCostsAction, { message: "" });

  const parsed = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(draft).map(([slug, value]) => [slug, reaisToCents(value)])
      ) as Record<string, number | null>,
    [draft]
  );

  const hasInvalid = Object.values(parsed).some((value) => value === null);

  return (
    <div className="relative min-h-screen bg-cream text-espresso">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 8%, rgba(197,143,112,0.20), transparent 38%), radial-gradient(circle at 88% 88%, rgba(168,111,80,0.12), transparent 42%)",
        }}
      />

      <main className="relative mx-auto max-w-6xl px-4 py-6 sm:px-8">
        <div className={`${GLASS} flex flex-wrap items-center justify-between gap-3 px-5 py-4`}>
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-copper uppercase">
              Maria&apos;s Store · Admin
            </p>
            <h1 className="mt-1 font-serif text-2xl font-semibold">Custo das peças</h1>
            <p className="mt-0.5 text-[11px] text-muted">
              Custos salvos no Postgres. O pedido congela o valor no momento da confirmação.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form action={resetCostsAction}>
              <button
                type="submit"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-latte px-4 py-2 text-[11px] font-semibold text-mocha transition-colors hover:border-rosegold hover:text-espresso"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restaurar valores iniciais
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

        <form action={formAction} className={`${GLASS} mt-4 p-5 sm:p-6`}>
          <input
            type="hidden"
            name="costs"
            value={JSON.stringify(
              Object.fromEntries(
                Object.entries(parsed).filter(([, value]) => value !== null)
              )
            )}
          />

          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-latte/70 pb-4">
            <div>
              <h2 className="font-serif text-xl font-semibold">
                Catálogo · {PRODUCTS.length} peças
              </h2>
              <p className="mt-0.5 text-[11px] text-muted">Informe quanto cada peça custou.</p>
            </div>
            <button
              type="submit"
              disabled={hasInvalid || pending}
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
                  Salvar custos
                </>
              )}
            </button>
          </div>

          <ul className="mt-4 space-y-3">
            {PRODUCTS.map((product) => {
              const cost = parsed[product.slug];
              const margin = cost === null ? 0 : product.priceInCents - cost;
              const commission = calculateCommission({
                costInCents: cost ?? product.costInCents,
                receivedInCents: product.priceInCents,
              });
              const category = CATEGORIES.find((c) => c.slug === product.categorySlug);
              const invalid = cost === null;

              return (
                <li
                  key={product.slug}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border border-latte/80 bg-cream/70 p-4"
                >
                  <div className="relative h-16 w-14 shrink-0 overflow-hidden rounded-xl bg-sand/60 p-1">
                    <Image
                      src={product.variants[0].cutoutImageUrl}
                      alt={product.name}
                      fill
                      sizes="56px"
                      className="object-contain"
                    />
                  </div>

                  <div className="min-w-[180px] flex-1">
                    <p className="font-serif text-lg font-semibold leading-tight">{product.name}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{category?.name}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-semibold tracking-wider text-mocha uppercase">
                      Preço
                    </p>
                    <p className="tabular-price mt-0.5 text-sm font-semibold">
                      {formatBRL(product.priceInCents)}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor={`cost-${product.slug}`}
                      className="block text-[10px] font-semibold tracking-wider text-mocha uppercase"
                    >
                      Custo (R$)
                    </label>
                    <input
                      id={`cost-${product.slug}`}
                      inputMode="decimal"
                      value={draft[product.slug] ?? ""}
                      onChange={(event) =>
                        setDraft((prev) => ({ ...prev, [product.slug]: event.target.value }))
                      }
                      aria-invalid={invalid}
                      className={`tabular-price mt-1 w-28 rounded-xl border bg-white/80 px-3 py-2 text-sm text-espresso focus:border-rosegold ${
                        invalid ? "border-copper" : "border-latte"
                      }`}
                    />
                  </div>

                  <div className="min-w-[120px] text-right">
                    <p className="text-[10px] font-semibold tracking-wider text-mocha uppercase">
                      Margem / 10%
                    </p>
                    <p className="tabular-price mt-0.5 text-sm font-semibold text-espresso">
                      {formatBRL(Math.max(0, margin))}
                      <span className="text-copper"> · {formatBRL(commission)}</span>
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          {hasInvalid && (
            <p className="mt-4 text-[11px] font-semibold text-copper">
              Confira os valores em vermelho antes de salvar.
            </p>
          )}
        </form>

        <p className="mt-6 text-[10px] leading-relaxed text-muted">
          Custos no Postgres (Fase 2). Regras em docs/07 e docs/10.
        </p>
      </main>
    </div>
  );
}
