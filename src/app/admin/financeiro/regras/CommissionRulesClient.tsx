"use client";

import { useState } from "react";
import Link from "next/link";

import type { CheckoutMethod } from "@prisma/client";

import type { CommissionSettings } from "@/domain/commission";
import { updateCommissionSettingsAction } from "@/order-actions";
import { updateCheckoutSettingsAction } from "@/checkout-actions";
import type { CheckoutSettings } from "@/lib/checkoutSettings";
import { PANEL } from "@/components/admin/AdminShell";

const input =
  "tabular-price mt-1 w-full rounded-xl border border-[#E4DED8] bg-white px-3 py-2.5 text-sm text-[#141210] focus:border-rosegold";

export function CommissionRulesClient({
  settings,
  checkout,
  gatewayConfigured,
}: {
  settings: CommissionSettings;
  checkout: CheckoutSettings;
  gatewayConfigured: boolean;
}) {
  const [onlineDays, setOnlineDays] = useState(String(settings.onlineGraceDays));
  const [storeDays, setStoreDays] = useState(String(settings.storeGraceDays));
  const [percent, setPercent] = useState((settings.commissionBps / 100).toFixed(1).replace(".", ","));
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [pixEnabled, setPixEnabled] = useState(checkout.pixGatewayEnabled);
  const [whatsappEnabled, setWhatsappEnabled] = useState(checkout.whatsappEnabled);
  const [preferredMethod, setPreferredMethod] = useState<CheckoutMethod>(
    checkout.preferredMethod
  );
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [checkoutSaving, setCheckoutSaving] = useState(false);

  const bps = Math.round(Number(percent.replace(",", ".")) * 100);
  const invalid =
    !Number.isInteger(Number(onlineDays)) ||
    !Number.isInteger(Number(storeDays)) ||
    Number(onlineDays) < 0 ||
    Number(storeDays) < 0 ||
    !Number.isFinite(bps) ||
    bps < 0 ||
    bps > 10_000;

  const save = async () => {
    if (invalid) {
      setMessage("Confira os valores: prazos inteiros e percentual entre 0 e 100.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await updateCommissionSettingsAction({
        onlineGraceDays: Number(onlineDays),
        storeGraceDays: Number(storeDays),
        commissionBps: bps,
      });
      setMessage("Regras salvas. Pedidos novos já usam os novos valores.");
    } catch {
      setMessage("Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  };

  const saveCheckout = async () => {
    if (pixEnabled && !gatewayConfigured) {
      setCheckoutMessage("Configure ASAAS_API_KEY e ASAAS_WALLET_ID antes de ligar o Pix.");
      return;
    }
    if (!pixEnabled && !whatsappEnabled) {
      setCheckoutMessage("Deixe ao menos uma forma de pagamento ligada.");
      return;
    }
    if (pixEnabled && !whatsappEnabled && preferredMethod === "WHATSAPP") {
      setCheckoutMessage("Escolha uma forma disponível como preferencial.");
      return;
    }
    setCheckoutSaving(true);
    setCheckoutMessage("");
    try {
      await updateCheckoutSettingsAction({
        pixGatewayEnabled: pixEnabled,
        whatsappEnabled,
        preferredMethod,
      });
      setCheckoutMessage("Checkout atualizado.");
    } catch {
      setCheckoutMessage("Não foi possível salvar o checkout.");
    } finally {
      setCheckoutSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className={`${PANEL} px-5 py-4`}>
        <p className="text-[10px] font-semibold tracking-[0.18em] text-copper uppercase">
          Maria&apos;s Store · Super admin
        </p>
        <h1 className="mt-1 font-serif text-2xl font-semibold">Regras de comissão</h1>
        <Link href="/admin/financeiro" className="mt-2 inline-block text-[11px] font-semibold text-copper underline">
          Voltar ao financeiro
        </Link>
      </div>

      <div className={`${PANEL} p-5 sm:p-6`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Prazo — vendas online (dias)
            </span>
            <input value={onlineDays} onChange={(event) => setOnlineDays(event.target.value)} inputMode="numeric" className={input} />
            <span className="mt-1 block text-[10px] text-[#6E6660]">
              Dias de arrependimento (CDC, art. 49). Padrão: 7.
            </span>
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Prazo — venda na loja (dias)
            </span>
            <input value={storeDays} onChange={(event) => setStoreDays(event.target.value)} inputMode="numeric" className={input} />
            <span className="mt-1 block text-[10px] text-[#6E6660]">
              Use 0 para liberar na hora. Loja física não tem arrependimento legal, mas pode dar
              troca por cortesia.
            </span>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Comissão sobre a margem (%)
            </span>
            <input value={percent} onChange={(event) => setPercent(event.target.value)} inputMode="decimal" className={input} />
            <span className="mt-1 block text-[10px] text-[#6E6660]">
              Incide sobre preço recebido menos custo da peça. Padrão: 10%.
            </span>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="cursor-pointer rounded-full bg-[#161311] px-6 py-2.5 text-xs font-semibold text-cream transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar regras"}
          </button>
          {message && (
            <span className="text-[11px] font-semibold text-[#A8432F]">{message}</span>
          )}
        </div>
      </div>

      <div className={`${PANEL} p-5 sm:p-6`}>
        <h2 className="font-serif text-xl font-semibold">Checkout da vitrine</h2>
        <p className="mt-0.5 text-[11px] text-[#6E6660]">
          O Pix via gateway só aparece para a cliente se as credenciais estiverem configuradas.
          Fora isso, a loja continua como hoje.
        </p>

        <div className="mt-4 space-y-3">
          <label className="flex items-center gap-2 text-xs text-[#4A4440]">
            <input
              type="checkbox"
              checked={whatsappEnabled}
              onChange={(event) => setWhatsappEnabled(event.target.checked)}
              className="h-4 w-4 accent-copper"
            />
            Finalizar pelo WhatsApp
          </label>
          <label className="flex items-center gap-2 text-xs text-[#4A4440]">
            <input
              type="checkbox"
              checked={pixEnabled}
              onChange={(event) => setPixEnabled(event.target.checked)}
              className="h-4 w-4 accent-copper"
            />
            Pix com QR Code (Asaas)
          </label>
          {!gatewayConfigured && (
            <p className="text-[10px] text-[#A8432F]">
              Credenciais do Asaas ausentes — o Pix não aparecerá na vitrine mesmo marcado.
            </p>
          )}
          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Forma preferencial
            </span>
            <select
              value={preferredMethod}
              onChange={(event) => setPreferredMethod(event.target.value as CheckoutMethod)}
              className={input}
            >
              {whatsappEnabled && <option value="WHATSAPP">WhatsApp</option>}
              {pixEnabled && <option value="PIX_GATEWAY">Pix com QR Code</option>}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void saveCheckout()}
            disabled={checkoutSaving}
            className="cursor-pointer rounded-full bg-[#161311] px-6 py-2.5 text-xs font-semibold text-cream transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {checkoutSaving ? "Salvando..." : "Salvar checkout"}
          </button>
          {checkoutMessage && (
            <span className="text-[11px] font-semibold text-[#A8432F]">{checkoutMessage}</span>
          )}
        </div>
      </div>

      <div className={`${PANEL} p-5`}>
        <p className="text-[11px] font-semibold text-[#141210]">Antes de mudar</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#6E6660]">
          Estas regras valem para pedidos confirmados daqui em diante. Pedidos antigos mantêm o
          valor e a data calculados na confirmação. Credenciais de gateway nunca ficam aqui —
          ficam nas variáveis de ambiente da hospedagem.
        </p>
      </div>
    </div>
  );
}
