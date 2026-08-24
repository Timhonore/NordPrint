import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import type { INotificationModuleService, IOrderModuleService } from "@medusajs/framework/types";
import { EMAIL_TEMPLATES } from "../modules/notification-resend/templates";
import { buildOrderData, type OrderLike } from "./order-emails";

/**
 * "Din betaling er gennemført".
 *
 * A separate mail from the order confirmation because they are separate
 * events: an order can be placed with the payment still pending (MobilePay
 * redirect, bank transfer), and telling the customer their money moved before
 * it did is exactly the kind of thing that generates support tickets.
 */
export default async function paymentCapturedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const orderService = container.resolve<IOrderModuleService>(Modules.ORDER);
  const notificationService = container.resolve<INotificationModuleService>(Modules.NOTIFICATION);

  const { data: payments } = await query.graph({
    entity: "payment",
    fields: ["id", "payment_collection.order.id"],
    filters: { id: event.data.id },
  });

  const orderId = (payments[0] as { payment_collection?: { order?: { id: string } } } | undefined)
    ?.payment_collection?.order?.id;

  if (!orderId) return;

  const order = (await orderService.retrieveOrder(orderId, {
    relations: ["items", "shipping_address"],
  })) as unknown as OrderLike;

  if (!order.email) return;

  await notificationService.createNotifications({
    to: order.email,
    channel: "email",
    template: EMAIL_TEMPLATES.PAYMENT_CAPTURED,
    data: buildOrderData(order),
  });

  logger.info(`[email] Betalingskvittering sendt for ordre ${order.display_id}`);
}

export const config: SubscriberConfig = {
  event: "payment.captured",
  context: { subscriberId: "nordprint-payment-captured" },
};
