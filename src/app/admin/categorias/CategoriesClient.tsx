"use client";

import { useActionState, useState } from "react";

import { addCategoryAction, removeCategoryAction } from "@/admin-actions";
import { PANEL } from "@/components/admin/AdminShell";

const input =
  "mt-1 w-full rounded-xl border border-[#E4DED8] bg-white px-3 py-2.5 text-sm text-[#141210] placeholder:text-[#9A918B] focus:border-rosegold";

export function CategoriesClient({
  categories,
}: {
  categories: Array<{ slug: string; name: string; products: number }>;
}) {
  const [state, action, pending] = useActionState(addCategoryAction, { message: "" });
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);

  const suggestion = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className={`${PANEL} px-5 py-4`}>
        <p className="text-[10px] font-semibold tracking-[0.18em] text-[#C0563E] uppercase">
          Maria&apos;s Store · Admin
        </p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-[#141210]">Categorias</h1>
      </div>

      <div className={`${PANEL} p-5`}>
        <h2 className="font-serif text-xl font-semibold">Adicionar categoria</h2>
        <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Nome
            </span>
            <input
              name="name"
              required
              value={name}
              onChange={(event) => {
                const value = event.target.value;
                setName(value);
                if (!touched) setSlug(suggestion(value));
              }}
              placeholder="Acessórios"
              className={input}
            />
          </label>
          <label className="block">
            <span className="text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
              Slug
            </span>
            <input
              name="slug"
              required
              value={slug}
              onChange={(event) => {
                setTouched(true);
                setSlug(event.target.value);
              }}
              placeholder="acessorios"
              className={input}
            />
          </label>
          <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="cursor-pointer rounded-full bg-[#161311] px-5 py-2.5 text-xs font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
            >
              {pending ? "Adicionando..." : "Adicionar"}
            </button>
            {state.message && (
              <span className="text-[11px] font-semibold text-[#A8432F]">{state.message}</span>
            )}
          </div>
        </form>
      </div>

      <div className={`${PANEL} overflow-hidden`}>
        <div className="border-b border-[#EDE3D8] px-5 py-4">
          <h2 className="font-serif text-xl font-semibold">
            {categories.length} {categories.length === 1 ? "categoria" : "categorias"}
          </h2>
        </div>
        <ul className="divide-y divide-[#F1ECE7]">
          {categories.map((category) => (
            <CategoryRow key={category.slug} category={category} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function CategoryRow({
  category,
}: {
  category: { slug: string; name: string; products: number };
}) {
  const [state, action, pending] = useActionState(removeCategoryAction, { message: "" });

  return (
    <li>
      <form action={action} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <input type="hidden" name="slug" value={category.slug} />
        <div>
          <p className="text-sm font-semibold text-[#141210]">{category.name}</p>
          <p className="tabular-price text-[10px] text-[#6E6660]">
            {category.slug} · {category.products}{" "}
            {category.products === 1 ? "peça" : "peças"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {category.products === 0 && (
            <button
              type="submit"
              disabled={pending}
              className="cursor-pointer rounded-full border border-[#E4DED8] px-3 py-1.5 text-[11px] font-semibold text-[#4A4440] transition-colors hover:border-[#A8432F] hover:text-[#A8432F] disabled:opacity-40"
            >
              Remover
            </button>
          )}
          {state.message && (
            <span className="text-[10px] font-semibold text-[#A8432F]">{state.message}</span>
          )}
        </div>
      </form>
    </li>
  );
}
