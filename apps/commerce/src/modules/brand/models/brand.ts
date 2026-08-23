import { model } from "@medusajs/framework/utils";

/**
 * Product brands (Bambu Lab, Polymaker, eSUN, Spectrum, NordPrint …).
 *
 * Brands are *data*. The storefront mega-menu, the brand facet and the brand
 * pages all read this table — nothing brand-specific is ever hardcoded in the
 * frontend.
 */
export const Brand = model
  .define("brand", {
    id: model.id({ prefix: "brand" }).primaryKey(),
    name: model.text().searchable(),
    handle: model.text(),
    logo_url: model.text().nullable(),
    description: model.text().nullable(),
    website_url: model.text().nullable(),
    /** Shown in the "Populære brands" section on the front page. */
    featured: model.boolean().default(false),
    rank: model.number().default(0),
  })
  .indexes([{ on: ["handle"], unique: true }, { on: ["featured"] }]);
