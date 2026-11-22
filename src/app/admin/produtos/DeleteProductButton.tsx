"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { deleteProductAction } from "@/admin-actions";

/** Exclusão definitiva: pedidos e valores ficam, os itens da peça saem deles. */
export function DeleteProductButton({
  slug,
  onDone,
}: {
  slug: string;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(deleteProductAction, { message: "" });
  const [confirming, setConfirming] = useState(false);
  const doneRef = useRef(onDone);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (state.ok) doneRef.current?.();
  }, [state.ok]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {confirming ? (
        <form action={formAction} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="slug" value={slug} />
          <span className="text-[10px] font-semibold text-[#A8432F]">
            Excluir definitivamente? Os itens vendidos saem dos pedidos. Não pode ser desfeito.
          </span>
          <button
            type="submit"
            disabled={pending}
            className="cursor-pointer rounded-full bg-[#8C2E22] px-3 py-1.5 text-[10px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Aguarde..." : "Excluir"}
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
          className="cursor-pointer rounded-full border border-[#E4DED8] px-3 py-1.5 text-[10px] font-semibold text-[#4A4440] transition-colors hover:border-[#8C2E22] hover:text-[#8C2E22]"
        >
          Excluir
        </button>
      )}
      {state.message && (
        <span className="text-[10px] font-semibold text-[#A8432F]">{state.message}</span>
      )}
    </div>
  );
}
