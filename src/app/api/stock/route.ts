import { NextResponse } from "next/server";

import { PRODUCTS } from "@/data/catalog";
import { prisma } from "@/lib/prisma";

/** Estoque do banco, indexado pelos IDs de variação do catálogo (o que o front usa). */
export async function GET() {
  try {
    const rows = await prisma.productVariant.findMany({
      select: {
        id: true,
        colorSlug: true,
        product: { select: { slug: true } },
        stocks: { select: { sizeLabel: true, stock: true } },
      },
    });

    const mockIdByKey = new Map<string, string>();
    for (const product of PRODUCTS) {
      for (const variant of product.variants) {
        mockIdByKey.set(`${product.slug}:${variant.colorSlug}`, variant.id);
      }
    }

    const levels: Record<string, number> = {};
    for (const row of rows) {
      const mockId = mockIdByKey.get(`${row.product.slug}:${row.colorSlug}`);
      if (!mockId) continue;
      for (const stock of row.stocks) {
        // IDs reais (usados pela vitrine após o catálogo vir do banco)
        // e IDs do mock (usados pelo painel/admin) — os dois funcionam.
        levels[`${row.id}:${stock.sizeLabel}`] = stock.stock;
        levels[`${mockId}:${stock.sizeLabel}`] = stock.stock;
      }
    }

    return NextResponse.json({ levels });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "erro desconhecido" },
      { status: 500 }
    );
  }
}
