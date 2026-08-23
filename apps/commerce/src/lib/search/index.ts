import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type { MedusaContainer } from "@medusajs/framework/types";
import type { SearchProvider } from "@nordprint/commerce";
import { PostgresSearchProvider } from "./postgres-search-provider";

let cached: SearchProvider | null = null;

/**
 * Resolves the configured search provider.
 *
 * Today it is always PostgreSQL. When a dedicated engine is introduced this is
 * the single place that changes — every route and UI component depends on the
 * `SearchProvider` interface, not on the implementation.
 */
export function resolveSearchProvider(scope: MedusaContainer): SearchProvider {
  if (cached) return cached;
  const knex = scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
  cached = new PostgresSearchProvider(knex);
  return cached;
}

export { PostgresSearchProvider };
