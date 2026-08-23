import { model } from "@medusajs/framework/utils";
import { FilamentAttributeValue } from "./filament-attribute-value";

/**
 * The schema half of the typed attribute bag.
 *
 * An admin adds "Slagsejhed (Izod)" once here, and every filament can then
 * carry a validated number with a unit — no migration, no code change, and
 * still typed enough to render and filter properly.
 */
export const FilamentAttributeDefinition = model
  .define("filament_attribute_definition", {
    id: model.id({ prefix: "fattr" }).primaryKey(),
    /** Stable machine key, e.g. "izod_impact_strength". */
    key: model.text().searchable(),
    label: model.text().searchable(),
    type: model.enum(["number", "text", "boolean", "enum", "url"]),
    unit: model.text().nullable(),
    /** Allowed values when type is "enum". */
    options: model.json().nullable(),
    /** Presentation grouping on the product page, e.g. "Mekaniske egenskaber". */
    group: model.text().nullable(),
    description: model.text().nullable(),
    /** Whether the value should be exposed as a catalogue facet. */
    filterable: model.boolean().default(false),
    rank: model.number().default(0),

    values: model.hasMany(() => FilamentAttributeValue, { mappedBy: "definition" }),
  })
  .indexes([{ on: ["key"], unique: true }, { on: ["filterable"] }]);
