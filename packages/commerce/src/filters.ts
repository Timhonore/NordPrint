import {
  COLOR_FAMILIES,
  FILAMENT_FINISHES,
  FILAMENT_MATERIALS,
  PRODUCT_SORT_OPTIONS,
  type ColorFamily,
  type FilamentFinish,
  type FilamentMaterial,
  type ProductQuery,
  type ProductSort,
} from "@nordprint/types";
import { commerceConfig } from "@nordprint/config";

/**
 * The URL is the single source of truth for catalogue state.
 *
 * `/filament?material=pla&brand=bambu-lab&color=black`
 *
 * Parsing is defensive: unknown values are dropped rather than 500'ing, so a
 * stale bookmark or a crawler's mangled query still renders a page.
 */

const CSV = ",";

function parseList(value: string | string[] | undefined | null): string[] {
  if (value === undefined || value === null) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .flatMap((entry) => entry.split(CSV))
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function parseNumberList(value: string | string[] | undefined | null): number[] {
  return parseList(value)
    .map(Number)
    .filter((n) => Number.isFinite(n));
}

function parseIntOrUndefined(value: string | string[] | undefined | null): number | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null || raw === "") return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value: string | string[] | undefined | null): boolean | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (raw === "1" || raw === "true") return true;
  if (raw === "0" || raw === "false") return false;
  return undefined;
}

const MATERIAL_SET = new Set<string>(FILAMENT_MATERIALS);
const FINISH_SET = new Set<string>(FILAMENT_FINISHES);
const COLOR_SET = new Set<string>(COLOR_FAMILIES);
const SORT_SET = new Set<string>(PRODUCT_SORT_OPTIONS);

export type SearchParamsLike = Record<string, string | string[] | undefined>;

export function parseProductQuery(
  params: SearchParamsLike,
  defaults: Partial<ProductQuery> = {}
): ProductQuery {
  const sortRaw = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const sort: ProductSort =
    sortRaw !== undefined && SORT_SET.has(sortRaw) ? (sortRaw as ProductSort) : "popular";

  const page = Math.max(1, parseIntOrUndefined(params.side ?? params.page) ?? 1);
  const limit = Math.min(
    96,
    Math.max(1, parseIntOrUndefined(params.limit) ?? commerceConfig.productsPerPage)
  );

  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const kind = Array.isArray(params.kind) ? params.kind[0] : params.kind;
  const categoryHandle = Array.isArray(params.categoryHandle)
    ? params.categoryHandle[0]
    : (params.categoryHandle ?? (Array.isArray(params.kategori) ? params.kategori[0] : params.kategori));

  const query: ProductQuery = {
    ...defaults,
    ...(q ? { q: q.trim() } : {}),
    // Scope filters. These come from the route rather than from the customer,
    // which is why they are never emitted by `serializeProductQuery` — a
    // category page owns its scope, it is not a removable chip.
    ...(kind ? { kind } : {}),
    ...(categoryHandle ? { categoryHandle } : {}),
    material: parseList(params.material).filter((v): v is FilamentMaterial => MATERIAL_SET.has(v)),
    finish: parseList(params.finish).filter((v): v is FilamentFinish => FINISH_SET.has(v)),
    brand: parseList(params.brand),
    color: parseList(params.color).filter((v): v is ColorFamily => COLOR_SET.has(v)),
    diameter: parseNumberList(params.diameter),
    spoolWeight: parseNumberList(params.vaegt ?? params.weight),
    sort,
    page,
    limit,
  };

  const priceMin = parseIntOrUndefined(params.pris_min ?? params.priceMin);
  const priceMax = parseIntOrUndefined(params.pris_max ?? params.priceMax);
  const inStockOnly = parseBoolean(params.lager ?? params.inStock);
  const amsCompatible = parseBoolean(params.ams);
  const hardenedNozzle = parseBoolean(params.hardened);
  const onSale = parseBoolean(params.tilbud);
  const printer = Array.isArray(params.printer) ? params.printer[0] : params.printer;

  return {
    ...query,
    ...(priceMin !== undefined ? { priceMin } : {}),
    ...(priceMax !== undefined ? { priceMax } : {}),
    ...(inStockOnly !== undefined ? { inStockOnly } : {}),
    ...(amsCompatible !== undefined ? { amsCompatible } : {}),
    ...(hardenedNozzle !== undefined ? { hardenedNozzleRequired: hardenedNozzle } : {}),
    ...(onSale !== undefined ? { onSale } : {}),
    ...(printer ? { printerModelId: printer } : {}),
  };
}

/**
 * Serialises a query back to a query string. Defaults are omitted so canonical
 * URLs stay clean — important for SEO and for cache hit rates.
 */
export function serializeProductQuery(query: ProductQuery): string {
  const params = new URLSearchParams();

  const setList = (key: string, values: readonly (string | number)[] | undefined) => {
    if (values && values.length > 0) params.set(key, values.join(CSV));
  };

  if (query.q) params.set("q", query.q);
  setList("material", query.material);
  setList("finish", query.finish);
  setList("brand", query.brand);
  setList("color", query.color);
  setList("diameter", query.diameter);
  setList("vaegt", query.spoolWeight);
  if (query.priceMin !== undefined) params.set("pris_min", String(query.priceMin));
  if (query.priceMax !== undefined) params.set("pris_max", String(query.priceMax));
  if (query.inStockOnly) params.set("lager", "1");
  if (query.amsCompatible) params.set("ams", "1");
  if (query.hardenedNozzleRequired) params.set("hardened", "1");
  if (query.onSale) params.set("tilbud", "1");
  if (query.printerModelId) params.set("printer", query.printerModelId);
  if (query.sort && query.sort !== "popular") params.set("sort", query.sort);
  if (query.page && query.page > 1) params.set("side", String(query.page));
  if (query.limit && query.limit !== commerceConfig.productsPerPage) {
    params.set("limit", String(query.limit));
  }

  params.sort();
  return params.toString();
}

/** Immutably toggles one value of a multi-select facet and resets pagination. */
export function toggleFilterValue<K extends "material" | "finish" | "brand" | "color">(
  query: ProductQuery,
  key: K,
  value: string
): ProductQuery {
  const current = (query[key] ?? []) as readonly string[];
  const next = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value];
  return { ...query, [key]: next, page: 1 } as ProductQuery;
}

/** How many filters the customer has applied — drives the "Ryd filtre" chip. */
export function countActiveFilters(query: ProductQuery): number {
  let count = 0;
  count += query.material?.length ?? 0;
  count += query.finish?.length ?? 0;
  count += query.brand?.length ?? 0;
  count += query.color?.length ?? 0;
  count += query.diameter?.length ?? 0;
  count += query.spoolWeight?.length ?? 0;
  if (query.priceMin !== undefined || query.priceMax !== undefined) count += 1;
  if (query.inStockOnly) count += 1;
  if (query.amsCompatible) count += 1;
  if (query.hardenedNozzleRequired) count += 1;
  if (query.onSale) count += 1;
  if (query.printerModelId) count += 1;
  return count;
}
