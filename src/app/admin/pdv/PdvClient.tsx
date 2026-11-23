"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Search, ShoppingBag } from "lucide-react";

import { formatBRL } from "@/lib/money";
import { reaisToCents } from "@/domain/money";
import { calculateCommission } from "@/domain/commission";
import { createPosOrderAction } from "@/order-actions";
import { PANEL } from "@/components/admin/AdminShell";

type Product = {
  slug: string;
  name: string;
  categoryName: string;
  imageUrl: string;
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
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
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

  const term = query.trim().toLowerCase();
  const categories = Array.from(new Set(products.map((item) => item.categoryName))).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  const filtered = products.filter((item) => {
    if (categoryFilter && item.categoryName !== categoryFilter) return false;
    return !term || item.name.toLowerCase().includes(term);
  });

  const selectProduct = (slug: string) => {
    const next = products.find((item) => item.slug === slug);
    setProductSlug(slug);
    setVariantId("");
    setSizeLabel("");
    setQuantity("1");
    setUnitPrice(next ? centsToInput(next.priceInCents) : "");
    setMessage("");
    setLastCode("");
  };

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
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#EDE3D8] bg-[#FDFAF8] px-3 py-2 sm:col-span-2">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Peça selecionada
            </span>
            <span className="text-xs font-semibold text-[#141210]">
              {product ? product.name : "Escolha uma peça na grade abaixo"}
            </span>
          </div>

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

      <div className={`${PANEL} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-semibold">Escolha a peça</h2>
            <p className="mt-0.5 text-[11px] text-[#6E6660]">Toque na peça para selecioná-la.</p>
          </div>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            aria-label="Filtrar por categoria"
            className="min-w-[180px] flex-1 rounded-xl border border-[#E4DED8] bg-white px-3 py-2 text-xs font-semibold text-[#4A4440] sm:max-w-xs"
          >
            <option value="">Todas as categorias</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-[#E4DED8] bg-white px-3 py-2">
            <Search className="h-4 w-4 text-[#6E6660]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar peça"
              className="w-40 bg-transparent text-sm text-[#141210] outline-none placeholder:text-[#9A918B]"
            />
          </label>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-5 text-center text-sm text-[#6E6660]">Nenhuma peça encontrada.</p>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((item) => {
              const selected = item.slug === productSlug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  onClick={() => selectProduct(item.slug)}
                  aria-pressed={selected}
                  className={`cursor-pointer rounded-2xl border p-3 text-left transition-colors ${
                    selected
                      ? "border-[#C0563E] bg-[#C0563E]/5 ring-2 ring-[#C0563E]/30"
                      : "border-[#EDE3D8] bg-[#FDFAF8] hover:border-rosegold"
                  }`}
                >
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-[#F7F4F1]">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 40vw, 200px"
                        className="object-contain"
                        unoptimized
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] text-[#9A918B]">
                        sem foto
                      </span>
                    )}
                  </div>
                  <p className="mt-2 truncate text-xs font-semibold text-[#141210]">{item.name}</p>
                  <p className="tabular-price text-[11px] text-[#6E6660]">
                    {formatBRL(item.priceInCents)}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
