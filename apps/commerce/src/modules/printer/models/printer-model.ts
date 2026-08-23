import { model } from "@medusajs/framework/utils";
import { PrinterFamily } from "./printer-family";

/**
 * A concrete printer the customer can own.
 *
 * The capability columns (`max_nozzle_temperature`, `enclosed`,
 * `hardened_nozzle_stock`, …) are what makes *inferred* compatibility possible
 * for filament: a spool that needs 300 °C simply cannot be sold as compatible
 * with a printer that tops out at 260 °C, whether or not anyone wrote a rule.
 */
export const PrinterModel = model
  .define("printer_model", {
    id: model.id({ prefix: "pmodel" }).primaryKey(),
    name: model.text().searchable(),
    handle: model.text(),
    technology: model.enum(["fdm", "resin"]).default("fdm"),
    release_year: model.number().nullable(),

    enclosed: model.boolean().default(false),
    heated_bed: model.boolean().default(true),
    max_nozzle_temperature: model.number().nullable(),
    max_bed_temperature: model.number().nullable(),
    build_volume_x: model.number().nullable(),
    build_volume_y: model.number().nullable(),
    build_volume_z: model.number().nullable(),
    default_nozzle_diameter_mm: model.float().nullable(),

    supports_ams: model.boolean().default(false),
    supports_ams_lite: model.boolean().default(false),
    /** True when a hardened nozzle is fitted from the factory. */
    hardened_nozzle_stock: model.boolean().default(false),

    image_url: model.text().nullable(),
    rank: model.number().default(0),
    active: model.boolean().default(true),

    family: model.belongsTo(() => PrinterFamily, { mappedBy: "models" }),
  })
  .indexes([
    { on: ["handle"], unique: true },
    { on: ["family_id"] },
    { on: ["active"] },
  ]);
