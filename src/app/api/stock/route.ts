import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/** Estoque do banco, indexado por ID real de variação. */
export async function GET() {
  try {
    const rows = await prisma.productVariant.findMany({
      select: { id: true, stocks: { select: { sizeLabel: true, stock: true } } },
    });

    const levels: Record<string, number> = {};
    for (const row of rows) {
      for (const stock of row.stocks) {
        levels[`${row.id}:${stock.sizeLabel}`] = stock.stock;
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
