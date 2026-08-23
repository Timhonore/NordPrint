import { model } from "@medusajs/framework/utils";
import { FilamentSpec } from "./filament-spec";
import { FilamentAttributeDefinition } from "./filament-attribute-definition";

/**
 * One typed value of one attribute for one filament.
 *
 * Values are stored in a column that matches their type rather than in a
 * single stringly-typed column, so numeric attributes remain sortable and
 * range-filterable in SQL.
 */
export const FilamentAttributeValue = model
  .define("filament_attribute_value", {
    id: model.id({ prefix: "fattrval" }).primaryKey(),

    value_number: model.float().nullable(),
    value_text: model.text().nullable(),
    value_boolean: model.boolean().nullable(),

    filament_spec: model.belongsTo(() => FilamentSpec, { mappedBy: "attribute_values" }),
    definition: model.belongsTo(() => FilamentAttributeDefinition, { mappedBy: "values" }),
  })
  .indexes([
    { on: ["filament_spec_id", "definition_id"], unique: true },
    { on: ["definition_id", "value_number"] },
    { on: ["definition_id", "value_text"] },
  ]);
