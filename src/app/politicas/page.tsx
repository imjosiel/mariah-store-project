import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle, ShieldCheck } from "lucide-react";

import { storeInfo, hasLegalInfo } from "@/lib/storeInfo";

const GLASS =
  "rounded-[22px] border border-white/70 bg-white/55 p-5 shadow-[0_14px_45px_-24px_rgba(59,35,22,0.35)] backdrop-blur-xl sm:p-6";

export default function PoliciesPage() {
  const whatsappHref = storeInfo.whatsapp
    ? `https://wa.me/${storeInfo.whatsapp}`
    : "/";

  return (
    <main className="relative min-h-screen bg-cream px-4 py-8 text-espresso sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 8%, rgba(197,143,112,0.20), transparent 38%), radial-gradient(circle at 88% 88%, rgba(168,111,80,0.12), transparent 42%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-latte px-4 py-2 text-[11px] font-semibold text-mocha transition-colors hover:border-rosegold hover:text-espresso"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar para a loja
        </Link>

        <header className="mt-6">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-copper uppercase">
            Maria&apos;s Store
          </p>
          <h1 className="mt-2 font-serif text-4xl font-semibold">Compra, troca e privacidade</h1>
          <p className="mt-2 text-xs text-muted">Última atualização: 20/11/2026</p>
        </header>

        {!hasLegalInfo() && (
          <div className={`${GLASS} mt-6 border-copper/50 bg-copper/5`}>
            <p className="text-xs font-semibold text-copper">Antes de vender</p>
            <p className="mt-1 text-[11px] leading-relaxed text-mocha">
              Os dados cadastrais da loja ainda não foram informados. Preencha as variáveis
              <code> NEXT_PUBLIC_STORE_*</code> na Vercel (nome, CNPJ, endereço e contato) para
              cumprir o Decreto 7.962/2013.
            </p>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <section className={GLASS}>
            <h2 className="font-serif text-xl font-semibold">Como a compra funciona</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-mocha">
              Você monta a sacola no site e envia o resumo pelo WhatsApp. A disponibilidade,
              o valor do frete e a forma de pagamento (Pix) são confirmados diretamente no
              atendimento. O pedido só é considerado fechado após essa confirmação. Não
              cobramos taxas de gateway — o pagamento é feito entre você e a loja.
            </p>
          </section>

          <section className={GLASS}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-copper" />
              <h2 className="font-serif text-xl font-semibold">
                Direito de arrependimento e trocas
              </h2>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-mocha">
              A compra é feita fora do estabelecimento físico. Pelo art. 49 do Código de Defesa
              do Consumidor, você tem <strong>7 dias</strong> contados da assinatura ou do
              recebimento para desistir, sem precisar justificar. Para exercer o direito,
              envie uma mensagem no WhatsApp informando o código do pedido (MS-xxxx). O valor
              pago será devolvido, preferencialmente via Pix, em até 7 dias úteis após a
              devolução da peça.
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-mocha">
              Para troca por outro tamanho ou cor, entre em contato dentro do mesmo prazo.
              A peça deve estar sem uso, com etiquetas e embalagem original. O frete da
              primeira troca é combinado no atendimento; trocas por defeito de fabricação
              são de responsabilidade da loja.
            </p>
          </section>

          <section className={GLASS}>
            <h2 className="font-serif text-xl font-semibold">Entrega</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-mocha">
              Enviamos para todo o Rio Grande do Sul. O prazo e o valor do frete são
              informados no WhatsApp antes da confirmação do pedido. A loja não realiza
              cobranças automáticas nem assinaturas.
            </p>
          </section>

          <section className={GLASS}>
            <h2 className="font-serif text-xl font-semibold">Privacidade dos seus dados</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-mocha">
              Coletamos apenas o nome e o telefone que você informa voluntariamente, além do
              conteúdo da conversa no WhatsApp. Esses dados servem exclusivamente para
              atendimento, confirmação de pedido, entrega e eventual suporte. Não vendemos,
              alugamos ou compartilhamos suas informações com terceiros, exceto transportadora
              contratada para a entrega.
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-mocha">
              Os registros de pedido ficam no banco da loja e são usados para emissão de nota
              fiscal e controle de estoque. Você pode pedir acesso, correção ou exclusão dos
              seus dados a qualquer momento pelo contato abaixo.
            </p>
          </section>

          <section className={GLASS}>
            <h2 className="font-serif text-xl font-semibold">Identificação e contato</h2>
            <dl className="mt-3 grid gap-2 text-[12px] text-mocha sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-semibold tracking-wider uppercase">Responsável</dt>
                <dd>{storeInfo.legalName || "A preencher"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold tracking-wider uppercase">CNPJ</dt>
                <dd>{storeInfo.cnpj || "A preencher"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] font-semibold tracking-wider uppercase">Endereço</dt>
                <dd>{storeInfo.address || "A preencher"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold tracking-wider uppercase">E-mail</dt>
                <dd>{storeInfo.email || "A preencher"}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold tracking-wider uppercase">Telefone</dt>
                <dd>{storeInfo.phone || "A preencher"}</dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-espresso px-4 py-2 text-[11px] font-semibold text-cream transition-transform hover:-translate-y-0.5"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Falar no WhatsApp
              </a>
              {storeInfo.email && (
                <a
                  href={`mailto:${storeInfo.email}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-latte px-4 py-2 text-[11px] font-semibold text-mocha transition-colors hover:border-rosegold hover:text-espresso"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Enviar e-mail
                </a>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
