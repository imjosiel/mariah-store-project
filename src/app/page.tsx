import { connection } from "next/server";

import { getCategoriesFromDb, getProductsFromDb } from "@/lib/catalogDb";
import {
  gatewayIsConfigured,
  getCheckoutSettings,
  type CheckoutSettings,
} from "@/lib/checkoutSettings";

import { HomeClient } from "./HomeClient";

export const instant = false;

export default async function HomePage() {
  await connection();
  const [products, categories, checkout] = await Promise.all([
    getProductsFromDb(),
    getCategoriesFromDb(),
    getCheckoutSettings(),
  ]);
  const effectiveCheckout: CheckoutSettings = {
    ...checkout,
    pixGatewayEnabled: checkout.pixGatewayEnabled && gatewayIsConfigured(),
  };
  return (
    <HomeClient products={products} categories={categories} checkout={effectiveCheckout} />
  );
}
