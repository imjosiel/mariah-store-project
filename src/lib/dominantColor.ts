/**
 * Extrai uma cor dominante de um arquivo de imagem no navegador.
 * Roda no cliente (canvas), sem servidor, sem biblioteca.
 *
 * Estratégia: amostra gradeada, ignora transparência e extremos claros/escuros,
 * agrupa em buckets e escolhe o bucket mais frequente.
 */

const SAMPLE_STEP = 8;
const BUCKET_SIZE = 24;

function toHex(value: number): string {
  return value.toString(16).padStart(2, "0");
}

export async function extractDominantColor(file: File): Promise<string | null> {
  if (typeof window === "undefined" || typeof Image === "undefined") return null;

  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Não foi possível ler a imagem"));
      img.src = url;
    });

    const width = Math.min(image.naturalWidth, 320);
    const height = Math.min(image.naturalHeight, 320);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;

    context.drawImage(image, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);

    const buckets = new Map<string, { count: number; r: number; g: number; b: number }>();
    for (let y = 0; y < height; y += SAMPLE_STEP) {
      for (let x = 0; x < width; x += SAMPLE_STEP) {
        const index = (y * width + x) * 4;
        const alpha = data[index + 3];
        if (alpha < 180) continue;

        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);

        // ignora branco/quase preto e cores muito dessaturadas
        if (min > 235 || max < 25 || max - min < 18) continue;

        const key = `${Math.floor(r / BUCKET_SIZE)}:${Math.floor(g / BUCKET_SIZE)}:${Math.floor(b / BUCKET_SIZE)}`;
        const current = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
        current.count += 1;
        current.r += r;
        current.g += g;
        current.b += b;
        buckets.set(key, current);
      }
    }

    let best: { count: number; r: number; g: number; b: number } | null = null;
    for (const bucket of buckets.values()) {
      if (!best || bucket.count > best.count) best = bucket;
    }
    if (!best) return null;

    const r = Math.round(best.r / best.count);
    const g = Math.round(best.g / best.count);
    const b = Math.round(best.b / best.count);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
