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
    <main className="relative min-h-screen bg-cream px-4 py-6 text-espresso sm:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 12% 8%, rgba(197,143,112,0.20), transparent 38%)",
        }}
      />

      <div className="relative mx-auto max-w-3xl">
        <Link
          href="/admin/produtos"
          className="inline-flex items-center gap-1.5 rounded-full border border-latte px-4 py-2 text-[11px] font-semibold text-mocha transition-colors hover:border-rosegold hover:text-espresso"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar às peças
        </Link>
        <h1 className="mt-5 font-serif text-3xl font-semibold">Nova peça</h1>
        <p className="mt-1 text-xs text-muted">
          Cadastra produto, primeira cor/tamanho e estoque. O resto pode ser ajustado depois.
        </p>
        <NewProductForm categories={categories} />
      </div>
    </main>
  );
}
