import type {
  FilamentMaterial,
  PrintIntent,
  Priority,
  Rating1To5,
} from "@nordprint/types";

/**
 * The knowledge base behind "Find filament".
 *
 * Keeping the rules as data (rather than as `if` statements inside the engine)
 * means a product manager can tune the recommendations, and an AI-backed
 * engine can later be trained or prompted with exactly the same table.
 */

export interface MaterialProfile {
  readonly material: FilamentMaterial;
  readonly label: string;
  /** Baseline ratings used when a product has no explicit ratings set. */
  readonly ratings: Record<
    "printability" | "strength" | "flexibility" | "heatResistance" | "uvResistance",
    Rating1To5
  >;
  /** Intents this material is a good answer to. */
  readonly intents: Partial<Record<PrintIntent, number>>;
  /** Relative price level, 1 = cheapest. */
  readonly priceLevel: 1 | 2 | 3 | 4;
  readonly requiresEnclosure: boolean;
  readonly abrasive: boolean;
  readonly note: string;
}

export const MATERIAL_PROFILES: readonly MaterialProfile[] = [
  {
    material: "pla",
    label: "PLA",
    ratings: { printability: 5, strength: 3, flexibility: 1, heatResistance: 1, uvResistance: 2 },
    intents: { decoration: 3, prototypes: 3, beginner: 3, functional: 1 },
    priceLevel: 1,
    requiresEnclosure: false,
    note: "Nemmest at printe og billigst — perfekt til dekoration, figurer og hurtige prototyper.",
    abrasive: false,
  },
  {
    material: "petg",
    label: "PETG",
    ratings: { printability: 4, strength: 4, flexibility: 2, heatResistance: 3, uvResistance: 4 },
    intents: { functional: 3, outdoor: 3, prototypes: 2, beginner: 1 },
    priceLevel: 2,
    requiresEnclosure: false,
    note: "Sejt og vejrbestandigt. Det oplagte skridt op fra PLA til funktionelle dele.",
    abrasive: false,
  },
  {
    material: "asa",
    label: "ASA",
    ratings: { printability: 2, strength: 4, flexibility: 2, heatResistance: 4, uvResistance: 5 },
    intents: { outdoor: 3, functional: 2, heat_resistant: 2 },
    priceLevel: 3,
    requiresEnclosure: true,
    note: "Bygget til udendørs brug — UV-stabilt og varmebestandigt, men vil have et lukket kabinet.",
    abrasive: false,
  },
  {
    material: "abs",
    label: "ABS",
    ratings: { printability: 2, strength: 4, flexibility: 2, heatResistance: 4, uvResistance: 2 },
    intents: { functional: 2, heat_resistant: 2, prototypes: 1 },
    priceLevel: 2,
    requiresEnclosure: true,
    note: "Klassisk teknisk plast. Kan slibes og limes, men warper uden lukket kabinet.",
    abrasive: false,
  },
  {
    material: "tpu",
    label: "TPU",
    ratings: { printability: 2, strength: 3, flexibility: 5, heatResistance: 2, uvResistance: 3 },
    intents: { flexible: 3, functional: 1 },
    priceLevel: 3,
    requiresEnclosure: false,
    note: "Gummiagtigt og slidstærkt. Print langsomt — og helst direct drive.",
    abrasive: false,
  },
  {
    material: "nylon",
    label: "Nylon (PA)",
    ratings: { printability: 1, strength: 5, flexibility: 3, heatResistance: 4, uvResistance: 3 },
    intents: { very_strong: 3, functional: 3, heat_resistant: 2 },
    priceLevel: 4,
    requiresEnclosure: true,
    note: "Meget stærkt og slidstærkt til tandhjul og lejer. Skal tørres før hver print.",
    abrasive: true,
  },
  {
    material: "pc",
    label: "PC",
    ratings: { printability: 1, strength: 5, flexibility: 2, heatResistance: 5, uvResistance: 3 },
    intents: { heat_resistant: 3, very_strong: 3 },
    priceLevel: 4,
    requiresEnclosure: true,
    note: "Højeste varmebestandighed og stivhed. Kræver høj dysetemperatur og lukket kabinet.",
    abrasive: false,
  },
];

/** Which rating a priority maps onto, and how hard it weighs. */
export const PRIORITY_WEIGHTS: Record<
  Priority,
  {
    readonly rating?: keyof MaterialProfile["ratings"];
    readonly weight: number;
    readonly label: string;
  }
> = {
  easy_to_print: { rating: "printability", weight: 3, label: "Nem at printe" },
  strength: { rating: "strength", weight: 3, label: "Stærk" },
  flexibility: { rating: "flexibility", weight: 3, label: "Fleksibel" },
  heat_resistance: { rating: "heatResistance", weight: 3, label: "Varmebestandig" },
  uv_resistance: { rating: "uvResistance", weight: 3, label: "UV-bestandig" },
  finish: { weight: 2, label: "Flot finish" },
  low_price: { weight: 3, label: "Lav pris" },
  high_speed: { weight: 2, label: "Høj printhastighed" },
};

export function materialProfile(material: FilamentMaterial): MaterialProfile | undefined {
  return MATERIAL_PROFILES.find((profile) => profile.material === material);
}
