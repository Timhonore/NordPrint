import type { ColorFamily, FilamentFinish, FilamentMaterial } from "@nordprint/types";

/**
 * Development catalogue.
 *
 * Everything here is NordPrint's own fictional house brand plus two invented
 * supplier brands. Descriptions are written for this repository — no
 * manufacturer copy is reproduced, and no real product data is scraped.
 *
 * Prices are in minor units (øre) and are illustrative. Spool weights vary on
 * purpose (1000 g, 750 g, 500 g) so the price-per-kg calculation is exercised
 * by real seed data and not only by unit tests.
 */

export interface SeedColor {
  name: string;
  hex: string;
  hexSecondary?: string;
  family: ColorFamily;
  code: string;
  /** Stock level, chosen to cover every stock state in the UI. */
  stock: number;
  expectedRestockInDays?: number;
}

export interface SeedFilament {
  handle: string;
  title: string;
  subtitle: string;
  description: string;
  brandHandle: string;
  categoryHandles: string[];
  material: FilamentMaterial;
  materialVariant: string;
  finish: FilamentFinish;
  diameterMm: number;
  netWeightG: number;
  grossWeightG: number;
  densityGCm3: number;
  price: number;
  /** Set to make the product appear in /tilbud with a genuine førpris. */
  salePrice?: number;
  costPrice: number;
  nozzle: [number, number];
  bed: [number, number];
  drying: [number, number];
  maxVolumetricSpeed: number;
  heatResistanceC: number | null;
  enclosureRecommended: boolean;
  hardenedNozzleRecommended: boolean;
  abrasive: boolean;
  amsCompatible: boolean;
  amsLiteCompatible: boolean;
  spoolMaterial: string;
  foodContactInformation: string | null;
  ratings: {
    printability: number;
    strength: number;
    flexibility: number;
    heatResistance: number;
    uvResistance: number;
    layerAdhesion: number;
  };
  /** Typed attributes, by definition key. */
  attributes?: Record<string, string | number | boolean>;
  colors: SeedColor[];
}

const CORE_COLORS: SeedColor[] = [
  { name: "Jet Black", hex: "#111111", family: "black", code: "NP-10101", stock: 42 },
  { name: "Jade White", hex: "#f5f5f0", family: "white", code: "NP-10100", stock: 38 },
  { name: "Beige", hex: "#e0cda9", family: "beige", code: "NP-10201", stock: 4 },
  { name: "Signalrød", hex: "#c0392b", family: "red", code: "NP-10301", stock: 17 },
  { name: "Nordisk Blå", hex: "#1f6feb", family: "blue", code: "NP-10401", stock: 26 },
  { name: "Dyb Lilla", hex: "#6b3fa0", family: "purple", code: "NP-10501", stock: 2 },
  { name: "Rav Orange", hex: "#e67e22", family: "orange", code: "NP-10601", stock: 11 },
  {
    name: "Skovgrøn",
    hex: "#1e7d4f",
    family: "green",
    code: "NP-10701",
    stock: 0,
    expectedRestockInDays: 9,
  },
];

export const SEED_BRANDS = [
  {
    name: "NordPrint",
    handle: "nordprint",
    description:
      "Vores eget mærke. Vi vælger leverandør efter konsistens i diameter og farve — ikke efter pris alene.",
    featured: true,
    rank: 1,
  },
  {
    name: "Fjeldfilament",
    handle: "fjeldfilament",
    description: "Fiktivt testbrand brugt i udviklingsdata. Findes ikke.",
    featured: true,
    rank: 2,
  },
  {
    name: "Skagen Polymer",
    handle: "skagen-polymer",
    description: "Fiktivt testbrand brugt i udviklingsdata. Findes ikke.",
    featured: true,
    rank: 3,
  },
];

