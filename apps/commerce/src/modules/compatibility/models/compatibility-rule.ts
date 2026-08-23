import { model } from "@medusajs/framework/utils";

/**
 * A single, explicit compatibility statement.
 *
 * Rules are stored at whichever level they are true at — a build plate that
 * fits every Bambu machine is one brand-level rule, not fifteen model rules —
 * and the most specific matching rule wins at read time.
 */
export const CompatibilityRule = model
  .define("compatibility_rule", {
    id: model.id({ prefix: "cmprule" }).primaryKey(),

    subject_type: model.enum(["product", "variant"]).default("product"),
    subject_id: model.text(),

    target_type: model.enum(["printer_model", "printer_family", "printer_brand"]),
    target_id: model.text(),

    status: model.enum(["compatible", "incompatible", "conditional", "unknown"]),
    /** Required in practice for "conditional": "Passer hvis AMS Hub anvendes." */
    note: model.text().nullable(),
  })
  .indexes([
    { on: ["subject_type", "subject_id", "target_type", "target_id"], unique: true },
    { on: ["subject_id"] },
    { on: ["target_id"] },
  ]);
