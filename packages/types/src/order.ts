import type { Money } from "./catalog";

/**
 * Payment status and fulfilment status are tracked separately and must never
 * be collapsed into a single enum — an order can be paid but unpacked, or
 * shipped on account and not yet paid.
 */
export const PAYMENT_STATUSES = [
  "not_paid",
  "awaiting",
  "authorized",
  "captured",
  "partially_refunded",
  "refunded",
  "canceled",
  "requires_action",
  "failed",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FULFILLMENT_STATUSES = [
  "not_fulfilled",
  "processing",
  "packing",
  "shipped",
  "delivered",
  "partially_fulfilled",
  "returned",
  "canceled",
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export const ORDER_STATUSES = [
  "received",
  "payment_approved",
  "processing",
  "packing",
  "shipped",
  "delivered",
  "canceled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Modtaget",
  payment_approved: "Betaling godkendt",
  processing: "Behandles",
  packing: "Pakkes",
  shipped: "Afsendt",
  delivered: "Leveret",
  canceled: "Annulleret",
  refunded: "Refunderet",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  not_paid: "Ikke betalt",
  awaiting: "Afventer betaling",
  authorized: "Reserveret",
  captured: "Betalt",
  partially_refunded: "Delvist refunderet",
  refunded: "Refunderet",
  canceled: "Annulleret",
  requires_action: "Kræver handling",
  failed: "Mislykkedes",
};

export const FULFILLMENT_STATUS_LABELS: Record<FulfillmentStatus, string> = {
  not_fulfilled: "Ikke pakket",
  processing: "Behandles",
  packing: "Pakkes",
  shipped: "Afsendt",
  delivered: "Leveret",
  partially_fulfilled: "Delvist afsendt",
  returned: "Returneret",
  canceled: "Annulleret",
};

export interface Address {
  readonly firstName: string;
  readonly lastName: string;
  readonly company?: string | null;
  readonly address1: string;
  readonly address2?: string | null;
  readonly postalCode: string;
  readonly city: string;
  readonly countryCode: string;
  readonly phone?: string | null;
}

export interface OrderLine {
  readonly id: string;
  readonly title: string;
  readonly variantTitle: string | null;
  readonly sku: string | null;
  readonly thumbnail: string | null;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly total: Money;
}

export interface OrderSummary {
  readonly id: string;
  readonly displayId: number;
  readonly createdAt: string;
  readonly status: OrderStatus;
  readonly paymentStatus: PaymentStatus;
  readonly fulfillmentStatus: FulfillmentStatus;
  readonly total: Money;
  readonly itemCount: number;
  readonly trackingNumbers: readonly string[];
}

export interface OrderDetail extends OrderSummary {
  readonly email: string;
  readonly lines: readonly OrderLine[];
  readonly subtotal: Money;
  readonly shippingTotal: Money;
  readonly discountTotal: Money;
  readonly taxTotal: Money;
  readonly shippingAddress: Address | null;
  readonly billingAddress: Address | null;
  readonly shippingMethodName: string | null;
  readonly paymentProviderId: string | null;
}

/**
 * Maps the two independent axes onto the single status the customer sees.
 * Kept in the shared package so storefront and e-mails never disagree.
 */
export function deriveOrderStatus(
  payment: PaymentStatus,
  fulfillment: FulfillmentStatus,
  canceled = false
): OrderStatus {
  if (canceled) return "canceled";
  if (payment === "refunded") return "refunded";
  if (fulfillment === "delivered") return "delivered";
  if (fulfillment === "shipped" || fulfillment === "partially_fulfilled") return "shipped";
  if (fulfillment === "packing") return "packing";
  if (fulfillment === "processing") return "processing";
  if (payment === "captured" || payment === "authorized") return "payment_approved";
  return "received";
}
