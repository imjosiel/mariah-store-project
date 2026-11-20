"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { UploadCloud } from "lucide-react";

import { uploadImageAction } from "@/admin-actions";

export function ImageUpload({
  productSlug,
  colorSlug,
  currentUrl,
}: {
  productSlug: string;
  colorSlug: string;
  currentUrl?: string;
}) {
  const [state, action, pending] = useActionState(uploadImageAction, { message: "" });
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <form action={action} className="mt-3 border-t border-[#EDE3D8] pt-3">
      <input type="hidden" name="productSlug" value={productSlug} />
      <input type="hidden" name="colorSlug" value={colorSlug} />

      <div className="flex flex-wrap items-center gap-3">
        {(preview || currentUrl) && (
          <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-[#F7F4F1]">
            <Image
              src={(preview || currentUrl)!}
              alt="Prévia da peça"
              fill
              sizes="40px"
              className="object-contain"
              unoptimized
            />
          </div>
        )}

        <label className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#E4DED8] bg-white px-3 py-1.5 text-[10px] font-semibold text-[#4A4440] transition-colors hover:border-rosegold hover:text-[#141210]">
          <UploadCloud className="h-3.5 w-3.5" />
          Trocar imagem
          <input
            type="file"
            name="image"
            accept="image/webp,image/png,image/jpeg"
            required
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              setPreview(file ? URL.createObjectURL(file) : null);
            }}
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="cursor-pointer rounded-full bg-[#161311] px-3 py-1.5 text-[10px] font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:opacity-50"
        >
          {pending ? "Enviando..." : "Salvar imagem"}
        </button>
      </div>

      {state.message && (
        <p className="mt-2 text-[10px] font-semibold text-[#A8432F]">{state.message}</p>
      )}
    </form>
  );
}
