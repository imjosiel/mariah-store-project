"use client";

import { useActionState, useState } from "react";

import { createProductAction } from "@/admin-actions";
import { makeCutout } from "@/lib/cutout";

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
  const [cutout, setCutout] = useState<File | null>(null);
  const [imageName, setImageName] = useState("");
  const [cutStatus, setCutStatus] = useState("");

  const action = (formData: FormData) => {
    if (cutout) formData.set("image", cutout, cutout.name);
    return baseAction(formData);
  };

  const suggestSlug = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

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
        <h2 className="font-serif text-xl font-semibold">Primeira cor e estoque</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field name="colorName" label="Nome da cor" placeholder="Vinho Rosé" />
          <Field name="colorSlug" label="Slug da cor" placeholder="vinho-rose" />
          <Field name="swatchHex" label="Hex da cor" placeholder="#6C2E3B" />
          <div className="sm:col-span-2">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Imagem da peça (fundo removido automaticamente)
            </span>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E4DED8] bg-white px-3 py-2 text-[11px] font-semibold text-[#4A4440] transition-colors hover:border-rosegold hover:text-[#141210]">
                Selecionar arquivo
                <input
                  type="file"
                  name="image"
                  accept="image/webp,image/png,image/jpeg"
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setCutout(null);
                    setImageName(file.name);
                    setCutStatus("Removendo fundo…");
                    try {
                      const result = await makeCutout(file, setCutStatus);
                      setCutout(result);
                      setImageName(result.name);
                    } catch {
                      setCutStatus("Não foi possível remover o fundo.");
                    } finally {
                      setCutStatus("");
                    }
                  }}
                />
              </label>
              {imageName && <span className="text-[10px] text-[#6E6660]">{imageName}</span>}
            </div>
            {cutStatus && <p className="mt-1 text-[10px] text-[#6E6660]">{cutStatus}</p>}
            <p className="mt-1 text-[10px] text-muted">
              O upload para o R2 acontece ao criar a peça.
            </p>
          </div>
          <Field name="atmosphereBg" label="Fundo da atmosfera" defaultValue="#FAF3EB" />
          <Field name="atmosphereGlow" label="Brilho da atmosfera" defaultValue="#FFFDF9" />
          <Field name="atmosphereText" label="Texto da atmosfera" defaultValue="#3B2316" />
          <label className="flex items-end gap-2 pb-2 text-xs text-[#4A4440]">
            <input name="isLightTheme" type="checkbox" className="h-4 w-4 accent-copper" />
            Tema claro
          </label>
        </div>
        <div className="mt-4">
          <Field
            name="stocks"
            label="Estoque (PP:3,P:5,M:4,G:2)"
            placeholder="PP:3,P:5,M:4,G:2"
          />
        </div>
      </div>

      {state.message && (
        <p className="text-xs font-semibold text-copper">{state.message}</p>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-full bg-[#161311] px-6 py-3 text-xs font-semibold text-cream transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {pending ? "Salvando..." : "Criar peça"}
        </button>
      </div>
    </form>
  );
}
