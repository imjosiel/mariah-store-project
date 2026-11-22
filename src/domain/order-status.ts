/**
 * Máquina de estados do pedido — regras puras, sem React/Prisma/Next.
 * Fonte da verdade: docs/07-COMMERCE-AND-MONEY.md
 */

export type FulfillmentStatus =
  | "DRAFT_BAG"
  | "SENT_TO_WHATSAPP"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export interface FulfillmentOrder {
  status: FulfillmentStatus;
  confirmedAt: Date | null;
  stockRestoredAt: Date | null;
}

/** Cancelado nunca volta a confirmar (evita baixar estoque e reviver comissão). */
export function canConfirmOrder(order: FulfillmentOrder): boolean {
  return order.status !== "CANCELLED" && order.confirmedAt === null;
}

export function canShipOrder(order: FulfillmentOrder): boolean {
  return order.status === "CONFIRMED";
}

export function canDeliverOrder(order: FulfillmentOrder): boolean {
  return order.status === "SHIPPED";
}

/** Depois de entregue, a venda está encerrada. */
export function canCancelOrder(order: FulfillmentOrder): boolean {
  return order.status !== "CANCELLED" && order.status !== "DELIVERED";
}

/** Só devolve estoque de pedido confirmado, e uma única vez. */
export function shouldRestoreStock(order: FulfillmentOrder): boolean {
  return order.confirmedAt !== null && order.stockRestoredAt === null;
}
