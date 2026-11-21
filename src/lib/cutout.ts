import { removeBackground } from "@imgly/background-removal";

/**
 * Remove o fundo no navegador e devolve um WebP com alpha.
 * Modelo quint8 (~40 MB) — baixado uma vez e cacheado pelo navegador.
 * Nada é enviado a servidor de terceiros; o upload para o R2 acontece depois.
 */
export async function makeCutout(
  file: File,
  onProgress?: (message: string) => void
): Promise<File> {
  onProgress?.("Carregando modelo de recorte…");

  const blob = await removeBackground(file, {
    model: "isnet_quint8",
    device: "gpu",
    output: { format: "image/webp", quality: 0.92 },
    progress: (_key: string, current: number, total: number) => {
      if (total > 0 && current < total) {
        onProgress?.(
          `Preparando recorte… ${Math.round((current / total) * 100)}%`
        );
      }
    },
  });

  onProgress?.("Recorte pronto.");
  const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
  return new File([blob], name, { type: "image/webp" });
}
