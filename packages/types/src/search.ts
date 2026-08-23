import type { ColorFamily, FilamentFinish, FilamentMaterial } from "./filament";
import type { Money, ProductSummary, StockStatus } from "./catalog";

export const PRODUCT_SORT_OPTIONS = [
  "popular",
  "newest",
  "price_asc",
  "price_desc",
  "price_per_kg_asc",
] as const;
export type ProductSort = (typeof PRODUCT_SORT_OPTIONS)[number];

export const SORT_LABELS: Record<ProductSort, string> = {
  popular: "Mest populære",
  newest: "Nyeste",
  price_asc: "Pris lav-høj",
  price_desc: "Pris høj-lav",
  price_per_kg_asc: "Pris/kg lav-høj",
};

/**
 * Catalogue query. This shape is the contract between the URL, the storefront
 * and whichever search provider is configured — swapping PostgreSQL for a
 * dedicated engine must not change it.
 */
export interface ProductQuery {
  readonly q?: string;
  readonly categoryHandle?: string;
  readonly kind?: string;
  readonly material?: readonly FilamentMaterial[];
  readonly finish?: readonly FilamentFinish[];
  readonly brand?: readonly string[];
  readonly color?: readonly ColorFamily[];
  readonly diameter?: readonly number[];
  readonly spoolWeight?: readonly number[];
  readonly priceMin?: number;
  readonly priceMax?: number;
  readonly inStockOnly?: boolean;
  readonly amsCompatible?: boolean;
  readonly hardenedNozzleRequired?: boolean;
  readonly onSale?: boolean;
  readonly printerModelId?: string;
  readonly sort?: ProductSort;
  readonly page?: number;
  readonly limit?: number;
}

export interface FacetValue {
  readonly value: string;
  readonly label: string;
  readonly count: number;
  /** Optional presentation hint, e.g. a colour swatch hex. */
  readonly hex?: string | null;
}

export interface Facet {
  readonly key: string;
  readonly label: string;
  readonly type: "checkbox" | "swatch" | "range" | "toggle";
  readonly values: readonly FacetValue[];
  readonly min?: number;
  readonly max?: number;
}

export interface ProductSearchResult {
  readonly items: readonly ProductSummary[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly pageCount: number;
  readonly facets: readonly Facet[];
  readonly sort: ProductSort;
}

/** Compact hit used by the header autocomplete. */
export interface SearchSuggestion {
  readonly id: string;
  readonly handle: string;
  readonly title: string;
  readonly brandName: string | null;
  readonly categoryName: string | null;
  readonly thumbnail: string | null;
  readonly price: Money | null;
  readonly stock: StockStatus;
}

export interface SearchSuggestionResult {
  readonly products: readonly SearchSuggestion[];
  readonly categories: readonly { handle: string; name: string }[];
  readonly guides: readonly { slug: string; title: string }[];
  readonly query: string;
}
