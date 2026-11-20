import {
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

import { prisma } from "./prisma";

/**
 * Imagens no Cloudflare R2 (fora do repositório).
 * Cota por loja gravada no banco (StorageSetting), padrão 1 GB.
 */

export const DEFAULT_LIMIT_BYTES = 1024 * 1024 * 1024;
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/webp", "image/png", "image/jpeg"]);

export class StorageError extends Error {}

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new StorageError(`Configure ${name} na Vercel.`);
  return value;
}

function client(): S3Client {
  const accountId = env("R2_ACCOUNT_ID");
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
  });
}

function bucket(): string {
  return env("R2_BUCKET");
}

function publicBase(): string {
  return env("R2_PUBLIC_URL").replace(/\/$/, "");
}

export async function getStorageSetting(): Promise<{ limitBytes: number }> {
  let row = await prisma.storageSetting.findFirst();
  if (!row) {
    row = await prisma.storageSetting.create({
      data: { limitBytes: DEFAULT_LIMIT_BYTES },
    });
  }
  return { limitBytes: row.limitBytes };
}

export async function setStorageLimitBytes(limitBytes: number): Promise<void> {
  if (!Number.isInteger(limitBytes) || limitBytes < MAX_FILE_BYTES) {
    throw new StorageError("Limite inválido.");
  }
  const row = await prisma.storageSetting.findFirst();
  if (row) {
    await prisma.storageSetting.update({
      where: { id: row.id },
      data: { limitBytes },
    });
  } else {
    await prisma.storageSetting.create({ data: { limitBytes } });
  }
}

export async function getUsedBytes(): Promise<number> {
  const s3 = client();
  let token: string | undefined;
  let total = 0;

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket(),
        ContinuationToken: token,
      })
    );
    for (const object of response.Contents ?? []) {
      total += object.Size ?? 0;
    }
    token = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (token);

  return total;
}

export interface StorageStatus {
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const [used, setting] = await Promise.all([getUsedBytes(), getStorageSetting()]);
  return {
    usedBytes: used,
    limitBytes: setting.limitBytes,
    remainingBytes: Math.max(0, setting.limitBytes - used),
  };
}

export async function uploadImage(
  file: File,
  productSlug: string,
  colorSlug: string
): Promise<string> {
  if (!ALLOWED.has(file.type)) {
    throw new StorageError("Use uma imagem WebP, PNG ou JPG.");
  }
  if (file.size === 0 || file.size > MAX_FILE_BYTES) {
    throw new StorageError("A imagem deve ter entre 1 byte e 8 MB.");
  }

  const status = await getStorageStatus();
  if (file.size > status.remainingBytes) {
    throw new StorageError(
      "Sem espaço suficiente. Aumente o limite no painel de armazenamento."
    );
  }

  const extension = file.type === "image/jpeg" ? "jpg" : file.type.slice(6);
  const safeProduct = productSlug.replace(/[^a-z0-9-]/g, "");
  const safeColor = colorSlug.replace(/[^a-z0-9-]/g, "");
  const key = `produtos/${safeProduct}/${safeColor}-${Date.now()}.${extension}`;

  const body = Buffer.from(await file.arrayBuffer());
  await client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return `${publicBase()}/${key}`;
}
