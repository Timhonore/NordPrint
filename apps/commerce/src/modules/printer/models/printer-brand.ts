import { model } from "@medusajs/framework/utils";
import { PrinterFamily } from "./printer-family";

/** Bambu Lab, Prusa, Creality, Elegoo, Voron … all data, never code. */
export const PrinterBrand = model
  .define("printer_brand", {
    id: model.id({ prefix: "pbrand" }).primaryKey(),
    name: model.text().searchable(),
    handle: model.text(),
    logo_url: model.text().nullable(),
    website_url: model.text().nullable(),
    rank: model.number().default(0),

    families: model.hasMany(() => PrinterFamily, { mappedBy: "brand" }),
  })
  .indexes([{ on: ["handle"], unique: true }]);
