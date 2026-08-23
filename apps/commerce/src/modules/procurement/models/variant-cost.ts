import { model } from "@medusajs/framework/utils";

/**
 * Internal purchase price per variant.
 *
 * This lives in its own module — not on the product — for one reason: it must
 * be impossible to leak. Nothing in `/store/*` may read this module, and the
 * storefront never receives a field from it. Margin is calculated in the admin
 * API only, from `@nordprint/commerce`'s `calculateMargin`.
 *
 * Amounts are minor units (øre), like every other price in the system.
 */
export const VariantCost = model
  .define("variant_cost", {
    id: model.id({ prefix: "vcost" }).primaryKey(),
    variant_id: model.text(),
    /** Indkøbspris in minor units. */
    cost_price: model.number(),
    currency_code: model.text().default("dkk"),

    supplier_name: model.text().nullable(),
    supplier_sku: model.text().nullable(),
    /** Last time an import or a buyer touched this number. */
    last_purchased_at: model.dateTime().nullable(),
    note: model.text().nullable(),
  })
  .indexes([{ on: ["variant_id"], unique: true }, { on: ["supplier_sku"] }]);
