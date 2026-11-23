import { prisma } from "./prisma";

export const normalizeDocument = (value: string) => value.replace(/\D/g, "");

export interface CustomerInput {
  name: string;
  cpfCnpj: string;
  phone?: string;
  email?: string;
}

/** Encontra ou cria o cliente pelo documento (somente dígitos). */
export async function findOrCreateCustomer(
  input: CustomerInput
): Promise<{ id: string; asaasCustomerId: string | null }> {
  const cpfCnpj = normalizeDocument(input.cpfCnpj);
  if (cpfCnpj.length < 11) throw new Error("CPF/CNPJ inválido");

  const existing = await prisma.customer.findUnique({
    where: { cpfCnpj },
    select: { id: true, asaasCustomerId: true, name: true },
  });

  if (existing) {
    const name = input.name.trim();
    if (name && name !== existing.name) {
      await prisma.customer.update({ where: { id: existing.id }, data: { name } });
    }
    return { id: existing.id, asaasCustomerId: existing.asaasCustomerId };
  }

  const created = await prisma.customer.create({
    data: {
      name: input.name.trim() || "Cliente",
      cpfCnpj,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
    },
    select: { id: true, asaasCustomerId: true },
  });
  return created;
}

export async function setAsaasCustomerId(
  customerId: string,
  asaasCustomerId: string
): Promise<void> {
  await prisma.customer.update({
    where: { id: customerId },
    data: { asaasCustomerId },
  });
}

export async function setOrderCustomer(
  orderCode: string,
  customerId: string
): Promise<void> {
  await prisma.order.update({
    where: { code: orderCode },
    data: { customerId },
  });
}

export interface CustomerView {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  createdAt: string;
  orders: Array<{
    code: string;
    createdAt: string;
    totalInCents: number;
    status: string;
  }>;
}

/** Documento mascarado para a interface — o número completo fica só no banco. */
function maskDocument(value: string): string {
  if (value.length === 11) return `***.${value.slice(3, 6)}.${value.slice(6, 9)}-${value.slice(9)}`;
  if (value.length === 14) return `**.${value.slice(2, 5)}.${value.slice(5, 8)}/${value.slice(8, 12)}-${value.slice(12)}`;
  return "***";
}

export async function listCustomers(): Promise<CustomerView[]> {
  const customers = await prisma.customer.findMany({
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        select: { code: true, createdAt: true, totalInCents: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    document: maskDocument(customer.cpfCnpj),
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    createdAt: customer.createdAt.toISOString(),
    orders: customer.orders.map((order) => ({
      code: order.code,
      createdAt: order.createdAt.toISOString(),
      totalInCents: order.totalInCents,
      status: order.status,
    })),
  }));
}
