import { MedusaService } from "@medusajs/framework/utils";
import type {
  FilamentAttribute,
  FilamentRatings,
  FilamentSpec as FilamentSpecDTO,
  Rating1To5,
} from "@nordprint/types";
import {
  FilamentAttributeDefinition,
  FilamentAttributeValue,
  FilamentSpec,
  FilamentVariantSpec,
} from "./models";

type AttributeInput = {
  key: string;
  value: string | number | boolean | null;
};

/**
 * Filament module service.
 *
 * `MedusaService` generates the CRUD surface for the four models; the methods
 * below add the domain behaviour that would otherwise be duplicated in every
 * API route: reading a spec together with its typed attributes, and writing
 * attributes by key instead of by definition id.
 */
class FilamentModuleService extends MedusaService({
  FilamentSpec,
  FilamentVariantSpec,
  FilamentAttributeDefinition,
  FilamentAttributeValue,
}) {
  /**
   * Reads specs for a set of products and resolves their typed attributes in
   * one round trip — the product list page asks for 24 of these at a time, so
   * an N+1 here is a page-speed regression.
   */
  async listSpecsWithAttributes(productIds: string[]): Promise<FilamentSpecDTO[]> {
    if (productIds.length === 0) return [];

    const specs = await this.listFilamentSpecs({ product_id: productIds });
    if (specs.length === 0) return [];

    const values = await this.listFilamentAttributeValues(
      { filament_spec_id: specs.map((spec) => spec.id) },
      { relations: ["definition"] }
    );

    const bySpec = new Map<string, FilamentAttribute[]>();
    for (const value of values) {
      const definition = (value as any).definition as
        | { key: string; label: string; type: string; unit: string | null; group: string | null }
        | undefined;
      if (!definition) continue;

      const list = bySpec.get((value as any).filament_spec_id) ?? [];
      list.push({
        key: definition.key,
        label: definition.label,
        type: definition.type as FilamentAttribute["type"],
        unit: definition.unit,
        group: definition.group,
        value: resolveAttributeValue(value),
      });
      bySpec.set((value as any).filament_spec_id, list);
    }

    return specs.map((spec) => toSpecDto(spec, bySpec.get(spec.id) ?? []));
  }

  async retrieveSpecByProduct(productId: string): Promise<FilamentSpecDTO | null> {
    const [spec] = await this.listSpecsWithAttributes([productId]);
    return spec ?? null;
  }

  /**
   * Upserts attribute values by their definition *key*.
   *
   * Unknown keys are rejected rather than silently created: an attribute
   * without a definition cannot be labelled, typed or rendered, and a typo in
   * a CSV import must not quietly invent a new field.
   */
  async setAttributes(specId: string, attributes: AttributeInput[]): Promise<void> {
    if (attributes.length === 0) return;

    const keys = attributes.map((attribute) => attribute.key);
    const definitions = await this.listFilamentAttributeDefinitions({ key: keys });
    const byKey = new Map(definitions.map((definition) => [definition.key, definition]));

    const missing = keys.filter((key) => !byKey.has(key));
    if (missing.length > 0) {
      throw new Error(
        `Ukendte filamentegenskaber: ${missing.join(", ")}. Opret dem først under Filamentegenskaber i admin.`
      );
    }

    const existing = await this.listFilamentAttributeValues({
      filament_spec_id: specId,
      definition_id: definitions.map((definition) => definition.id),
    });
    const existingByDefinition = new Map(
      existing.map((value) => [(value as any).definition_id as string, value])
    );

    const toCreate: Record<string, unknown>[] = [];
    const toUpdate: Record<string, unknown>[] = [];
    const toDelete: string[] = [];

    for (const attribute of attributes) {
      const definition = byKey.get(attribute.key)!;
      const current = existingByDefinition.get(definition.id);

      // A null value means "remove this attribute", not "store null".
      if (attribute.value === null || attribute.value === "") {
        if (current) toDelete.push(current.id);
        continue;
      }

      const columns = toValueColumns(definition.type, attribute.value);
      if (current) toUpdate.push({ id: current.id, ...columns });
      else
        toCreate.push({
          filament_spec_id: specId,
          definition_id: definition.id,
          ...columns,
        });
    }

    if (toDelete.length > 0) await this.deleteFilamentAttributeValues(toDelete);
    if (toUpdate.length > 0) await this.updateFilamentAttributeValues(toUpdate as any);
    if (toCreate.length > 0) await this.createFilamentAttributeValues(toCreate as any);
  }
}

