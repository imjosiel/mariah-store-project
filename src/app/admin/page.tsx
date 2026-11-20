import { connection } from "next/server";

import { listOrders, refreshCommissionStatuses } from "@/lib/orderStore";

import { AdminDashboard } from "./AdminDashboard";

export const instant = false;

export default async function AdminPage() {
  await connection();
  await refreshCommissionStatuses();
  const orders = await listOrders();
  return <AdminDashboard orders={orders} />;
}
