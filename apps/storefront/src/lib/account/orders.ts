import "server-only";

import {
  FULFILLMENT_STATUSES,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUSES,
  deriveOrderStatus,
  type FulfillmentStatus,
  type OrderStatus,
  type PaymentStatus,
} from "@nordprint/types";
import { apiFetch, type ApiResult } from "../api/client";
import { withCustomerToken } from "./session";

/**
 * The customer's own orders.
 *
 * Payment status and fulfillment status are kept apart all the way from
 * Medusa; the single label the customer sees is derived from both at the last
 * moment. Collapsing them earlier is how a shop ends up unable to answer
 * "have we been paid?".
 */

export interface OrderSummary {
  readonly id: string;
  readonly displayId: number;
  readonly createdAt: string;
  readonly total: number;
  readonly currencyCode: string;
  readonly itemCount: number;
  readonly status: OrderStatus;
  readonly statusLabel: string;
}

interface MedusaOrder {
  id: string;
  display_id: number;
  created_at: string;
  total: number;
  currency_code: string;
  status: string;
  payment_status?: string;
  fulfillment_status?: string;
  items?: { quantity: number }[];
}

export async function fetchCustomerOrders(): Promise<ApiResult<OrderSummary[]>> {
  const result = await withCustomerToken((token) =>
    apiFetch<{ orders: MedusaOrder[] }>("/store/orders?limit=50&order=-created_at&fields=*items", {
      token,
      revalidate: 0,
    })
  );

  if (!result.ok) return result;

  return { ok: true, data: result.data.orders.map(toSummary) };
}

function toSummary(order: MedusaOrder): OrderSummary {
  const status = deriveOrderStatus(
    normalizePayment(order.payment_status),
    normalizeFulfillment(order.fulfillment_status),
    order.status === "canceled"
  );

  return {
    id: order.id,
    displayId: order.display_id,
    createdAt: order.created_at,
    // Medusa reports money in the major unit; NordPrint works in minor units.
    total: Math.round((order.total ?? 0) * 100),
    currencyCode: order.currency_code.toUpperCase(),
    itemCount: (order.items ?? []).reduce((sum, item) => sum + item.quantity, 0),
    status,
    statusLabel: ORDER_STATUS_LABELS[status],
  };
}

/**
 * Medusa may report a state we do not know yet. An unknown one falls back to
 * the most conservative reading rather than crashing the order list.
 *
 * The known sets come from `@nordprint/types` rather than a copy here, so a
 * new status is added in one place.
 */
function normalizePayment(value: string | undefined): PaymentStatus {
  return PAYMENT_STATUSES.find((entry) => entry === value) ?? "not_paid";
}

function normalizeFulfillment(value: string | undefined): FulfillmentStatus {
  return FULFILLMENT_STATUSES.find((entry) => entry === value) ?? "not_fulfilled";
}
