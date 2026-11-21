import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/prisma";

import { NewProductForm } from "./NewProductForm";

export const instant = false;

export default async function NewProductPage() {
  const categories = await prisma.category.findMany({
    select: { slug: true, name: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/produtos"
        className="inline-flex items-center gap-1.5 rounded-full border border-[#E4DED8] bg-white px-4 py-2 text-[11px] font-semibold text-[#4A4440] transition-colors hover:border-rosegold hover:text-[#141210]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar às peças
      </Link>
      <h1 className="mt-5 font-serif text-3xl font-semibold">Nova peça</h1>
      <NewProductForm categories={categories} />
    </div>
  );
}
