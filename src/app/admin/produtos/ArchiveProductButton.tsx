"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { archiveProductAction, restoreProductAction } from "@/admin-actions";

/** Arquivar preserva pedidos, NF e comissão; reativar traz a peça de volta. */
export function ArchiveProductButton({
  slug,
  mode,
  onDone,
}: {
  slug: string;
  mode: "archive" | "restore";
  onDone?: () => void;
}) {
  const action = mode === "archive" ? archiveProductAction : restoreProductAction;
  const [state, formAction, pending] = useActionState(action, { message: "" });
  const [confirming, setConfirming] = useState(false);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (state.ok) doneRef.current?.();
  }, [state.ok]);

  const isArchive = mode === "archive";
  const label = isArchive ? "Arquivar peça" : "Reativar peça";
  const confirmLabel = isArchive ? "Arquivar" : "Reativar";

  return (
    <div className="flex flex-wrap items-center gap-2">
      {confirming ? (
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="slug" value={slug} />
          <span className="text-[10px] font-semibold text-[#141210]">
            {isArchive ? "Arquivar esta peça?" : "Reativar esta peça?"}
          </span>
          <button
            type="submit"
            disabled={pending}
            className="cursor-pointer rounded-full bg-[#A8432F] px-3 py-1.5 text-[10px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Aguarde..." : `Confirmar: ${confirmLabel}`}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="cursor-pointer rounded-full border border-[#E4DED8] px-3 py-1.5 text-[10px] font-semibold text-[#4A4440] hover:text-[#141210]"
          >
            Cancelar
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="cursor-pointer rounded-full border border-[#E4DED8] px-3 py-1.5 text-[10px] font-semibold text-[#4A4440] transition-colors hover:border-[#A8432F] hover:text-[#A8432F]"
        >
          {label}
        </button>
      )}
      {state.message && (
        <span className="text-[10px] font-semibold text-[#A8432F]">{state.message}</span>
      )}
    </div>
  );
}
