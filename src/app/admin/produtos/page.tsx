import { getAdminProducts } from "@/lib/productStore";

import { AdminProductsClient } from "./AdminProductsClient";

export const instant = false;

export default async function AdminProductsPage() {
  const products = await getAdminProducts({ includeArchived: true });
  return <AdminProductsClient products={products} />;
}
