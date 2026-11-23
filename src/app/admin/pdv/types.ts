import type { DiscountMode } from "@/domain/discount";

export type Payment = "PIX" | "DINHEIRO" | "CARTAO" | "OUTRO";

export interface PdvVariant {
  id: string;
  colorName: string;
  swatchHex: string;
  imageUrl: string;
  stocks: Array<{ sizeLabel: string; stock: number }>;
}

export interface PdvProduct {
  slug: string;
  name: string;
  categoryName: string;
  imageUrl: string;
  priceInCents: number;
  costInCents: number;
  variants: PdvVariant[];
}

export interface CartItem {
  /** Identifica esta unidade específica no carrinho. */
  key: string;
  /** Agrupa unidades iguais para conferir estoque. */
  groupKey: string;
  listPriceInCents: number;
  available: number;
  variantId: string;
  sizeLabel: string;
  productName: string;
  colorName: string;
  swatchHex: string;
  imageUrl: string;
  unitPriceInCents: number;
  unitCostInCents: number;
  quantity: number;
  pieceDiscountMode: DiscountMode;
  /** Centavos no modo BRL; centésimos de % no modo PCT. */
  pieceDiscountValue: number;
}

export interface AddToCartItem {
  productName: string;
  listPriceInCents: number;
  variantId: string;
  sizeLabel: string;
  colorName: string;
  swatchHex: string;
  imageUrl: string;
  unitPriceInCents: number;
  unitCostInCents: number;
  available: number;
  quantity: number;
}
