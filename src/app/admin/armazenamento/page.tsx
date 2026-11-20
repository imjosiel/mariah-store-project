import { StorageClient } from "./StorageClient";
import { getStorageStatus, StorageError } from "@/lib/r2Store";

export const instant = false;

export default async function ArmazenamentoPage() {
  let status: Awaited<ReturnType<typeof getStorageStatus>> | null = null;
  let error: string | null = null;

  try {
    status = await getStorageStatus();
  } catch (caught) {
    error = caught instanceof StorageError ? caught.message : "Não foi possível consultar o R2.";
  }

  return <StorageClient status={status} error={error} />;
}
