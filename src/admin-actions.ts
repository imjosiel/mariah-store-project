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
  resetProductCosts,
  saveProductCosts,
} from "@/lib/productStore";

export type AdminActionState = { message: string };

export async function saveCostsAction(
  _prev: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  if (!(await isSuperAdmin())) return { message: "Acesso negado." };

  const raw = String(formData.get("costs") ?? "{}");
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { message: "Dados inválidos." };
    }
    const costs: Record<string, number> = {};
    for (const [slug, value] of Object.entries(parsed)) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        return { message: "Valor inválido." };
      }
      costs[slug] = value;
    }
    await saveProductCosts(costs);
    revalidatePath("/admin/produtos");
    return { message: "Custos salvos no banco." };
  } catch {
    return { message: "Não foi possível salvar." };
  }
}

export async function resetCostsAction(): Promise<void> {
  if (!(await isSuperAdmin())) return;
  await resetProductCosts();
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
