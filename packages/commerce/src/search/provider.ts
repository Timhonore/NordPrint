import type {
  ProductQuery,
  ProductSearchResult,
  SearchSuggestionResult,
} from "@nordprint/types";

/**
 * Search provider abstraction.
 *
 * v1 is PostgreSQL-backed (full-text + trigram) and lives in the commerce
 * backend. Swapping in Meilisearch/Typesense/OpenSearch later must not require
 * touching a single UI component — they only ever see this interface.
 */
export interface SearchProvider {
  readonly id: string;
  /** Faceted catalogue search — powers /produkter and every category page. */
  search(query: ProductQuery): Promise<ProductSearchResult>;
  /** Fast, typo-tolerant autocomplete — powers the header search. */
  suggest(term: string, limit?: number): Promise<SearchSuggestionResult>;
  /** Called after catalogue writes. No-op for providers that read live data. */
  reindex?(productIds?: readonly string[]): Promise<void>;
  /** Reports whether the provider can serve traffic (used by /health). */
  health?(): Promise<{ ok: boolean; detail?: string }>;
}

/**
 * Normalises the kind of query customers actually type:
 *
 *   "sort pla"        → colour + material
 *   "PLA 1.75"        → material + diameter
 *   "petg bambu"      → material + brand
 *   "x1c nozzle"      → printer + part
 *   "0.4 hardened"    → nozzle size + property
 *   "build plate p1s" → part + printer
 *
 * The parsed hints let the PostgreSQL provider boost the right rows without a
 * dedicated engine, and give a future engine structured filters for free.
 */
export interface ParsedSearchTerm {
  readonly raw: string;
  readonly text: string;
  readonly tokens: readonly string[];
  readonly diameters: readonly number[];
  readonly nozzleSizes: readonly number[];
  readonly materials: readonly string[];
  readonly colors: readonly string[];
  readonly printerHints: readonly string[];
  readonly flags: readonly string[];
  /** The token sequence plus synonym substitutions — see `expandSynonyms`. */
  readonly variants: readonly (readonly string[])[];
}

const MATERIAL_TOKENS: Record<string, string> = {
  pla: "pla",
  petg: "petg",
  pet: "petg",
  abs: "abs",
  asa: "asa",
  tpu: "tpu",
  flex: "tpu",
  nylon: "nylon",
  pa: "nylon",
  pc: "pc",
  pva: "pva",
  hips: "hips",
};

const COLOR_TOKENS: Record<string, string> = {
  sort: "black",
  sorte: "black",
  black: "black",
  hvid: "white",
  hvidt: "white",
  white: "white",
  grå: "grey",
  graa: "grey",
  grey: "grey",
  gray: "grey",
  rød: "red",
  roed: "red",
  red: "red",
  blå: "blue",
  blaa: "blue",
  blue: "blue",
  grøn: "green",
  groen: "green",
  green: "green",
  gul: "yellow",
  yellow: "yellow",
  orange: "orange",
  lilla: "purple",
  purple: "purple",
  pink: "pink",
  brun: "brown",
  brown: "brown",
  beige: "beige",
  guld: "gold",
  gold: "gold",
  sølv: "silver",
  soelv: "silver",
  silver: "silver",
  transparent: "transparent",
  klar: "transparent",
};

/** Model shorthands customers type instead of the full product name. */
const PRINTER_TOKENS = new Set([
  "x1",
  "x1c",
  "x1e",
  "p1p",
  "p1s",
  "a1",
  "mini",
  "mk4",
  "mk3",
  "mk4s",
  "xl",
  "core",
  "one",
  "ender",
  "k1",
  "k2",
  "neptune",
  "kobra",
  "sv06",
  "voron",
  "trident",
]);

const FLAG_TOKENS = new Set([
  "hardened",
  "hærdet",
  "haerdet",
  "matte",
  "silk",
  "cf",
  "carbon",
  "glow",
  "wood",
  "hf",
  "dryer",
  "tørrer",
  "toerrer",
  "ams",
]);

