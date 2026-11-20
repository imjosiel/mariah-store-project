import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [products, categories, variants, orders] = await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.productVariant.count(),
      prisma.order.count(),
    ]);

    return NextResponse.json({
      ok: true,
      db: { products, categories, variants, orders },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "erro desconhecido" },
      { status: 500 }
    );
  }
}
