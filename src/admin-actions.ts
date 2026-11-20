"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { canManageAdmins } from "@/domain/admin-access";
import { reaisToCents } from "@/domain/money";
import {
  addAdminEmail,
  getSuperAdminEmail,
  removeAdminEmail,
} from "@/lib/adminStore";
import {
  addVariant,
  createProduct,
  resetProducts,
  saveProducts,
  type NewProductInput,
  type NewVariantInput,
  type ProductUpdate,
} from "@/lib/productStore";

export type AdminActionState = { message: string };

function validMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

export async function saveProductsAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  if (!(await isSuperAdmin())) return { message: "Acesso negado." };

  const raw = String(formData.get("products") ?? "[]");
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { message: "Dados inválidos." };

    const updates: ProductUpdate[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") return { message: "Dados inválidos." };
      const entry = item as Record<string, unknown>;
      if (
        typeof entry.slug !== "string" ||
        !validMoney(entry.priceInCents) ||
        !validMoney(entry.costInCents) ||
        !Array.isArray(entry.stocks)
      ) {
        return { message: "Dados inválidos." };
      }

      const stocks: ProductUpdate["stocks"] = [];
      for (const rawStock of entry.stocks) {
        if (!rawStock || typeof rawStock !== "object") return { message: "Dados inválidos." };
        const stock = rawStock as Record<string, unknown>;
        if (
          typeof stock.colorSlug !== "string" ||
          typeof stock.sizeLabel !== "string" ||
          !validMoney(stock.stock)
        ) {
          return { message: "Dados inválidos." };
        }
        stocks.push({
          colorSlug: stock.colorSlug,
          sizeLabel: stock.sizeLabel,
          stock: stock.stock,
        });
      }

      updates.push({
        slug: entry.slug,
        priceInCents: entry.priceInCents,
        costInCents: entry.costInCents,
        stocks,
      });
    }

    await saveProducts(updates);
    revalidatePath("/admin/produtos");
    return { message: "Produtos salvos no banco." };
  } catch {
    return { message: "Não foi possível salvar." };
  }
}

export async function createProductAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  if (!(await isSuperAdmin())) return { message: "Acesso negado." };

  const required = [
    "slug",
    "name",
    "subtitle",
    "heroWord",
    "description",
    "fabricDetails",
    "categorySlug",
    "colorName",
    "colorSlug",
    "swatchHex",
    "cutoutImageUrl",
  ];
  const values: Record<string, string> = {};
  for (const key of required) {
    const value = String(formData.get(key) ?? "").trim();
    if (!value) return { message: `Preencha ${key}.` };
    values[key] = value;
  }

  const priceInCents = reaisToCents(String(formData.get("price") ?? ""));
  const costInCents = reaisToCents(String(formData.get("cost") ?? ""));
  if (priceInCents === null || costInCents === null) {
    return { message: "Preço ou custo inválido." };
  }

  const stocksRaw = String(formData.get("stocks") ?? "");
  const stocks: NewProductInput["variant"]["stocks"] = [];
  for (const part of stocksRaw.split(",")) {
    const [sizeLabel, rawQty] = part.split(":").map((item) => item?.trim());
    if (!sizeLabel || rawQty === undefined) continue;
    const stock = Number(rawQty);
    if (!Number.isInteger(stock) || stock < 0) return { message: "Estoque inválido." };
    stocks.push({ sizeLabel, stock });
  }
  if (stocks.length === 0) return { message: "Informe ao menos um tamanho." };

  try {
    await createProduct({
      slug: values.slug,
      name: values.name,
      subtitle: values.subtitle,
      heroWord: values.heroWord,
      description: values.description,
      fabricDetails: values.fabricDetails,
      careInstructions: String(formData.get("careInstructions") ?? "").trim() || undefined,
      priceInCents,
      costInCents,
      categorySlug: values.categorySlug,
      featuredInHero: formData.get("featuredInHero") === "on",
      variant: {
        colorName: values.colorName,
        colorSlug: values.colorSlug,
        swatchHex: values.swatchHex,
        cutoutImageUrl: values.cutoutImageUrl,
        atmosphereBg: String(formData.get("atmosphereBg") ?? "#FAF3EB"),
        atmosphereGlow: String(formData.get("atmosphereGlow") ?? "#FFFDF9"),
        atmosphereText: String(formData.get("atmosphereText") ?? "#3B2316"),
        isLightTheme: formData.get("isLightTheme") === "on",
        stocks,
      },
    });
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Não foi possível criar a peça.",
    };
  }

  revalidatePath("/admin/produtos");
  redirect("/admin/produtos");
}

export async function addVariantAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  if (!(await isSuperAdmin())) return { message: "Acesso negado." };

  const raw = String(formData.get("variant") ?? "");
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { message: "Dados inválidos." };
    }
    const item = parsed as Record<string, unknown>;
    const textFields = [
      "productSlug",
      "colorName",
      "colorSlug",
      "swatchHex",
      "cutoutImageUrl",
      "atmosphereBg",
      "atmosphereGlow",
      "atmosphereText",
    ];
    for (const key of textFields) {
      if (typeof item[key] !== "string" || !String(item[key]).trim()) {
        return { message: `Preencha ${key}.` };
      }
    }
    if (!Array.isArray(item.stocks) || item.stocks.length === 0) {
      return { message: "Informe ao menos um tamanho." };
    }

    const stocks: NewVariantInput["stocks"] = [];
    for (const rawStock of item.stocks) {
      if (!rawStock || typeof rawStock !== "object") return { message: "Dados inválidos." };
      const stock = rawStock as Record<string, unknown>;
      if (
        typeof stock.sizeLabel !== "string" ||
        typeof stock.stock !== "number" ||
        !Number.isInteger(stock.stock) ||
        stock.stock < 0
      ) {
        return { message: "Estoque inválido." };
      }
      stocks.push({ sizeLabel: stock.sizeLabel, stock: stock.stock });
    }

    await addVariant({
      productSlug: String(item.productSlug),
      colorName: String(item.colorName),
      colorSlug: String(item.colorSlug),
      swatchHex: String(item.swatchHex),
      cutoutImageUrl: String(item.cutoutImageUrl),
      atmosphereBg: String(item.atmosphereBg),
      atmosphereGlow: String(item.atmosphereGlow),
      atmosphereText: String(item.atmosphereText),
      isLightTheme: item.isLightTheme === true,
      stocks,
    });
    revalidatePath("/admin/produtos");
    return { message: "Cor adicionada." };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Não foi possível adicionar a cor.",
    };
  }
}

export async function resetProductsAction(): Promise<void> {
  if (!(await isSuperAdmin())) return;
  await resetProducts();
  revalidatePath("/admin/produtos");
}

async function isSuperAdmin(): Promise<boolean> {
  const session = await auth();
  return canManageAdmins(session?.user?.email, await getSuperAdminEmail());
}

export async function addAdminAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  if (!(await isSuperAdmin())) return { message: "Acesso negado." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) return { message: "Informe um e-mail válido." };

  const next = await addAdminEmail(email);
  revalidatePath("/admin/usuarios");

  return {
    message: next.includes(email) ? "Administrador adicionado." : "E-mail já estava na lista.",
  };
}

export async function removeAdminAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  if (!(await isSuperAdmin())) return { message: "Acesso negado." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { message: "E-mail não informado." };

  const next = await removeAdminEmail(email);
  revalidatePath("/admin/usuarios");

  return {
    message: next.includes(email)
      ? "Não foi possível remover (super admin ou inexistente)."
      : "Administrador removido.",
  };
}
