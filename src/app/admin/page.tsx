import { connection } from "next/server";

import { listOrders, refreshCommissionStatuses } from "@/lib/orderStore";
import { getAdminProducts } from "@/lib/productStore";

import { AdminDashboard } from "./AdminDashboard";

export const instant = false;

export default async function AdminPage() {
  await connection();
  await refreshCommissionStatuses();
  const [orders, products] = await Promise.all([
    listOrders(),
    getAdminProducts(),
  ]);
  return <AdminDashboard orders={orders} products={products} />;
}
