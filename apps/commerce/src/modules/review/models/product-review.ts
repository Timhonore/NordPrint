import { model } from "@medusajs/framework/utils";

/**
 * Product reviews.
 *
 * Two rules are enforced by the model itself rather than by convention:
 *
 *  - Nothing is published without moderation. `status` defaults to "pending",
 *    so a review can never appear on the storefront by accident.
 *  - "Verificeret køb" is derived from an actual order, never supplied by the
 *    client — the order id is stored alongside it as the receipt.
 */
export const ProductReview = model
  .define("product_review", {
    id: model.id({ prefix: "prev" }).primaryKey(),
    product_id: model.text(),
    variant_id: model.text().nullable(),
    customer_id: model.text().nullable(),
    /** The order that proves the purchase, when there is one. */
    order_id: model.text().nullable(),

    author_name: model.text(),
    author_email: model.text().nullable(),
    rating: model.number(),
    title: model.text().nullable(),
    body: model.text(),

    verified_purchase: model.boolean().default(false),
    status: model.enum(["pending", "approved", "rejected"]).default("pending"),
    /** Why a review was rejected — internal, never shown to the customer. */
    moderation_note: model.text().nullable(),
    moderated_by: model.text().nullable(),
    moderated_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["product_id", "status"] },
    { on: ["customer_id"] },
    { on: ["status"] },
  ]);
