import { preload, removeBackground, type Config } from "@imgly/background-removal";

/**
 * Configuração compartilhada: o preload e o processamento usam exatamente
 * o mesmo modelo, então o cache do navegador é reaproveitado.
 */
const config: Config = {
  model: "isnet_quint8",
  device: "gpu",
  output: { format: "image/webp", quality: 0.92 },
};

let preloading: Promise<void> | null = null;

/** Chamado ao abrir o admin, para esquentar o modelo antes do primeiro upload. */
export function preloadCutout(): Promise<void> {
  if (!preloading) {
    preloading = preload(config).catch(() => undefined);
  }
  return preloading;
}

/** Remove o fundo no navegador e devolve um WebP com alpha. */
export async function makeCutout(
  file: File,
  onProgress?: (message: string) => void
): Promise<File> {
  onProgress?.("Carregando modelo de recorte…");
  void preloadCutout();

  const blob = await removeBackground(file, {
    ...config,
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
