import { model } from "@medusajs/framework/utils";
import { PrinterBrand } from "./printer-brand";
import { PrinterModel } from "./printer-model";

/** A product line — "A1", "P1", "X1", "MK4", "Ender 3". */
export const PrinterFamily = model
  .define("printer_family", {
    id: model.id({ prefix: "pfam" }).primaryKey(),
    name: model.text().searchable(),
    handle: model.text(),
    description: model.text().nullable(),
    rank: model.number().default(0),

    brand: model.belongsTo(() => PrinterBrand, { mappedBy: "families" }),
    models: model.hasMany(() => PrinterModel, { mappedBy: "family" }),
  })
  .indexes([{ on: ["handle"], unique: true }, { on: ["brand_id"] }]);
