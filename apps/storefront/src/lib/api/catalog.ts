import type {
  Brand,
  GuideDetail,
  GuideSummary,
  ProductDetail,
  ProductQuery,
  ProductSearchResult,
  SearchSuggestionResult,
} from "@nordprint/types";
import { serializeProductQuery } from "@nordprint/commerce";
import { apiFetch, orFallback, type ApiResult } from "./client";

/** Cache tags, so a catalogue write can invalidate exactly what it changed. */
export const CACHE_TAGS = {
  catalog: "catalog",
  brands: "brands",
  printers: "printers",
  guides: "guides",
  product: (handle: string) => `product:${handle}`,
} as const;

export const EMPTY_SEARCH_RESULT: ProductSearchResult = {
  items: [],
  total: 0,
  page: 1,
  limit: 24,
  pageCount: 1,
  facets: [],
  sort: "popular",
};

export async function fetchCatalog(
  query: ProductQuery,
  extra: { categoryHandle?: string; kind?: string } = {}
): Promise<ApiResult<ProductSearchResult>> {
  const params = new URLSearchParams(serializeProductQuery(query));
  if (extra.categoryHandle) params.set("categoryHandle", extra.categoryHandle);
  if (extra.kind) params.set("kind", extra.kind);

  const suffix = params.toString();
  return apiFetch<ProductSearchResult>(
    `/store/nordprint/catalog${suffix ? `?${suffix}` : ""}`,
    { revalidate: 60, tags: [CACHE_TAGS.catalog] }
  );
}

export async function fetchProduct(
  handle: string,
  printerModelId?: string | null
): Promise<ProductDetail | null> {
  const query = printerModelId ? `?printer=${encodeURIComponent(printerModelId)}` : "";
  const result = await apiFetch<{ product: ProductDetail }>(
    `/store/nordprint/products/${encodeURIComponent(handle)}${query}`,
    // A personalised compatibility verdict must not be cached across visitors.
    printerModelId
      ? { revalidate: 0 }
      : { revalidate: 60, tags: [CACHE_TAGS.product(handle), CACHE_TAGS.catalog] }
  );
  return result.ok ? result.data.product : null;
}

export async function fetchBrands(featuredOnly = false): Promise<Brand[]> {
  const result = await apiFetch<{ brands: Brand[] }>(
    `/store/nordprint/brands${featuredOnly ? "?featured=1" : ""}`,
    { revalidate: 300, tags: [CACHE_TAGS.brands] }
  );
  return orFallback(result, { brands: [] }).brands;
}

export interface PrinterTree {
  brands: {
    id: string;
    name: string;
    handle: string;
    logoUrl: string | null;
    families: {
      id: string;
      name: string;
      handle: string;
      models: {
        id: string;
        name: string;
        handle: string;
        displayName: string;
        enclosed: boolean;
        supportsAms: boolean;
        supportsAmsLite: boolean;
        hardenedNozzleStock: boolean;
        maxNozzleTemperature: number | null;
        maxBedTemperature: number | null;
        buildVolumeMm: { x: number; y: number; z: number } | null;
        imageUrl: string | null;
      }[];
    }[];
  }[];
  models: {
    id: string;
    handle: string;
    displayName: string;
    brand: { name: string; handle: string };
  }[];
}

export async function fetchPrinters(): Promise<PrinterTree> {
  const result = await apiFetch<PrinterTree>("/store/nordprint/printers", {
    revalidate: 600,
    tags: [CACHE_TAGS.printers],
  });
  return orFallback(result, { brands: [], models: [] });
}

export async function fetchGuides(limit = 24): Promise<GuideSummary[]> {
  const result = await apiFetch<{ guides: GuideSummary[] }>(
    `/store/nordprint/guides?limit=${limit}`,
    { revalidate: 300, tags: [CACHE_TAGS.guides] }
  );
  return orFallback(result, { guides: [] }).guides;
}

export async function fetchGuide(slug: string): Promise<GuideDetail | null> {
  const result = await apiFetch<{ guide: GuideDetail }>(
    `/store/nordprint/guides/${encodeURIComponent(slug)}`,
    { revalidate: 300, tags: [CACHE_TAGS.guides] }
  );
  return result.ok ? result.data.guide : null;
}

export async function fetchSuggestions(term: string): Promise<SearchSuggestionResult> {
  const result = await apiFetch<SearchSuggestionResult>(
    `/store/nordprint/search?q=${encodeURIComponent(term)}`,
    { revalidate: 30 }
  );
  return orFallback(result, { products: [], categories: [], guides: [], query: term });
}

export interface ShopSettings {
  usps: { id: string; title: string; description: string; icon: string }[];
  currency: string;
  freeShippingThreshold: number;
  stockThresholds: { inStockAbove: number; lowStockAtOrBelow: number; allowBackorder: boolean };
  maxCompareItems: number;
  productsPerPage: number;
}

export async function fetchSettings(): Promise<ShopSettings | null> {
  const result = await apiFetch<ShopSettings>("/store/nordprint/settings", { revalidate: 300 });
  return result.ok ? result.data : null;
}

export async function fetchComparison(handles: string[]): Promise<ProductDetail[]> {
  if (handles.length === 0) return [];
  const result = await apiFetch<{ products: ProductDetail[] }>(
    `/store/nordprint/compare?handles=${encodeURIComponent(handles.join(","))}`,
    { revalidate: 60 }
  );
  return orFallback(result, { products: [] }).products;
}
