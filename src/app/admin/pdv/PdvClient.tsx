"use client";

import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";

import { formatBRL } from "@/lib/money";
import { reaisToCents } from "@/domain/money";
import { calculateCommission } from "@/domain/commission";
import { createPosOrderAction } from "@/order-actions";
import { PANEL } from "@/components/admin/AdminShell";

type Product = {
  slug: string;
  name: string;
  priceInCents: number;
  costInCents: number;
  variants: Array<{
    id: string;
    colorName: string;
    swatchHex: string;
    stocks: Array<{ sizeLabel: string; stock: number }>;
  }>;
};

type Payment = "PIX" | "DINHEIRO" | "CARTAO" | "OUTRO";

const PAYMENT_LABEL: Record<Payment, string> = {
  PIX: "Pix",
  DINHEIRO: "Dinheiro",
  CARTAO: "Cartão",
  OUTRO: "Outro",
};

const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const input =
  "mt-1 w-full rounded-xl border border-[#E4DED8] bg-white px-3 py-2.5 text-sm text-[#141210] placeholder:text-[#9A918B] focus:border-rosegold";

export function PdvClient({ products }: { products: Product[] }) {
  const [productSlug, setProductSlug] = useState("");
  const [variantId, setVariantId] = useState("");
  const [sizeLabel, setSizeLabel] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [payment, setPayment] = useState<Payment>("PIX");
  const [customerName, setCustomerName] = useState("");
  const [message, setMessage] = useState("");
  const [lastCode, setLastCode] = useState("");
  const [saving, setSaving] = useState(false);

  const product = products.find((item) => item.slug === productSlug);
  const variant = product?.variants.find((item) => item.id === variantId);
  const stockRow = variant?.stocks.find((item) => item.sizeLabel === sizeLabel);
  const available = stockRow?.stock ?? 0;
  const qty = Number(quantity);
  const unitPriceInCents = reaisToCents(unitPrice);

  const totalInCents =
    unitPriceInCents !== null && Number.isInteger(qty) && qty > 0
      ? unitPriceInCents * qty
      : 0;
  const costInCents = product ? product.costInCents * Math.max(0, qty || 0) : 0;
  const commissionInCents =
    totalInCents > 0
      ? calculateCommission({ costInCents, receivedInCents: totalInCents })
      : 0;

  const invalid =
    !product ||
    !variant ||
    !stockRow ||
    !Number.isInteger(qty) ||
    qty < 1 ||
    qty > available ||
    unitPriceInCents === null ||
    unitPriceInCents <= 0;

  const submit = async () => {
    if (invalid || !variant) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await createPosOrderAction({
        variantId: variant.id,
        sizeLabel,
        quantity: qty,
        unitPriceInCents,
        paymentMethod: payment,
        customerName,
      });
      setLastCode(result.code);
      setMessage(`Venda registrada como #${result.code}.`);
      setQuantity("1");
      setCustomerName("");
      if (product) setUnitPrice(centsToInput(product.priceInCents));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registrar a venda.");
      setLastCode("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className={`${PANEL} px-5 py-4`}>
        <p className="text-[10px] font-semibold tracking-[0.18em] text-copper uppercase">
          Maria&apos;s Store · Admin
        </p>
        <h1 className="mt-1 font-serif text-2xl font-semibold">Venda na loja</h1>
        <p className="mt-0.5 text-[11px] text-[#6E6660]">
          Registre a venda do balcão: o pedido já entra confirmado e o estoque é baixado.
        </p>
      </div>

      <div className={`${PANEL} p-5 sm:p-6`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Peça
            </span>
            <select
              value={productSlug}
              onChange={(event) => {
                const slug = event.target.value;
                const next = products.find((item) => item.slug === slug);
                setProductSlug(slug);
                setVariantId("");
                setSizeLabel("");
                setQuantity("1");
                setUnitPrice(next ? centsToInput(next.priceInCents) : "");
                setMessage("");
              }}
              className={input}
            >
              <option value="">Selecione a peça</option>
              {products.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name} · {formatBRL(item.priceInCents)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Cor
            </span>
            <select
              value={variantId}
              disabled={!product}
              onChange={(event) => {
                setVariantId(event.target.value);
                setSizeLabel("");
                setMessage("");
              }}
              className={input}
            >
              <option value="">Selecione a cor</option>
              {product?.variants.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.colorName}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Tamanho
            </span>
            <select
              value={sizeLabel}
              disabled={!variant}
              onChange={(event) => {
                setSizeLabel(event.target.value);
                setMessage("");
              }}
              className={input}
            >
              <option value="">Selecione o tamanho</option>
              {variant?.stocks.map((item) => (
                <option key={item.sizeLabel} value={item.sizeLabel}>
                  {item.sizeLabel} · {item.stock} disponível(is)
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Quantidade
            </span>
            <input
              type="number"
              min={1}
              max={available || undefined}
              step={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className={input}
            />
            {stockRow && qty > available && (
              <span className="mt-1 block text-[10px] font-semibold text-[#A8432F]">
                Só há {available} disponível(is).
              </span>
            )}
          </label>

          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Valor recebido por peça (R$)
            </span>
            <input
              value={unitPrice}
              onChange={(event) => setUnitPrice(event.target.value)}
              inputMode="decimal"
              placeholder="289,00"
              className={input}
            />
            <span className="mt-1 block text-[10px] text-[#6E6660]">
              Preço da peça: {product ? formatBRL(product.priceInCents) : "—"}. Ajuste se houver
              desconto no balcão.
            </span>
          </label>

          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Pagamento
            </span>
            <select
              value={payment}
              onChange={(event) => setPayment(event.target.value as Payment)}
              className={input}
            >
              {(Object.keys(PAYMENT_LABEL) as Payment[]).map((item) => (
                <option key={item} value={item}>
                  {PAYMENT_LABEL[item]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Cliente (opcional)
            </span>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Nome da cliente"
              className={input}
            />
          </label>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-[#EDE3D8] bg-[#FDFAF8] p-4 sm:grid-cols-3">
          <div>
            <p className="text-[10px] font-semibold tracking-wider text-[#6E6660] uppercase">
              Total recebido
            </p>
            <p className="tabular-price mt-1 font-serif text-xl font-semibold">
              {formatBRL(totalInCents)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-wider text-[#6E6660] uppercase">
              Sua comissão (10%)
            </p>
            <p className="tabular-price mt-1 font-serif text-xl font-semibold text-copper">
              {formatBRL(commissionInCents)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-wider text-[#6E6660] uppercase">
              Parte da loja
            </p>
            <p className="tabular-price mt-1 font-serif text-xl font-semibold">
              {formatBRL(totalInCents - commissionInCents)}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          {message && (
            <span
              className={`flex items-center gap-1.5 text-[11px] font-semibold ${lastCode ? "text-[#2E6B4C]" : "text-[#A8432F]"}`}
            >
              {lastCode && <Check className="h-3.5 w-3.5" />}
              {message}
            </span>
          )}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={invalid || saving || products.length === 0}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#161311] px-6 py-3 text-xs font-semibold text-cream transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ShoppingBag className="h-4 w-4" />
            {saving ? "Registrando..." : "Registrar venda"}
          </button>
        </div>

        {products.length === 0 && (
          <p className="mt-3 text-[11px] text-[#A8432F]">
            Cadastre uma peça antes de registrar vendas.
          </p>
        )}
      </div>
    </div>
  );
}