export const SEED_CATEGORIES = [
  { name: "Filament", handle: "filament", parent: null, rank: 1 },
  { name: "PLA", handle: "filament-pla", parent: "filament", rank: 1 },
  { name: "PETG", handle: "filament-petg", parent: "filament", rank: 2 },
  { name: "ASA & ABS", handle: "filament-asa-abs", parent: "filament", rank: 3 },
  { name: "TPU", handle: "filament-tpu", parent: "filament", rank: 4 },
  { name: "Teknisk filament", handle: "filament-teknisk", parent: "filament", rank: 5 },

  { name: "Reservedele", handle: "reservedele", parent: null, rank: 2 },
  { name: "Dyser", handle: "reservedele-dyser", parent: "reservedele", rank: 1 },
  { name: "Hotends", handle: "reservedele-hotends", parent: "reservedele", rank: 2 },
  { name: "Build plates", handle: "reservedele-build-plates", parent: "reservedele", rank: 3 },

  { name: "Tilbehør", handle: "tilbehoer", parent: null, rank: 3 },
  { name: "Filamenttørrere", handle: "tilbehoer-filamenttoerrere", parent: "tilbehoer", rank: 1 },
  { name: "Opbevaring", handle: "tilbehoer-opbevaring", parent: "tilbehoer", rank: 2 },
  { name: "Vedligeholdelse", handle: "tilbehoer-vedligeholdelse", parent: "tilbehoer", rank: 3 },

  { name: "Værktøj", handle: "vaerktoej", parent: null, rank: 4 },
];

/** Attribute definitions for the typed long tail. */
export const SEED_ATTRIBUTE_DEFINITIONS = [
  {
    key: "izod_impact_strength",
    label: "Slagsejhed (Izod)",
    type: "number" as const,
    unit: "kJ/m²",
    group: "Mekaniske egenskaber",
    filterable: false,
    rank: 1,
  },
  {
    key: "tensile_strength",
    label: "Trækstyrke",
    type: "number" as const,
    unit: "MPa",
    group: "Mekaniske egenskaber",
    filterable: false,
    rank: 2,
  },
  {
    key: "bending_modulus",
    label: "Bøjningsmodul",
    type: "number" as const,
    unit: "MPa",
    group: "Mekaniske egenskaber",
    filterable: false,
    rank: 3,
  },
  {
    key: "shore_hardness",
    label: "Shore-hårdhed",
    type: "text" as const,
    unit: null,
    group: "Mekaniske egenskaber",
    filterable: false,
    rank: 4,
  },
  {
    key: "recommended_print_speed",
    label: "Anbefalet printhastighed",
    type: "number" as const,
    unit: "mm/s",
    group: "Printindstillinger",
    filterable: false,
    rank: 5,
  },
  {
    key: "recycled_content",
    label: "Genanvendt indhold",
    type: "boolean" as const,
    unit: null,
    group: "Bæredygtighed",
    filterable: true,
    rank: 6,
  },
];

