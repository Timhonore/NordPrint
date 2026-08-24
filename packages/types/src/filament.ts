/**
 * Filament is NordPrint's first-class product type.
 *
 * The data model is deliberately split in two:
 *
 *  1. `FilamentSpec` — the frequently filtered, frequently rendered values.
 *     These are real, indexed columns in the commerce backend so that facets
 *     such as material, brand, diameter, spool weight and AMS compatibility
 *     stay fast at catalogue scale.
 *
 *  2. `FilamentAttribute` — a typed attribute bag for the long tail. New
 *     manufacturer-specific properties can be added from the admin without a
 *     migration, while still being typed (number/text/boolean/enum) and
 *     therefore renderable and validatable.
 *
 * A pure JSON blob was rejected: it cannot be indexed and it makes the admin
 * UI guesswork. A column-per-property model was rejected too: it turns every
 * new datasheet field into a migration.
 */

export const FILAMENT_MATERIALS = [
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
] as const;
export type FilamentMaterial = (typeof FILAMENT_MATERIALS)[number];

export const FILAMENT_FINISHES = [
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
] as const;
export type FilamentFinish = (typeof FILAMENT_FINISHES)[number];

export const FILAMENT_DIAMETERS = [1.75, 2.85, 3.0] as const;
export type FilamentDiameter = (typeof FILAMENT_DIAMETERS)[number];

/** Ratings are shown as five dots on the product page. */
export type Rating1To5 = 1 | 2 | 3 | 4 | 5;

export interface FilamentRatings {
  /** Printvenlighed */
  readonly printability?: Rating1To5;
  /** Styrke */
  readonly strength?: Rating1To5;
  /** Fleksibilitet */
  readonly flexibility?: Rating1To5;
  /** Varmebestandighed */
  readonly heatResistance?: Rating1To5;
  /** UV-bestandighed */
  readonly uvResistance?: Rating1To5;
  /** Lagbinding / layer adhesion */
  readonly layerAdhesion?: Rating1To5;
}

export type FilamentAttributeType = "number" | "text" | "boolean" | "enum" | "url";

/** Admin-defined attribute definition — the schema half of the typed bag. */
export interface FilamentAttributeDefinition {
  readonly id: string;
  readonly key: string;
  readonly label: string;
  readonly type: FilamentAttributeType;
  readonly unit?: string | null;
  readonly options?: readonly string[] | null;
  readonly group?: string | null;
  readonly filterable: boolean;
  readonly rank: number;
}

/** A resolved attribute value belonging to one filament spec. */
export interface FilamentAttribute {
  readonly key: string;
  readonly label: string;
  readonly type: FilamentAttributeType;
  readonly unit?: string | null;
  readonly group?: string | null;
  readonly value: string | number | boolean | null;
}

export interface TemperatureRange {
  readonly min: number | null;
  readonly max: number | null;
}

export interface FilamentDryingProfile {
  readonly temperature: number | null;
  readonly durationHours: number | null;
}

/**
 * Product-level filament data. Variant-level data (colour, SKU, stock) lives
 * in `FilamentVariantSpec`.
 */
export interface FilamentSpec {
  readonly id: string;
  readonly productId: string;

  readonly brandId: string | null;
  readonly brandName: string | null;
  readonly manufacturer: string | null;

  readonly material: FilamentMaterial;
  /** e.g. "PLA Basic", "PETG HF", "PLA-CF" */
  readonly materialVariant: string | null;
  readonly finish: FilamentFinish | null;

  readonly diameterMm: FilamentDiameter | number;
  readonly netFilamentWeightG: number;
  readonly grossWeightG: number | null;
  readonly densityGCm3: number | null;

  readonly nozzleTemperature: TemperatureRange;
  readonly bedTemperature: TemperatureRange;
  readonly drying: FilamentDryingProfile;

  readonly maxVolumetricSpeed: number | null;
  /** Heat deflection temperature in °C, when published by the manufacturer. */
  readonly heatResistanceC: number | null;

  readonly enclosureRecommended: boolean;
  readonly hardenedNozzleRecommended: boolean;
  readonly abrasive: boolean;
  readonly foodContactInformation: string | null;

  readonly amsCompatible: boolean | null;
  readonly amsLiteCompatible: boolean | null;

  readonly spoolMaterial: string | null;

  readonly technicalDatasheetUrl: string | null;
  readonly safetyDatasheetUrl: string | null;

  readonly ratings: FilamentRatings;
  readonly attributes: readonly FilamentAttribute[];
}

/** Variant-level filament data — one physical, sellable spool. */
export interface FilamentVariantSpec {
  readonly id: string;
  readonly variantId: string;
  readonly colorName: string | null;
  /** Normalised `#rrggbb`. */
  readonly colorHex: string | null;
  /** Second hex for dual-tone / gradient spools. */
  readonly colorHexSecondary: string | null;
  /** Manufacturer's own colour code, e.g. "10100". */
  readonly manufacturerColorCode: string | null;
  readonly colorFamily: ColorFamily | null;
  readonly diameterMm: number | null;
  readonly netFilamentWeightG: number | null;
  readonly expectedRestockAt: string | null;
}

export const COLOR_FAMILIES = [
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
] as const;
export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export const MATERIAL_LABELS: Record<FilamentMaterial, string> = {
  pla: "PLA",
  petg: "PETG",
  abs: "ABS",
  asa: "ASA",
  tpu: "TPU",
  nylon: "Nylon (PA)",
  pc: "PC",
  pva: "PVA",
  hips: "HIPS",
  pp: "PP",
  pet: "PET",
  peek: "PEEK",
  support: "Support",
  other: "Øvrige",
};

export const FINISH_LABELS: Record<FilamentFinish, string> = {
  basic: "Basic",
  matte: "Matte",
  silk: "Silk",
  "high-speed": "High Speed",
  wood: "Wood",
  marble: "Marble",
  glow: "Glow",
  "carbon-fiber": "Carbon Fiber",
  "glass-fiber": "Glass Fiber",
  translucent: "Transparent",
  metallic: "Metallic",
  gradient: "Gradient",
  other: "Øvrige",
};

export const COLOR_FAMILY_LABELS: Record<ColorFamily, string> = {
  black: "Sort",
  white: "Hvid",
  grey: "Grå",
  red: "Rød",
  orange: "Orange",
  yellow: "Gul",
  green: "Grøn",
  blue: "Blå",
  purple: "Lilla",
  pink: "Pink",
  brown: "Brun",
  beige: "Beige",
  gold: "Guld",
  silver: "Sølv",
  transparent: "Transparent",
  multi: "Flerfarvet",
};
