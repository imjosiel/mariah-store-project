// Lê o banco no request — opt-out de prerender (Next 16).
export const instant = false;

import { listCustomers } from "@/lib/customerStore";

import { ClientsClient } from "./ClientsClient";

export default async function ClientesPage() {
  const customers = await listCustomers();
  return <ClientsClient customers={customers} />;
}