export const SEED_FILAMENTS: SeedFilament[] = [
  {
    handle: "nordprint-pla-basic",
    title: "NordPrint PLA Basic",
    subtitle: "Til alt det, du printer mest",
    description:
      "Vores arbejdshest. PLA Basic er let at printe, lugter ikke og giver rene detaljer " +
      "ved både lave og høje hastigheder. Vi kontrollerer hver batch for diameterafvigelse, " +
      "så du slipper for under- og overekstrudering midt i et langt print.\n\n" +
      "Bruges til figurer, prototyper, organisering på værkstedet og alt det, der ikke skal " +
      "ligge i en varm bil.",
    brandHandle: "nordprint",
    categoryHandles: ["filament", "filament-pla"],
    material: "pla",
    materialVariant: "PLA Basic",
    finish: "basic",
    diameterMm: 1.75,
    netWeightG: 1000,
    grossWeightG: 1250,
    densityGCm3: 1.24,
    price: 18900,
    costPrice: 10200,
    nozzle: [190, 230],
    bed: [35, 60],
    drying: [55, 6],
    maxVolumetricSpeed: 21,
    heatResistanceC: 55,
    enclosureRecommended: false,
    hardenedNozzleRecommended: false,
    abrasive: false,
    amsCompatible: true,
    amsLiteCompatible: true,
    spoolMaterial: "Pap",
    foodContactInformation:
      "Ikke godkendt til fødevarekontakt. Printede overflader har mikrorevner, hvor bakterier samler sig.",
    ratings: {
      printability: 5,
      strength: 3,
      flexibility: 1,
      heatResistance: 1,
      uvResistance: 2,
      layerAdhesion: 4,
    },
    attributes: {
      tensile_strength: 46,
      bending_modulus: 2100,
      recommended_print_speed: 250,
      recycled_content: false,
    },
    colors: CORE_COLORS,
  },

  {
    handle: "nordprint-pla-matte",
    title: "NordPrint PLA Matte",
    subtitle: "Mat overflade, der skjuler lagene",
    description:
      "Samme printvenlighed som PLA Basic, men med en mat, ikke-reflekterende overflade. " +
      "Lagene forsvinder i lyset, så modellen ser færdig ud uden efterbehandling.\n\n" +
      "Bruges til displaymodeller, kabinetter og alt, der skal fotograferes.",
    brandHandle: "nordprint",
    categoryHandles: ["filament", "filament-pla"],
    material: "pla",
    materialVariant: "PLA Matte",
    finish: "matte",
    diameterMm: 1.75,
    netWeightG: 1000,
    grossWeightG: 1250,
    densityGCm3: 1.27,
    price: 19900,
    costPrice: 11400,
    nozzle: [200, 230],
    bed: [35, 60],
    drying: [55, 6],
    maxVolumetricSpeed: 16,
    heatResistanceC: 55,
    enclosureRecommended: false,
    hardenedNozzleRecommended: false,
    abrasive: false,
    amsCompatible: true,
    amsLiteCompatible: true,
    spoolMaterial: "Pap",
    foodContactInformation: null,
    ratings: {
      printability: 5,
      strength: 3,
      flexibility: 1,
      heatResistance: 1,
      uvResistance: 2,
      layerAdhesion: 4,
    },
    attributes: { tensile_strength: 42, recommended_print_speed: 200, recycled_content: false },
    colors: [
      { name: "Charcoal", hex: "#2f3437", family: "black", code: "NP-20101", stock: 23 },
      { name: "Ivory", hex: "#efe9dd", family: "white", code: "NP-20100", stock: 19 },
      { name: "Terrakotta", hex: "#b5533c", family: "red", code: "NP-20301", stock: 6 },
      { name: "Mosgrøn", hex: "#4a6b44", family: "green", code: "NP-20701", stock: 3 },
      { name: "Isblå", hex: "#a9c9dd", family: "blue", code: "NP-20401", stock: 14 },
    ],
  },

  {
    handle: "nordprint-petg-hf",
    title: "NordPrint PETG HF",
    subtitle: "Sejt, vejrbestandigt og hurtigt",
    description:
      "PETG HF er formuleret til høj gennemstrømning, så du kan køre hurtigt uden at " +
      "underekstrudere. Materialet er sejere end PLA, tåler sol og fugt og knækker ikke, " +
      "når det bliver skruet i.\n\n" +
      "Bruges til beslag, udendørs dele, kabinetter og alt, der skal holde.",
    brandHandle: "nordprint",
    categoryHandles: ["filament", "filament-petg"],
    material: "petg",
    materialVariant: "PETG HF",
    finish: "high-speed",
    diameterMm: 1.75,
    netWeightG: 1000,
    grossWeightG: 1260,
    densityGCm3: 1.27,
    price: 21900,
    salePrice: 17900,
    costPrice: 12600,
    nozzle: [230, 260],
    bed: [70, 85],
    drying: [65, 8],
    maxVolumetricSpeed: 25,
    heatResistanceC: 75,
    enclosureRecommended: false,
    hardenedNozzleRecommended: false,
    abrasive: false,
    amsCompatible: true,
    amsLiteCompatible: true,
    spoolMaterial: "Pap",
    foodContactInformation:
      "Råmaterialet er fødevaregodkendt, men det færdige print er ikke. Brug ikke til fødevarer.",
    ratings: {
      printability: 4,
      strength: 4,
      flexibility: 2,
      heatResistance: 3,
      uvResistance: 4,
      layerAdhesion: 5,
    },
    attributes: {
      tensile_strength: 52,
      izod_impact_strength: 8.5,
      recommended_print_speed: 300,
      recycled_content: false,
    },
    colors: [
      { name: "Jet Black", hex: "#111111", family: "black", code: "NP-30101", stock: 31 },
      { name: "Klar", hex: "#dfe7ea", family: "transparent", code: "NP-30900", stock: 12 },
      { name: "Signalrød", hex: "#c0392b", family: "red", code: "NP-30301", stock: 5 },
      { name: "Nordisk Blå", hex: "#1f6feb", family: "blue", code: "NP-30401", stock: 22 },
      {
        name: "Skovgrøn",
        hex: "#1e7d4f",
        family: "green",
        code: "NP-30701",
        stock: 0,
        expectedRestockInDays: 14,
      },
    ],
  },

  {
    handle: "fjeldfilament-pla-silk",
    title: "Fjeldfilament PLA Silk",
    subtitle: "Blank overflade — 750 g spole",
    description:
      "Silke-PLA med høj glans. Lagene reflekterer lyset, så modellen ser metallisk ud " +
      "uden maling. Print langsomt og med lidt ekstra temperatur for den bedste glans.\n\n" +
      "Bemærk: spolen indeholder 750 g, ikke 1 kg — prisen pr. kg står under prisen.",
    brandHandle: "fjeldfilament",
    categoryHandles: ["filament", "filament-pla"],
    material: "pla",
    materialVariant: "PLA Silk",
    finish: "silk",
    diameterMm: 1.75,
    netWeightG: 750,
    grossWeightG: 980,
    densityGCm3: 1.25,
    price: 16900,
    costPrice: 9800,
    nozzle: [210, 240],
    bed: [45, 60],
    drying: [55, 6],
    maxVolumetricSpeed: 12,
    heatResistanceC: 55,
    enclosureRecommended: false,
    hardenedNozzleRecommended: false,
    abrasive: false,
    amsCompatible: true,
    amsLiteCompatible: true,
    spoolMaterial: "Plast",
    foodContactInformation: null,
    ratings: {
      printability: 4,
      strength: 2,
      flexibility: 1,
      heatResistance: 1,
      uvResistance: 2,
      layerAdhesion: 3,
    },
    attributes: { recommended_print_speed: 120, recycled_content: false },
    colors: [
      { name: "Guld", hex: "#c8a24a", family: "gold", code: "FF-40601", stock: 9 },
      { name: "Sølv", hex: "#b8bfc4", family: "silver", code: "FF-40602", stock: 15 },
      { name: "Kobber", hex: "#a4622d", family: "brown", code: "FF-40603", stock: 1 },
      {
        name: "Blå/Lilla",
        hex: "#2a4fb0",
        hexSecondary: "#7b3fa0",
        family: "multi",
        code: "FF-40604",
        stock: 7,
      },
    ],
  },

  {
    handle: "nordprint-asa",
    title: "NordPrint ASA",
    subtitle: "Bygget til at stå udenfor",
    description:
      "ASA er UV-stabilt og bliver ikke gult i solen. Det tåler varme langt bedre end PLA " +
      "og kan slibes og limes.\n\n" +
      "Kræver lukket kabinet — ASA warper og delaminerer i træk. Print med lukket dør og " +
      "gerne 100 °C på bedet.",
    brandHandle: "nordprint",
    categoryHandles: ["filament", "filament-asa-abs"],
    material: "asa",
    materialVariant: "ASA",
    finish: "basic",
    diameterMm: 1.75,
    netWeightG: 1000,
    grossWeightG: 1240,
    densityGCm3: 1.07,
    price: 27900,
    costPrice: 16800,
    nozzle: [250, 280],
    bed: [90, 100],
    drying: [70, 8],
    maxVolumetricSpeed: 14,
    heatResistanceC: 95,
    enclosureRecommended: true,
    hardenedNozzleRecommended: false,
    abrasive: false,
    amsCompatible: true,
    amsLiteCompatible: false,
    spoolMaterial: "Plast",
    foodContactInformation: null,
    ratings: {
      printability: 2,
      strength: 4,
      flexibility: 2,
      heatResistance: 4,
      uvResistance: 5,
      layerAdhesion: 4,
    },
    attributes: { tensile_strength: 44, izod_impact_strength: 12, recycled_content: false },
    colors: [
      { name: "Jet Black", hex: "#111111", family: "black", code: "NP-50101", stock: 13 },
      { name: "Trafikhvid", hex: "#f2f2ef", family: "white", code: "NP-50100", stock: 8 },
      { name: "Antracit", hex: "#3c4045", family: "grey", code: "NP-50201", stock: 4 },
    ],
  },

  {
    handle: "skagen-polymer-tpu-95a",
    title: "Skagen Polymer TPU 95A",
    subtitle: "Fleksibel — 500 g spole",
    description:
      "Blødt, gummiagtigt filament til pakninger, greb, hjul og dæmpere. Shore 95A er " +
      "stift nok til at kunne printes på de fleste maskiner, men bøjeligt nok til at give efter.\n\n" +
      "Print langsomt, med lav retraction og gerne direct drive.",
    brandHandle: "skagen-polymer",
    categoryHandles: ["filament", "filament-tpu"],
    material: "tpu",
    materialVariant: "TPU 95A",
    finish: "basic",
    diameterMm: 1.75,
    netWeightG: 500,
    grossWeightG: 720,
    densityGCm3: 1.21,
    price: 24900,
    costPrice: 15400,
    nozzle: [220, 240],
    bed: [30, 50],
    drying: [70, 10],
    maxVolumetricSpeed: 4,
    heatResistanceC: 70,
    enclosureRecommended: false,
    hardenedNozzleRecommended: false,
    abrasive: false,
    amsCompatible: false,
    amsLiteCompatible: false,
    spoolMaterial: "Plast",
    foodContactInformation: null,
    ratings: {
      printability: 2,
      strength: 3,
      flexibility: 5,
      heatResistance: 2,
      uvResistance: 3,
      layerAdhesion: 4,
    },
    attributes: { shore_hardness: "95A", recommended_print_speed: 30, recycled_content: false },
    colors: [
      { name: "Sort", hex: "#141414", family: "black", code: "SP-60101", stock: 11 },
      { name: "Natur", hex: "#e8e2d5", family: "white", code: "SP-60100", stock: 6 },
      { name: "Signalgul", hex: "#e8b71a", family: "yellow", code: "SP-60601", stock: 0 },
    ],
  },

  {
    handle: "nordprint-pa-cf",
    title: "NordPrint PA-CF",
    subtitle: "Kulfiberforstærket nylon",
    description:
      "Nylon med kulfiber til dele, der skal holde til rigtige kræfter: tandhjul, " +
      "værktøjsholdere, drone-rammer. Stivt, slidstærkt og varmebestandigt.\n\n" +
      "Slibende materiale — kræver hærdet dyse. Tør altid spolen før print; nylon suger " +
      "fugt fra luften på få timer.",
    brandHandle: "nordprint",
    categoryHandles: ["filament", "filament-teknisk"],
    material: "nylon",
    materialVariant: "PA-CF",
    finish: "carbon-fiber",
    diameterMm: 1.75,
    netWeightG: 1000,
    grossWeightG: 1280,
    densityGCm3: 1.16,
    price: 44900,
    costPrice: 29500,
    nozzle: [270, 300],
    bed: [90, 100],
    drying: [80, 12],
    maxVolumetricSpeed: 10,
    heatResistanceC: 130,
    enclosureRecommended: true,
    hardenedNozzleRecommended: true,
    abrasive: true,
    amsCompatible: true,
    amsLiteCompatible: false,
    spoolMaterial: "Plast",
    foodContactInformation: null,
    ratings: {
      printability: 1,
      strength: 5,
      flexibility: 3,
      heatResistance: 4,
      uvResistance: 3,
      layerAdhesion: 4,
    },
    attributes: {
      tensile_strength: 115,
      bending_modulus: 6200,
      izod_impact_strength: 9,
      recycled_content: false,
    },
    colors: [
      { name: "Kulsort", hex: "#1a1a1a", family: "black", code: "NP-70101", stock: 7 },
      { name: "Grafitgrå", hex: "#4d5257", family: "grey", code: "NP-70201", stock: 2 },
    ],
  },
];

