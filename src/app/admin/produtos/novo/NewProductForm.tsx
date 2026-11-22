"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";

import { createProductAction } from "@/admin-actions";
import { NewVariantCard, emptyVariantDraft, type VariantDraft } from "./NewVariantCard";

const GLASS =
  "rounded-[20px] border border-[#E4DED8] bg-white/90 p-5 shadow-[0_10px_32px_-22px_rgba(59,35,22,0.28)] sm:p-6";

const input =
  "mt-1 w-full rounded-xl border border-[#E4DED8] bg-white/80 px-3 py-2.5 text-sm text-[#141210] placeholder:text-[#6E6660]/70 focus:border-rosegold";

function Field({
  label,
  name,
  placeholder,
  required = true,
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
        {label}
      </span>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={input}
      />
    </label>
  );
}

export function NewProductForm({
  categories,
}: {
  categories: readonly { slug: string; name: string }[];
}) {
  const [state, baseAction, pending] = useActionState(createProductAction, { message: "" });
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [variants, setVariants] = useState<VariantDraft[]>(() => [emptyVariantDraft()]);

  const updateVariant = (index: number, patch: Partial<VariantDraft>) =>
    setVariants((previous) =>
      previous.map((variant, i) => (i === index ? { ...variant, ...patch } : variant))
    );

  const suggestSlug = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const action = (formData: FormData) => {
    const images: File[] = [];
    const payload = variants.map((variant) => {
      let imageIndex: number | null = null;
      if (variant.cutout) {
        imageIndex = images.length;
        images.push(variant.cutout);
      }
      return {
        colorName: variant.colorName,
        colorSlug: variant.colorSlug,
        swatchHex: variant.swatchHex,
        ...variant.atmosphere,
        imageIndex,
        stocks: variant.sizeRows
          .filter((row) => row.sizeLabel.trim())
          .map((row) => ({ sizeLabel: row.sizeLabel.trim(), stock: Number(row.stock) })),
      };
    });

    formData.set("variants", JSON.stringify(payload));
    formData.delete("image");
    for (const file of images) formData.append("image", file, file.name);
    return baseAction(formData);
  };

  const duplicateSlugs = new Set(variants.map((variant) => variant.colorSlug)).size !== variants.length;
  const invalidVariants = variants.some((variant) => {
    const rows = variant.sizeRows.filter((row) => row.sizeLabel.trim());
    return (
      !variant.colorName.trim() ||
      !variant.colorSlug.trim() ||
      rows.length === 0 ||
      rows.some((row) => {
        const stock = Number(row.stock);
        return !Number.isInteger(stock) || stock < 0;
      })
    );
  });

  return (
    <form action={action} className={`${GLASS} mt-6 space-y-5`}>
      <div>
        <h2 className="font-serif text-xl font-semibold">Identidade da peça</h2>
        <p className="mt-0.5 text-[11px] text-[#6E6660]">Nome, categoria e textos da vitrine.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">Nome</span>
          <input
            name="name"
            required
            value={name}
            onChange={(event) => {
              const value = event.target.value;
              setName(value);
              if (!slugTouched) setSlug(suggestSlug(value));
            }}
            className={input}
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">Slug</span>
          <input
            name="slug"
            required
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            className={input}
          />
        </label>
        <Field name="subtitle" label="Subtítulo" placeholder="Modelagem leve e fluida" />
        <Field name="heroWord" label="Palavra do hero" placeholder="LEVEZA" />
        <label className="block">
          <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
            Categoria
          </span>
          <select name="categorySlug" required className={input} defaultValue="">
            <option value="" disabled>
              Selecione
            </option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-2 text-xs text-[#4A4440]">
          <input name="featuredInHero" type="checkbox" className="h-4 w-4 accent-copper" />
          Destacar no hero
        </label>
      </div>

      <Field name="description" label="Descrição" placeholder="Texto de apresentação da peça" />
      <Field name="fabricDetails" label="Composição e toque" placeholder="100% linho..." />
      <Field
        name="careInstructions"
        label="Envio / cuidados (opcional)"
        placeholder="Envio em até 24h úteis"
        required={false}
      />

      <div className="border-t border-[#E4DED8]/70 pt-5">
        <h2 className="font-serif text-xl font-semibold">Valores</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field name="price" label="Preço (R$)" placeholder="289,00" />
          <Field name="cost" label="Custo (R$)" placeholder="145,00" />
        </div>
      </div>

      <div className="border-t border-[#E4DED8]/70 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-semibold">Cores e estoque</h2>
            <p className="mt-0.5 text-[11px] text-[#6E6660]">
              {variants.length} {variants.length === 1 ? "cor" : "cores"} · cada cor tem imagem,
              tema e estoque próprios.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setVariants((previous) => [...previous, emptyVariantDraft()])}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E4DED8] bg-white px-4 py-2 text-[11px] font-semibold text-[#4A4440] transition-colors hover:border-rosegold hover:text-[#141210]"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar cor
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {variants.map((variant, index) => (
            <NewVariantCard
              key={index}
              index={index}
              value={variant}
              canRemove={variants.length > 1}
              onChange={(patch) => updateVariant(index, patch)}
              onRemove={() => setVariants((previous) => previous.filter((_, i) => i !== index))}
            />
          ))}
        </div>

        {duplicateSlugs && (
          <p className="mt-2 text-xs font-semibold text-[#A8432F]">
            Cada cor precisa de um slug diferente.
          </p>
        )}
      </div>

      {state.message && (
        <p className="text-xs font-semibold text-copper">{state.message}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || invalidVariants || duplicateSlugs}
          className="cursor-pointer rounded-full bg-[#161311] px-6 py-3 text-xs font-semibold text-cream transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Criar peça"}
        </button>
      </div>
    </form>
  );
}
