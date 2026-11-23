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
