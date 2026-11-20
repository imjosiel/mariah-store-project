"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, MessageCircle, RefreshCw, Sparkles } from "lucide-react";
import { useBag } from "@/context/BagContext";

export function BrandEssenceSection() {
  const { openBag, totalItems } = useBag();

  return (
    <section
      id="essencia"
      aria-label="Sobre a Maria's Store"
      className="relative border-t border-latte bg-sand/55 py-20 text-espresso sm:py-24"
    >
      <div className="mx-auto w-full max-w-[1380px] px-5 sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left: Authentic Emblem Seal extracted from logo.png */}
          <div className="flex flex-col items-center justify-center lg:col-span-5">
            <div className="relative flex h-64 w-64 items-center justify-center rounded-full bg-cream p-3 shadow-[0_24px_48px_rgba(59,35,22,0.10)] ring-1 ring-rosegold/40 sm:h-76 sm:w-76">
              <Image
                src="/brand/logo-transparent.webp"
                alt="Emblema oficial Maria's Store"
                width={300}
                height={300}
                className="h-full w-full object-contain"
              />
            </div>
          </div>

          {/* Right: Editorial Brand Story & Pillars */}
          <div className="lg:col-span-7">
            <h2 className="font-serif text-4xl leading-[1.06] font-semibold tracking-[-0.02em] text-espresso sm:text-5xl">
              Peças pensadas para acompanhar a rotina com leveza.
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-mocha sm:text-base">
              A <strong>Maria&apos;s Store</strong> nasceu do desejo de unir caimento de alfaiataria e conforto casual em coleções enxutas. Cada tecido — do linho respirável ao cetim fluido — é escolhido pelo toque na pele e pela durabilidade no guarda-roupa.
            </p>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-latte/90 bg-cream/85 p-5">
                <Sparkles
                  className="h-5 w-5 text-copper"
                  strokeWidth={1.8}
                />
                <h3 className="mt-3 font-serif text-xl font-semibold text-espresso">
                  Toque Natural
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-mocha">
                  Fibras frescas, forros respiráveis e aviamentos em tartaruga e banho rose gold.
                </p>
              </div>

              <div className="rounded-2xl border border-latte/90 bg-cream/85 p-5">
                <RefreshCw
                  className="h-5 w-5 text-copper"
                  strokeWidth={1.8}
                />
                <h3 className="mt-3 font-serif text-xl font-semibold text-espresso">
                  Troca Descomplicada
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-mocha">
                  Primeira troca gratuita em até 30 dias e tabela real de medidas em todas as peças.
                </p>
              </div>

              <div className="rounded-2xl border border-latte/90 bg-cream/85 p-5">
                <Heart
                  className="h-5 w-5 text-copper"
                  strokeWidth={1.8}
                />
                <h3 className="mt-3 font-serif text-xl font-semibold text-espresso">
                  Curadoria Próxima
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-mocha">
                  Monte sua sacola no site e finalize direto no WhatsApp com atendimento humano.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openBag}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-espresso px-6 py-3.5 text-sm font-semibold text-cream transition-transform duration-200 hover:-translate-y-0.5 active:scale-95"
              >
                <MessageCircle className="h-4 w-4" strokeWidth={1.9} />
                <span>
                  Revisar sacola ({totalItems}) &amp; pedir no WhatsApp
                </span>
              </button>
              <a
                href="#vitrine"
                className="inline-flex cursor-pointer items-center rounded-full border border-latte bg-cream px-5 py-3.5 text-sm font-medium text-espresso transition-colors hover:border-rosegold"
              >
                Voltar ao topo ↑
              </a>
            </div>
          </div>
        </div>

        {/* Clean Architectural Footer */}
        <footer className="mt-20 flex flex-col items-center justify-between gap-4 border-t border-latte pt-8 text-xs text-mocha sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="font-serif text-base font-semibold text-espresso">
              Maria&apos;s Store
            </span>
            <span>·</span>
            <span>Moda Casual Feminina</span>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <a href="#vitrine" className="hover:text-espresso">
              Destaques
            </a>
            <a href="#catalogo" className="hover:text-espresso">
              Catálogo
            </a>
            <a href="#essencia" className="hover:text-espresso">
              A Marca
            </a>
            <Link href="/politicas" className="hover:text-espresso">
              Políticas
            </Link>
          </div>
        </footer>
      </div>
    </section>
  );
}
