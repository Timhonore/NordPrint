import { model } from "@medusajs/framework/utils";

/**
 * "Min printer" for a logged-in customer.
 *
 * Guests keep the same selection in local storage; on login the guest value is
 * merged into this table so nothing is lost.
 */
export const CustomerPrinter = model
  .define("customer_printer", {
    id: model.id({ prefix: "custprn" }).primaryKey(),
    customer_id: model.text(),
    printer_model_id: model.text(),
    nickname: model.text().nullable(),
    /** The one used for compatibility checks when several are saved. */
    is_primary: model.boolean().default(false),
  })
  .indexes([
    { on: ["customer_id", "printer_model_id"], unique: true },
    { on: ["customer_id"] },
  ]);