function resolveAttributeValue(value: any): string | number | boolean | null {
  if (value.value_number !== null && value.value_number !== undefined) return value.value_number;
  if (value.value_boolean !== null && value.value_boolean !== undefined) return value.value_boolean;
  return value.value_text ?? null;
}

function toValueColumns(type: string, value: string | number | boolean): Record<string, unknown> {
  const base = { value_number: null, value_text: null, value_boolean: null };
  switch (type) {
    case "number": {
      const parsed = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(parsed)) {
        throw new Error(`"${String(value)}" er ikke et gyldigt tal`);
      }
      return { ...base, value_number: parsed };
    }
    case "boolean":
      return { ...base, value_boolean: value === true || value === "true" || value === "1" };
    default:
      return { ...base, value_text: String(value) };
  }
}

const asRating = (value: number | null | undefined): Rating1To5 | undefined => {
  if (value === null || value === undefined) return undefined;
  const rounded = Math.round(value);
  if (rounded < 1 || rounded > 5) return undefined;
  return rounded as Rating1To5;
};

function toRatings(spec: any): FilamentRatings {
  const ratings: Record<string, Rating1To5 | undefined> = {
    printability: asRating(spec.rating_printability),
    strength: asRating(spec.rating_strength),
    flexibility: asRating(spec.rating_flexibility),
    heatResistance: asRating(spec.rating_heat_resistance),
    uvResistance: asRating(spec.rating_uv_resistance),
    layerAdhesion: asRating(spec.rating_layer_adhesion),
  };
  // Drop undefined keys so the product page can simply check `in`.
  return Object.fromEntries(
    Object.entries(ratings).filter(([, value]) => value !== undefined)
  ) as FilamentRatings;
}

/** Maps the persisted row onto the shared DTO used by the storefront. */
export function toSpecDto(spec: any, attributes: FilamentAttribute[]): FilamentSpecDTO {
  return {
    id: spec.id,
    productId: spec.product_id,
    brandId: null,
    brandName: null,
    manufacturer: spec.manufacturer ?? null,
    material: spec.material,
    materialVariant: spec.material_variant ?? null,
    finish: spec.finish ?? null,
    diameterMm: spec.diameter_mm,
    netFilamentWeightG: spec.net_filament_weight_g,
    grossWeightG: spec.gross_weight_g ?? null,
    densityGCm3: spec.density_g_cm3 ?? null,
    nozzleTemperature: {
      min: spec.nozzle_temperature_min ?? null,
      max: spec.nozzle_temperature_max ?? null,
    },
    bedTemperature: {
      min: spec.bed_temperature_min ?? null,
      max: spec.bed_temperature_max ?? null,
    },
    drying: {
      temperature: spec.drying_temperature ?? null,
      durationHours: spec.drying_duration_hours ?? null,
    },
    maxVolumetricSpeed: spec.max_volumetric_speed ?? null,
    heatResistanceC: spec.heat_resistance_c ?? null,
    enclosureRecommended: Boolean(spec.enclosure_recommended),
    hardenedNozzleRecommended: Boolean(spec.hardened_nozzle_recommended),
    abrasive: Boolean(spec.abrasive),
    foodContactInformation: spec.food_contact_information ?? null,
    amsCompatible: spec.ams_compatible ?? null,
    amsLiteCompatible: spec.ams_lite_compatible ?? null,
    spoolMaterial: spec.spool_material ?? null,
    technicalDatasheetUrl: spec.technical_datasheet_url ?? null,
    safetyDatasheetUrl: spec.safety_datasheet_url ?? null,
    ratings: toRatings(spec),
    attributes,
  };
}

export default FilamentModuleService;
