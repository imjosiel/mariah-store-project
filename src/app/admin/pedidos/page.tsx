import { connection } from "next/server";

import { listOrders, refreshCommissionStatuses } from "@/lib/orderStore";

import { PedidosClient } from "./PedidosClient";

export const instant = false;

export default async function PedidosPage() {
  await connection();
  await refreshCommissionStatuses();
  const orders = await listOrders();
  return <PedidosClient orders={orders} />;
}
