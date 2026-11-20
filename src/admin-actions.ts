"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { canManageAdmins } from "@/domain/admin-access";
import {
  addAdminEmail,
  getSuperAdminEmail,
  removeAdminEmail,
} from "@/lib/adminStore";
import {
  resetProducts,
  saveProducts,
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
