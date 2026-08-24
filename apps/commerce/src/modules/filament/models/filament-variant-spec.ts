import { model } from "@medusajs/framework/utils";

/**
 * Variant-level filament data — one physical, sellable spool.
 *
 * Colour lives here, not on the product, because colour is what the customer
 * actually picks and what determines SKU, stock and images.
 */
export const FilamentVariantSpec = model
  .define("filament_variant_spec", {
    id: model.id({ prefix: "fvspec" }).primaryKey(),

    /** Owning Medusa product variant. */
    variant_id: model.text().searchable(),

    color_name: model.text().searchable().nullable(),
    /** Normalised "#rrggbb". */
    color_hex: model.text().nullable(),
    /** Second stop for dual-tone and gradient spools. */
    color_hex_secondary: model.text().nullable(),
    /** The manufacturer's own colour code, e.g. "10100". */
    manufacturer_color_code: model.text().nullable(),
    /** Coarse grouping used by the colour facet. */
    color_family: model
      .enum([
        "black",
        "white",
        "grey",
        "red",
        "orange",
        "yellow",
        "green",
        "blue",
        "purple",
        "pink",
        "brown",
        "beige",
        "gold",
        "silver",
        "transparent",
        "multi",
      ])
      .nullable(),

    /** Overrides the product-level values when a variant differs. */
    diameter_mm: model.float().nullable(),
    net_filament_weight_g: model.number().nullable(),

    /** Shown as "Forventes på lager d. …" when sold out. */
    expected_restock_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["variant_id"], unique: true },
    { on: ["color_family"] },
    { on: ["net_filament_weight_g"] },
  ]);
