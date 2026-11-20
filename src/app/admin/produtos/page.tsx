import { getProductCosts } from "@/lib/productStore";

import { AdminProductsClient } from "./AdminProductsClient";

export const instant = false;

export default async function AdminProductsPage() {
  const costs = await getProductCosts();
  return <AdminProductsClient initialCosts={costs} />;
}
