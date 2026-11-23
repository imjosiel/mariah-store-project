"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { calculateCommission } from "@/domain/commission";
import { reaisToCents } from "@/domain/money";
import { createPosOrderAction } from "@/order-actions";
import { PANEL } from "@/components/admin/AdminShell";
import { PdvOrderPanel, type PdvSummary } from "./PdvOrderPanel";
import { PdvProductCard } from "./PdvProductCard";
import type { AddToCartItem, CartItem, Payment, PdvProduct } from "./types";

export function PdvClient({
  products,
  commissionBps,
}: {
  products: PdvProduct[];
  commissionBps: number;
}) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payment, setPayment] = useState<Payment>("PIX");
  const [customerName, setCustomerName] = useState("");
  const [message, setMessage] = useState("");
  const [lastCode, setLastCode] = useState("");
  const [saving, setSaving] = useState(false);

  const term = query.trim().toLowerCase();
  const categories = Array.from(new Set(products.map((item) => item.categoryName))).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
  const filtered = products.filter((item) => {
    if (categoryFilter && item.categoryName !== categoryFilter) return false;
    return !term || item.name.toLowerCase().includes(term);
  });

  const addItemToCart = (item: AddToCartItem) => {
    const key = `${item.variantId}:${item.sizeLabel}:${item.unitPriceInCents}`;
    const existing = cart.find((entry) => entry.key === key);
    const nextQty = (existing?.quantity ?? 0) + item.quantity;
    if (nextQty > item.available) {
      setMessage(`Só há ${item.available} disponível(is) desse item.`);
      return;
    }
    setCart((prev) =>
      existing
        ? prev.map((entry) => (entry.key === key ? { ...entry, quantity: nextQty } : entry))
        : [
            ...prev,
            {
              key,
              listPriceInCents: item.listPriceInCents,
              available: item.available,
              variantId: item.variantId,
              sizeLabel: item.sizeLabel,
              productName: item.productName,
              colorName: item.colorName,
              swatchHex: item.swatchHex,
              imageUrl: item.imageUrl,
              unitPriceInCents: item.unitPriceInCents,
              unitCostInCents: item.unitCostInCents,
              quantity: item.quantity,
            },
          ]
    );
    setMessage("");
    setLastCode("");
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev.flatMap((item) => {
        if (item.key !== key) return [item];
        const next = item.quantity + delta;
        if (next <= 0) return [];
        if (next > item.available) {
          setMessage(`Só há ${item.available} disponível(is) desse item.`);
          return [item];
        }
        return [{ ...item, quantity: next }];
      })
    );
  };

  const updatePrice = (key: string, value: string) => {
    const cents = reaisToCents(value);
    if (cents === null || cents < 0) return;
    setCart((prev) =>
      prev.map((item) => (item.key === key ? { ...item, unitPriceInCents: cents } : item))
    );
  };

  const removeFromCart = (key: string) =>
    setCart((prev) => prev.filter((item) => item.key !== key));

  const itemsInCents = cart.reduce(
    (sum, item) => sum + item.listPriceInCents * item.quantity,
    0
  );
  const receivedInCents = cart.reduce(
    (sum, item) => sum + item.unitPriceInCents * item.quantity,
    0
  );
  const costInCents = cart.reduce(
    (sum, item) => sum + item.unitCostInCents * item.quantity,
    0
  );
  const summary: PdvSummary = {
    itemsInCents,
    discountInCents: Math.max(0, itemsInCents - receivedInCents),
    subtotalInCents: receivedInCents,
    // Comissão hoje; gateway, nota fiscal e impostos entram aqui quando existirem.
    feesInCents: calculateCommission({
      costInCents,
      receivedInCents,
      commissionBps,
    }),
    totalInCents: receivedInCents,
  };

  const submit = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    setMessage("");
    try {
      const result = await createPosOrderAction({
        items: cart.map((item) => ({
          variantId: item.variantId,
          sizeLabel: item.sizeLabel,
          quantity: item.quantity,
          unitPriceInCents: item.unitPriceInCents,
        })),
        paymentMethod: payment,
        customerName,
      });
      setLastCode(result.code);
      setMessage(`Venda registrada como #${result.code}.`);
      setCart([]);
      setCustomerName("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível registrar a venda.");
      setLastCode("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className={`${PANEL} px-5 py-4`}>
        <p className="text-[10px] font-semibold tracking-[0.18em] text-copper uppercase">
          Maria&apos;s Store · Admin
        </p>
        <h1 className="mt-1 font-serif text-2xl font-semibold">Venda na loja</h1>
        <p className="mt-0.5 text-[11px] text-[#6E6660]">
          Escolha as peças à esquerda e finalize o pedido à direita.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <div className={`${PANEL} min-w-0 flex-1 p-5 sm:p-6`}>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#E4DED8] bg-white px-3 py-2">
              <Search className="h-4 w-4 text-[#6E6660]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar peça"
                className="w-full bg-transparent text-sm text-[#141210] outline-none placeholder:text-[#9A918B]"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryFilter("")}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                categoryFilter === ""
                  ? "border-[#161311] bg-[#161311] text-white"
                  : "border-[#E4DED8] bg-white text-[#4A4440] hover:border-rosegold"
              }`}
            >
              Todas
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setCategoryFilter(category)}
                className={`cursor-pointer rounded-full border px-3 py-1.5 text-[10px] font-semibold transition-colors ${
                  categoryFilter === category
                    ? "border-[#161311] bg-[#161311] text-white"
                    : "border-[#E4DED8] bg-white text-[#4A4440] hover:border-rosegold"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <p className="mt-4 text-[11px] text-[#6E6660]">
            {filtered.length} {filtered.length === 1 ? "peça" : "peças"}
          </p>

          {filtered.length === 0 ? (
            <p className="mt-5 text-center text-sm text-[#6E6660]">Nenhuma peça encontrada.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filtered.map((item) => (
                <PdvProductCard key={item.slug} product={item} onAdd={addItemToCart} />
              ))}
            </div>
          )}
        </div>

        <PdvOrderPanel
          cart={cart}
          summary={summary}
          payment={payment}
          customerName={customerName}
          message={message}
          lastCode={lastCode}
          saving={saving}
          onQty={updateQty}
          onPrice={updatePrice}
          onRemove={removeFromCart}
          onClear={() => setCart([])}
          onPayment={setPayment}
          onCustomer={setCustomerName}
          onSubmit={() => void submit()}
        />
      </div>
    </div>
  );
}