const DIAMETERS = new Set([1.75, 2.85, 3.0]);

/**
 * Danish customers mix languages freely: "hardened nozzle" and "hærdet dyse"
 * mean the same thing and both must find the same product. Each entry expands
 * to the other spellings so the provider can match on any of them.
 */
const SYNONYMS: Record<string, string[]> = {
  hardened: ["hærdet", "haerdet"],
  hærdet: ["hardened"],
  haerdet: ["hardened", "hærdet"],
  nozzle: ["dyse"],
  dyse: ["nozzle"],
  dryer: ["tørrer", "toerrer", "tørring"],
  tørrer: ["dryer"],
  toerrer: ["dryer", "tørrer"],
  plate: ["plade", "byggeplade"],
  plade: ["plate"],
  spool: ["spole"],
  spole: ["spool"],
  storage: ["opbevaring"],
  opbevaring: ["storage"],
  tool: ["værktøj", "vaerktoej"],
  "værktøj": ["tool"],
  hotend: ["hot-end", "varmeblok"],
  brass: ["messing"],
  messing: ["brass"],
};

/**
 * Every spelling of the query worth matching: the tokens as typed, plus one
 * variant per synonym substitution. The caller turns these into LIKE patterns.
 */
function expandSynonyms(tokens: readonly string[]): string[][] {
  const variants: string[][] = [[...tokens]];

  tokens.forEach((token, index) => {
    for (const replacement of SYNONYMS[token] ?? []) {
      const variant = [...tokens];
      variant[index] = replacement;
      variants.push(variant);
    }
  });

  return variants;
}

export function parseSearchTerm(raw: string): ParsedSearchTerm {
  const text = raw.trim().replace(/\s+/g, " ");
  const tokens = text
    .toLowerCase()
    // Danes type "1,75" for the diameter, but also use commas to separate
    // terms. Protect the decimal comma first, then split on the rest.
    .replace(/(\d),(\d)/g, "$1.$2")
    .split(/[\s,/]+/)
    .filter(Boolean);

  const diameters: number[] = [];
  const nozzleSizes: number[] = [];
  const materials: string[] = [];
  const colors: string[] = [];
  const printerHints: string[] = [];
  const flags: string[] = [];

  for (const token of tokens) {
    const numeric = Number(token.replace(",", "."));
    if (Number.isFinite(numeric)) {
      if (DIAMETERS.has(numeric)) diameters.push(numeric);
      // Nozzle diameters are the small ones: 0.2 – 1.0 mm.
      else if (numeric > 0 && numeric <= 1.2) nozzleSizes.push(numeric);
      continue;
    }

    const material = MATERIAL_TOKENS[token];
    if (material) {
      materials.push(material);
      continue;
    }

    const color = COLOR_TOKENS[token];
    if (color) {
      colors.push(color);
      continue;
    }

    if (PRINTER_TOKENS.has(token)) {
      printerHints.push(token);
      continue;
    }

    if (FLAG_TOKENS.has(token)) flags.push(token);
  }

  return {
    raw,
    text,
    tokens,
    diameters: [...new Set(diameters)],
    nozzleSizes: [...new Set(nozzleSizes)],
    materials: [...new Set(materials)],
    colors: [...new Set(colors)],
    printerHints: [...new Set(printerHints)],
    flags: [...new Set(flags)],
    variants: expandSynonyms(tokens),
  };
}

/** SQL `LIKE` patterns covering every spelling of the query. */
export function toLikePatterns(term: ParsedSearchTerm): string[] {
  if (term.tokens.length === 0) return [];
  return [...new Set(term.variants.map((variant) => `%${variant.join("%")}%`))];
}

/** Builds a PostgreSQL `websearch_to_tsquery`-safe expression. */
export function toTsQuery(term: ParsedSearchTerm): string {
  return term.tokens
    .map((token) => token.replace(/[^\p{L}\p{N}.-]/gu, ""))
    .filter((token) => token.length > 1)
    .join(" ");
}
