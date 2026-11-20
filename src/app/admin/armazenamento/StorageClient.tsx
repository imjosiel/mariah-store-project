"use client";

import { useActionState } from "react";
import { HardDrive } from "lucide-react";

import { setStorageLimitAction } from "@/admin-actions";
import { PANEL } from "@/components/admin/AdminShell";

function gb(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(2).replace(".", ",");
}

export function StorageClient({
  status,
  error,
}: {
  status: { usedBytes: number; limitBytes: number; remainingBytes: number } | null;
  error: string | null;
}) {
  const [state, action, pending] = useActionState(setStorageLimitAction, { message: "" });
  const percent = status ? Math.min(100, (status.usedBytes / status.limitBytes) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className={`${PANEL} flex flex-wrap items-center gap-3 px-5 py-4`}>
        <HardDrive className="h-5 w-5 text-[#C0563E]" />
        <div>
          <p className="text-[10px] font-semibold tracking-[0.18em] text-[#C0563E] uppercase">
            Maria&apos;s Store · Admin
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold">Armazenamento</h1>
          <p className="mt-0.5 text-[11px] text-[#6E6660]">
            Fotos no Cloudflare R2. Cota padrão de 1 GB por loja.
          </p>
        </div>
      </div>

      {error ? (
        <div className={`${PANEL} p-6`}>
          <p className="text-sm font-semibold text-[#A8432F]">Configuração pendente</p>
          <p className="mt-2 text-xs text-[#4A4440]">{error}</p>
          <p className="mt-3 text-[11px] leading-relaxed text-[#6E6660]">
            Cadastre `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
            `R2_BUCKET` e `R2_PUBLIC_URL` nas env vars da Vercel.
          </p>
        </div>
      ) : status ? (
        <>
          <div className={`${PANEL} p-5 sm:p-6`}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold tracking-wider text-[#6E6660] uppercase">
                  Espaço usado
                </p>
                <p className="tabular-price mt-1 font-serif text-3xl font-semibold text-[#141210]">
                  {gb(status.usedBytes)} GB
                  <span className="text-lg text-[#6E6660]"> / {gb(status.limitBytes)} GB</span>
                </p>
              </div>
              <p className="tabular-price text-[11px] text-[#4A4440]">
                {gb(status.remainingBytes)} GB disponíveis
              </p>
            </div>

            <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-[#F1ECE7]">
              <div
                className="h-full rounded-full bg-[#C0563E] transition-[width] duration-500"
                style={{ width: `${Math.max(2, percent)}%` }}
              />
            </div>
          </div>

          <form action={action} className={`${PANEL} p-5 sm:p-6`}>
            <h2 className="font-serif text-xl font-semibold">Ajustar limite</h2>
            <p className="mt-0.5 text-[11px] text-[#6E6660]">
              Use quando a loja contratar mais espaço.
            </p>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="block text-[10px] font-semibold tracking-wider text-[#4A4440] uppercase">
                  Limite (GB)
                </span>
                <input
                  name="limitGb"
                  type="number"
                  min={0.01}
                  max={100}
                  step={0.01}
                  defaultValue={(status.limitBytes / (1024 * 1024 * 1024)).toFixed(2)}
                  className="tabular-price mt-1 w-32 rounded-xl border border-[#E4DED8] bg-white px-3 py-2.5 text-sm text-[#141210] focus:border-rosegold"
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="cursor-pointer rounded-full bg-[#161311] px-5 py-2.5 text-[11px] font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {pending ? "Salvando..." : "Salvar limite"}
              </button>
            </div>

            {state.message && (
              <p className="mt-3 text-[11px] font-semibold text-[#A8432F]">{state.message}</p>
            )}
          </form>
        </>
      ) : null}
    </div>
  );
}