export interface SeedAccessory {
  handle: string;
  title: string;
  subtitle: string;
  description: string;
  brandHandle: string;
  categoryHandles: string[];
  kind: "spare_part" | "accessory" | "tool";
  price: number;
  costPrice: number;
  weightG: number;
  variants: { title: string; sku: string; stock: number; priceDelta?: number }[];
  /** Printer handles this fits, with an optional condition. */
  compatibility?: {
    printerHandle: string;
    status: "compatible" | "conditional" | "incompatible";
    note?: string;
  }[];
}

export const SEED_ACCESSORIES: SeedAccessory[] = [
  {
    handle: "nordprint-hardened-nozzle",
    title: "Hærdet stål-dyse",
    subtitle: "Til slibende filament",
    description:
      "Hærdet stål tåler kulfiber, glasfiber og glow-filament, hvor en messingdyse " +
      "slides op på få hundrede gram.\n\n" +
      "Bemærk: hærdet stål leder varme dårligere end messing. Sæt dysetemperaturen " +
      "5-10 °C op i forhold til dit vante profil.",
    brandHandle: "nordprint",
    categoryHandles: ["reservedele", "reservedele-dyser"],
    kind: "spare_part",
    price: 14900,
    costPrice: 6900,
    weightG: 25,
    variants: [
      { title: "0,2 mm", sku: "NP-NOZ-HS-02", stock: 12 },
      { title: "0,4 mm", sku: "NP-NOZ-HS-04", stock: 34 },
      { title: "0,6 mm", sku: "NP-NOZ-HS-06", stock: 18 },
      { title: "0,8 mm", sku: "NP-NOZ-HS-08", stock: 3 },
    ],
    compatibility: [
      { printerHandle: "bambu-lab-x1-carbon", status: "compatible" },
      { printerHandle: "bambu-lab-x1", status: "compatible" },
      { printerHandle: "bambu-lab-p1s", status: "compatible" },
      { printerHandle: "bambu-lab-p1p", status: "compatible" },
      {
        printerHandle: "bambu-lab-a1",
        status: "conditional",
        note: "Passer kun med A1-hotend — ikke det oprindelige A1 Mini-hotend.",
      },
    ],
  },
  {
    handle: "nordprint-pei-build-plate",
    title: "PEI build plate — dobbeltsidet",
    subtitle: "Glat på den ene side, textured på den anden",
    description:
      "Fjederstål med PEI-belægning på begge sider. Den glatte side giver blanke " +
      "førstelag, den texturerede giver mat bund og slipper lettere.\n\n" +
      "Vask med varmt vand og opvaskemiddel, når vedhæftningen falder — ikke sprit alene.",
    brandHandle: "nordprint",
    categoryHandles: ["reservedele", "reservedele-build-plates"],
    kind: "spare_part",
    price: 29900,
    costPrice: 17500,
    weightG: 480,
    variants: [
      { title: "257 × 257 mm", sku: "NP-PLATE-PEI-257", stock: 14 },
      { title: "180 × 180 mm", sku: "NP-PLATE-PEI-180", stock: 8 },
    ],
    compatibility: [
      { printerHandle: "bambu-lab-p1s", status: "compatible" },
      { printerHandle: "bambu-lab-x1-carbon", status: "compatible" },
      { printerHandle: "bambu-lab-p1p", status: "compatible" },
      {
        printerHandle: "bambu-lab-a1-mini",
        status: "conditional",
        note: "Kun 180 × 180 mm-varianten passer til A1 Mini.",
      },
    ],
  },
  {
    handle: "nordprint-filament-dryer",
    title: "NordPrint filamenttørrer",
    subtitle: "To spoler ad gangen — print direkte fra boksen",
    description:
      "Tørrer to 1 kg-spoler samtidigt ved 35-70 °C med cirkulerende varme. " +
      "Kan printes direkte fra, så nylon og PETG ikke når at suge fugt igen.\n\n" +
      "Fugt i filamentet er den mest oversete årsag til dårlig lagbinding, poppende " +
      "lyde under print og ru overflader.",
    brandHandle: "nordprint",
    categoryHandles: ["tilbehoer", "tilbehoer-filamenttoerrere"],
    kind: "accessory",
    price: 74900,
    costPrice: 43000,
    weightG: 2400,
    variants: [{ title: "Standard", sku: "NP-DRYER-2", stock: 9 }],
  },
  {
    handle: "nordprint-storage-box",
    title: "Opbevaringsboks med tørremiddel",
    subtitle: "Holder spolen tør mellem prints",
    description:
      "Lufttæt boks med genanvendeligt tørremiddel og fugtindikator. Plads til én " +
      "1 kg-spole med gennemføring, så du kan printe direkte fra boksen.",
    brandHandle: "nordprint",
    categoryHandles: ["tilbehoer", "tilbehoer-opbevaring"],
    kind: "accessory",
    price: 24900,
    costPrice: 13200,
    weightG: 900,
    variants: [
      { title: "1 spole", sku: "NP-BOX-1", stock: 27 },
      { title: "2 spoler", sku: "NP-BOX-2", stock: 5, priceDelta: 12000 },
    ],
  },
  {
    handle: "nordprint-finishing-kit",
    title: "Efterbehandlingssæt",
    subtitle: "Afgratning, skalpel og pincet",
    description:
      "Det værktøj, du reelt bruger efter hvert print: afgratningsværktøj til " +
      "elefantfod og støttemærker, skalpel med reserveblade og en bøjet pincet til " +
      "at pille purge-strenge af dysen med.",
    brandHandle: "nordprint",
    categoryHandles: ["vaerktoej"],
    kind: "tool",
    price: 19900,
    costPrice: 9400,
    weightG: 320,
    variants: [{ title: "Standard", sku: "NP-TOOL-KIT", stock: 41 }],
  },
];
