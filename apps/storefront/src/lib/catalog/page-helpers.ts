import type { Metadata } from "next";
import type { ProductQuery, ProductSearchResult } from "@nordprint/types";
import { countActiveFilters, parseProductQuery, serializeProductQuery } from "@nordprint/commerce";
import { siteConfig } from "@nordprint/config";
import { EMPTY_SEARCH_RESULT, fetchCatalog } from "@/lib/api/catalog";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Shared plumbing for every catalogue route.
 *
 * Parsing, fetching and metadata are identical for /produkter, /filament,
 * /tilbud and the category pages — only the base path and the fixed filters
 * differ.
 */
export async function loadCatalogPage(
  searchParams: SearchParams,
  options: {
    defaults?: Partial<ProductQuery>;
    categoryHandle?: string;
    kind?: string;
  } = {}
): Promise<{ query: ProductQuery; result: ProductSearchResult; failed: boolean }> {
  const params = await searchParams;
  const query = parseProductQuery(params, options.defaults);

  const response = await fetchCatalog(query, {
    ...(options.categoryHandle ? { categoryHandle: options.categoryHandle } : {}),
    ...(options.kind ? { kind: options.kind } : {}),
  });

  return {
    query,
    result: response.ok ? response.data : EMPTY_SEARCH_RESULT,
    failed: !response.ok,
  };
}

/**
 * Catalogue metadata.
 *
 * The canonical URL deliberately drops filters: a filtered view is a slice of
 * the same catalogue, and letting every combination be its own indexable URL
 * is how a shop ends up with thousands of near-duplicate pages competing with
 * each other. Filtered views stay `follow` so the crawler still reaches the
 * products.
 */
export function catalogMetadata(options: {
  title: string;
  description: string;
  basePath: string;
  query: ProductQuery;
}): Metadata {
  const filtered = countActiveFilters(options.query) > 0;
  const page = options.query.page ?? 1;

  const canonical =
    page > 1 ? `${options.basePath}?side=${page}` : options.basePath;

  return {
    title: page > 1 ? `${options.title} — side ${page}` : options.title,
    description: options.description,
    alternates: { canonical },
    ...(filtered ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: options.title,
      description: options.description,
      url: `${siteConfig.url}${canonical}`,
      type: "website",
    },
  };
}

/** Kept for callers that need the raw serializer without importing twice. */
export { serializeProductQuery };
