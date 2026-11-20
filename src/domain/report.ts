/**
 * Relatório para o contador. Puro: recebe dados e devolve texto CSV.
 * Separador `;` e decimais com `,` para abrir direto no Excel pt-BR.
 */

export interface ReportOrder {
  code: string;
  createdAt: string;
  customerName: string;
  totalInCents: number;
  costInCents: number;
  marginInCents: number;
  commissionInCents: number;
  commissionStatus: string;
  orderStatus: string;
  nfNumber: string;
  itemsLabel: string;
}

const HEADER = [
  "Codigo",
  "Data",
  "Cliente",
  "Total (R$)",
  "Custo (R$)",
  "Margem (R$)",
  "Comissao 10% (R$)",
  "Status Comissao",
  "Status Pedido",
  "Nota Fiscal",
  "Itens",
];

function money(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function escape(value: string): string {
  if (/[";\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function ordersToCsv(orders: readonly ReportOrder[]): string {
  const rows = orders.map((order) =>
    [
      order.code,
      new Date(order.createdAt).toLocaleString("pt-BR"),
      order.customerName,
      money(order.totalInCents),
      money(order.costInCents),
      money(order.marginInCents),
      money(order.commissionInCents),
      order.commissionStatus,
      order.orderStatus,
      order.nfNumber,
      order.itemsLabel,
    ]
      .map(escape)
      .join(";")
  );

  return [HEADER.join(";"), ...rows].join("\r\n");
}
