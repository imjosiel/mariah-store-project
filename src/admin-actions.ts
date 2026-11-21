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
  replaceVariantSizes,
  saveProducts,
  setProductSizes,
  setProductSizeSystem,
  setVariantImage,
  type NewProductInput,
  type NewVariantInput,
  type ProductUpdate,
  type SizeSystem,
} from "@/lib/productStore";
import { StorageError, setStorageLimitBytes, uploadImage } from "@/lib/r2Store";
import { prisma } from "@/lib/prisma";

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

export async function uploadImageAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  if (!(await isSuperAdmin())) return { message: "Acesso negado." };

  const productSlug = String(formData.get("productSlug") ?? "");
  const colorSlug = String(formData.get("colorSlug") ?? "");
  const file = formData.get("image");

  if (!productSlug || !colorSlug) return { message: "Peça ou cor não informada." };
  if (!(file instanceof File)) return { message: "Selecione uma imagem." };

  try {
    const url = await uploadImage(file, productSlug, colorSlug);
    await setVariantImage(productSlug, colorSlug, url);
    revalidatePath("/admin/produtos");
    revalidatePath("/");
    return { message: "Imagem enviada." };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Não foi possível enviar a imagem.",
    };
  }
}

export async function setStorageLimitAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  if (!(await isSuperAdmin())) return { message: "Acesso negado." };

  const gb = Number(formData.get("limitGb"));
  if (!Number.isFinite(gb) || gb < 0.01 || gb > 100) {
    return { message: "Informe um limite entre 0,01 GB e 100 GB." };
  }

  try {
    await setStorageLimitBytes(Math.round(gb * 1024 * 1024 * 1024));
    revalidatePath("/admin/armazenamento");
    return { message: "Limite atualizado." };
  } catch (error) {
    return {
      message: error instanceof StorageError ? error.message : "Não foi possível salvar.",
    };
  }
}

export async function setSizeSystemAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  if (!(await isSuperAdmin())) return { message: "Acesso negado." };

  const slug = String(formData.get("productSlug") ?? "");
  const system = String(formData.get("sizeSystem") ?? "") as SizeSystem;
  const presets: SizeSystem[] = [
    "numbers",
    "numbers-plus",
    "letters",
    "letters-plus",
    "unique",
  ];
  if (!slug || !presets.includes(system)) {
    return { message: "Dados inválidos." };
  }

  try {
    await setProductSizeSystem(slug, system as Exclude<SizeSystem, "custom">);
    revalidatePath("/admin/produtos");
    revalidatePath("/");
    return { message: "Tamanhos atualizados." };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Não foi possível alterar os tamanhos.",
    };
  }
}

export async function setSizesAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  if (!(await isSuperAdmin())) return { message: "Acesso negado." };

  const slug = String(formData.get("productSlug") ?? "");
  if (!slug) return { message: "Peça não informada." };

  try {
    const parsed: unknown = JSON.parse(String(formData.get("changes") ?? "[]"));
    if (!Array.isArray(parsed)) return { message: "Dados inválidos." };

    const changes = parsed.map((item: unknown) => {
      if (!item || typeof item !== "object") throw new Error("Dados inválidos.");
      const entry = item as Record<string, unknown>;
      if (
        typeof entry.variantId !== "string" ||
        !Array.isArray(entry.labels) ||
        !entry.labels.every((label) => typeof label === "string")
      ) {
        throw new Error("Dados inválidos.");
      }
      return { variantId: entry.variantId, labels: entry.labels as string[] };
    });

    if (changes.length === 0) return { message: "Nenhum tamanho informado." };
    await setProductSizes(slug, changes);
    revalidatePath("/admin/produtos");
    revalidatePath("/");
    return { message: "Tamanhos atualizados." };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Não foi possível salvar os tamanhos.",
    };
  }
}

export async function saveVariantAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  if (!(await isSuperAdmin())) return { message: "Acesso negado." };

  const slug = String(formData.get("productSlug") ?? "");
  const variantId = String(formData.get("variantId") ?? "");
  if (!slug || !variantId) return { message: "Peça ou cor não informada." };

  const priceInCents = reaisToCents(String(formData.get("price") ?? ""));
  const costInCents = reaisToCents(String(formData.get("cost") ?? ""));
  if (priceInCents === null || costInCents === null) {
    return { message: "Preço ou custo inválido." };
  }

  try {
    const parsed: unknown = JSON.parse(String(formData.get("sizes") ?? "[]"));
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { message: "Informe ao menos um tamanho." };
    }

    const sizes = parsed.map((item: unknown) => {
      if (!item || typeof item !== "object") throw new Error("Dados inválidos.");
      const entry = item as Record<string, unknown>;
      if (
        typeof entry.label !== "string" ||
        typeof entry.stock !== "number" ||
        !Number.isInteger(entry.stock) ||
        entry.stock < 0
      ) {
        throw new Error("Dados inválidos.");
      }
      return { label: entry.label, stock: entry.stock };
    });

    await saveProducts([{ slug, priceInCents, costInCents, stocks: [] }]);
    await replaceVariantSizes(slug, variantId, sizes);

    const image = formData.get("image");
    let imageMessage = "";
    if (image instanceof File && image.size > 0) {
      const variant = await prisma.productVariant.findFirst({
        where: { id: variantId, product: { slug } },
        select: { colorSlug: true },
      });
      if (!variant) throw new Error("Cor não encontrada.");
      const url = await uploadImage(image, slug, variant.colorSlug);
      await setVariantImage(slug, variant.colorSlug, url);
      imageMessage = " Imagem enviada.";
    }

    revalidatePath("/admin/produtos");
    revalidatePath("/");
    return { message: `Cor salva.${imageMessage}` };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Não foi possível salvar a cor.",
    };
  }
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
