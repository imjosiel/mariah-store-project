import { put } from "@vercel/blob";

/**
 * Imagens das peças no Vercel Blob — fora do repositório.
 * Requer BLOB_READ_WRITE_TOKEN no ambiente (Vercel e .env.local).
 */

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/webp", "image/png", "image/jpeg"]);

export class ImageUploadError extends Error {}

export async function uploadProductImage(
  file: File,
  productSlug: string,
  colorSlug: string
): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new ImageUploadError("Configure BLOB_READ_WRITE_TOKEN na Vercel.");
  }
  if (!ALLOWED.has(file.type)) {
    throw new ImageUploadError("Use uma imagem WebP, PNG ou JPG.");
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    throw new ImageUploadError("A imagem deve ter entre 1 byte e 8 MB.");
  }

  const extension = file.type === "image/jpeg" ? "jpg" : file.type.slice(6);
  const safeProduct = productSlug.replace(/[^a-z0-9-]/g, "");
  const safeColor = colorSlug.replace(/[^a-z0-9-]/g, "");
  const pathname = `produtos/${safeProduct}/${safeColor}-${Date.now()}.${extension}`;

  const blob = await put(pathname, file, {
    access: "public",
    contentType: file.type,
    addRandomSuffix: false,
  });

  return blob.url;
}
