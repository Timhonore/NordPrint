import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import type { INotificationModuleService, IOrderModuleService } from "@medusajs/framework/types";
import { formatMoney, money } from "@nordprint/commerce";
import { siteConfig } from "@nordprint/config";
import { EMAIL_TEMPLATES } from "../modules/notification-resend/templates";

/**
 * Transactional order e-mails.
 *
 * Subscribers, not inline calls from the checkout route: an e-mail that fails
 * to send must never roll back an order the customer already paid for. The
 * worker picks these up from the event bus, and a failure is retried there.
 *
 * These run in the worker process (see MEDUSA_WORKER_MODE) so they never add
 * latency to a customer-facing request.
 */

interface OrderLikeItem {
  title: string;
  variant_title?: string | null;
  quantity: number;
  total?: number;
}

interface OrderLike {
  id: string;
  display_id: number;
  email: string;
  currency_code: string;
  items?: OrderLikeItem[];
  shipping_address?: { first_name?: string | null; last_name?: string | null } | null;
  subtotal?: number;
  shipping_total?: number;
  discount_total?: number;
  total?: number;
}

/** Medusa amounts are decimals in the major unit; ours are minor units. */
const toMoney = (amount: number | undefined, currency: string): string =>
  formatMoney(money(Math.round((amount ?? 0) * 100), currency.toUpperCase()));

function buildOrderData(order: OrderLike): Record<string, unknown> {
  const currency = order.currency_code;

  return {
    customerName:
      [order.shipping_address?.first_name, order.shipping_address?.last_name]
        .filter(Boolean)
        .join(" ") || null,
    orderDisplayId: order.display_id,
    orderUrl: `${siteConfig.url}/ordre/${order.id}`,
    lines: (order.items ?? []).map((item) => ({
      title: item.title,
      variantTitle: item.variant_title ?? null,
      quantity: item.quantity,
      total: toMoney(item.total, currency),
    })),
    subtotal: toMoney(order.subtotal, currency),
    shipping: toMoney(order.shipping_total, currency),
    ...(order.discount_total && order.discount_total > 0
      ? { discount: toMoney(order.discount_total, currency) }
      : {}),
    total: toMoney(order.total, currency),
  };
}

const ORDER_FIELDS = [
  "id",
  "display_id",
  "email",
  "currency_code",
  "subtotal",
  "shipping_total",
  "discount_total",
  "total",
  "items.*",
  "shipping_address.*",
];

/** Ordrebekræftelse — sent the moment the order exists. */
export async function orderPlacedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const orderService = container.resolve<IOrderModuleService>(Modules.ORDER);
  const notificationService = container.resolve<INotificationModuleService>(Modules.NOTIFICATION);

  const order = (await orderService.retrieveOrder(event.data.id, {
    relations: ["items", "shipping_address"],
  })) as unknown as OrderLike;

  if (!order.email) {
    logger.warn(`[email] Ordre ${order.id} har ingen e-mail — springer bekræftelsen over.`);
    return;
  }

  await notificationService.createNotifications({
    to: order.email,
    channel: "email",
    template: EMAIL_TEMPLATES.ORDER_PLACED,
    data: buildOrderData(order),
  });

  // The order id is fine to log; the customer's e-mail is not.
  logger.info(`[email] Ordrebekræftelse sendt for ordre ${order.display_id}`);
}

export const orderPlacedConfig: SubscriberConfig = {
  event: "order.placed",
  context: { subscriberId: "nordprint-order-placed" },
};

export default orderPlacedHandler;
export const config = orderPlacedConfig;

/** Exported for the shipment and refund subscribers, which share the shape. */
export { buildOrderData, ORDER_FIELDS, toMoney };
export type { OrderLike };
