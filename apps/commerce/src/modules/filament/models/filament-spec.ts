import { model } from "@medusajs/framework/utils";
import { FilamentAttributeValue } from "./filament-attribute-value";

/**
 * Product-level filament specification.
 *
 * The columns here are the ones NordPrint filters, sorts and renders on every
 * request — material, brand, diameter, spool weight, temperatures and the AMS
 * flags. They are real columns (and indexed) because a facet query that has to
 * unpack JSON does not stay fast once the catalogue grows.
 *
 * Everything else — the long tail of datasheet values that differ per
 * manufacturer — lives in `FilamentAttributeValue`, a typed attribute bag that
 * the admin can extend without a migration.
 */
export const FilamentSpec = model
  .define("filament_spec", {
    id: model.id({ prefix: "fspec" }).primaryKey(),

    /** Owning Medusa product. The module link is defined in src/links. */
    product_id: model.text().searchable(),

    manufacturer: model.text().nullable(),

    material: model.enum([
      "pla",
      "petg",
      "abs",
      "asa",
      "tpu",
      "nylon",
      "pc",
      "pva",
      "hips",
      "pp",
      "pet",
      "peek",
      "support",
      "other",
    ]),
    /** e.g. "PLA Basic", "PETG HF", "PLA-CF". */
    material_variant: model.text().nullable(),
    finish: model
      .enum([
        "basic",
        "matte",
        "silk",
        "high-speed",
        "wood",
        "marble",
        "glow",
        "carbon-fiber",
        "glass-fiber",
        "translucent",
        "metallic",
        "gradient",
        "other",
      ])
      .nullable(),

    diameter_mm: model.float().default(1.75),

    /** Net filament weight — the number price/kg is computed from. */
    net_filament_weight_g: model.number().default(1000),
    /** Including spool — used for shipping weight. */
    gross_weight_g: model.number().nullable(),
    density_g_cm3: model.float().nullable(),

    nozzle_temperature_min: model.number().nullable(),
    nozzle_temperature_max: model.number().nullable(),
    bed_temperature_min: model.number().nullable(),
    bed_temperature_max: model.number().nullable(),

    drying_temperature: model.number().nullable(),
    drying_duration_hours: model.number().nullable(),

    max_volumetric_speed: model.float().nullable(),
    /** Heat deflection temperature in °C. */
    heat_resistance_c: model.number().nullable(),

    enclosure_recommended: model.boolean().default(false),
    hardened_nozzle_recommended: model.boolean().default(false),
    abrasive: model.boolean().default(false),
    food_contact_information: model.text().nullable(),

    /** Tri-state: null means "not documented", never "no". */
    ams_compatible: model.boolean().nullable(),
    ams_lite_compatible: model.boolean().nullable(),

    spool_material: model.text().nullable(),

    technical_datasheet_url: model.text().nullable(),
    safety_datasheet_url: model.text().nullable(),

    /** 1-5 ratings rendered as dots on the product page. */
    rating_printability: model.number().nullable(),
    rating_strength: model.number().nullable(),
    rating_flexibility: model.number().nullable(),
    rating_heat_resistance: model.number().nullable(),
    rating_uv_resistance: model.number().nullable(),
    rating_layer_adhesion: model.number().nullable(),

    attribute_values: model.hasMany(() => FilamentAttributeValue, {
      mappedBy: "filament_spec",
    }),
  })
  .indexes([
    { on: ["product_id"], unique: true },
    { on: ["material"] },
    { on: ["finish"] },
    { on: ["diameter_mm"] },
    { on: ["net_filament_weight_g"] },
    { on: ["ams_compatible"] },
    { on: ["abrasive"] },
    // The catalogue's most common facet combination.
    { on: ["material", "diameter_mm", "net_filament_weight_g"] },
  ]);
