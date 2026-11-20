export type CategorySlug =
  | "todas"
  | "casacos"
  | "alfaiataria"
  | "vestidos"
  | "tricot"
  | "bolsas";

export interface Category {
  id: string;
  slug: CategorySlug;
  name: string;
  count?: number;
}

export interface VariantStock {
  sizeLabel: string;
  stock: number;
}

export interface ProductVariant {
  id: string;
  colorName: string;
  colorSlug: string;
  swatchHex: string;
  cutoutImageUrl: string;
  atmosphereBg: string;
  atmosphereGlow: string;
  atmosphereText: string;
  atmosphereMuted: string;
  isLightTheme: boolean;
  stocks: VariantStock[];
}

export interface ProductReview {
  id: string;
  author: string;
  city: string;
  sizeBought: string;
  rating: number;
  comment: string;
}

export interface SizeMeasurement {
  size: string;
  bustOrWaist: string;
  length: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  heroWord: string;
  categorySlug: Exclude<CategorySlug, "todas">;
  categoryName: string;
  description: string;
  fabricDetails: string;
  deliveryInfo: string;
  priceInCents: number;
  compareAtInCents: number | null;
  costInCents: number;              // base da comissão de 10% — ver docs/07
  ncm?: string;                     // opcional (só interestadual, fora do escopo)
  featuredInHero: boolean;
  rating: number;
  reviewCount: number;
  measurements: SizeMeasurement[];
  reviews: ProductReview[];
  variants: ProductVariant[];
}

export interface BagItem {
  key: string; // `${productId}:${variantId}:${sizeLabel}`
  productId: string;
  productSlug: string;
  productName: string;
  variantId: string;
  colorName: string;
  swatchHex: string;
  cutoutImageUrl: string;
  sizeLabel: string;
  unitPriceInCents: number;
  unitCostInCents: number; // custo da peça — base dos 10% (docs/07)
  quantity: number;
}
