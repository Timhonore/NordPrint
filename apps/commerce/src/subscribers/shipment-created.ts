import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import type { INotificationModuleService, IOrderModuleService } from "@medusajs/framework/types";
import { EMAIL_TEMPLATES } from "../modules/notification-resend/templates";
import { buildOrderData, type OrderLike } from "./order-emails";

/**
 * "Din ordre er sendt".
 *
 * Includes the tracking number and a link when the carrier gave us one. With
 * the development shipping provider there is no label and the tracking number
 * is prefixed TEST — the mail still sends, so the flow is testable, and the
 * customer can see it is not a real parcel.
 */
export default async function shipmentCreatedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>): Promise<void> {
  if (event.data.no_notification) return;

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const orderService = container.resolve<IOrderModuleService>(Modules.ORDER);
  const notificationService = container.resolve<INotificationModuleService>(Modules.NOTIFICATION);

  const { data: fulfillments } = await query.graph({
    entity: "fulfillment",
    fields: ["id", "data", "labels.*", "order.id"],
    filters: { id: event.data.id },
  });

  const fulfillment = fulfillments[0] as
    { data?: Record<string, unknown>; order?: { id: string } } | undefined;

  const orderId = fulfillment?.order?.id;
  if (!orderId) {
    logger.warn(`[email] Forsendelse ${event.data.id} har ingen ordre — springer over.`);
    return;
  }

  const order = (await orderService.retrieveOrder(orderId, {
    relations: ["items", "shipping_address"],
  })) as unknown as OrderLike;

  if (!order.email) return;

  await notificationService.createNotifications({
    to: order.email,
    channel: "email",
    template: EMAIL_TEMPLATES.ORDER_SHIPPED,
    data: {
      ...buildOrderData(order),
      trackingNumber: (fulfillment?.data?.tracking_number as string) ?? null,
      trackingUrl: (fulfillment?.data?.tracking_url as string) ?? null,
      carrierName: (fulfillment?.data?.carrier_id as string) ?? null,
    },
  });

  logger.info(`[email] Forsendelsesbesked sendt for ordre ${order.display_id}`);
}

export const config: SubscriberConfig = {
  event: "shipment.created",
  context: { subscriberId: "nordprint-shipment-created" },
};
