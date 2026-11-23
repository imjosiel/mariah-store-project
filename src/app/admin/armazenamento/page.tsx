import { redirect } from "next/navigation";
import { connection } from "next/server";

import { auth } from "@/auth";
import { canManageAdmins } from "@/domain/admin-access";
import { getSuperAdminEmail } from "@/lib/adminStore";
import { StorageClient } from "./StorageClient";
import { getStorageStatus, StorageError } from "@/lib/r2Store";

export const instant = false;

export default async function ArmazenamentoPage() {
  const session = await auth();
  if (!canManageAdmins(session?.user?.email, await getSuperAdminEmail())) {
    redirect("/admin");
  }

  await connection();

  let status: Awaited<ReturnType<typeof getStorageStatus>> | null = null;
  let error: string | null = null;

  try {
    status = await getStorageStatus();
  } catch (caught) {
    error = caught instanceof StorageError ? caught.message : "Não foi possível consultar o R2.";
  }

  return <StorageClient status={status} error={error} />;
}
