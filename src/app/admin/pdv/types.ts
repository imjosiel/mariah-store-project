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
  key: string;
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
