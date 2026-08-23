import Link from "next/link";
import type { ProductQuery, ProductSearchResult } from "@nordprint/types";
import { SORT_LABELS } from "@nordprint/types";
import { countActiveFilters, serializeProductQuery } from "@nordprint/commerce";
import { EmptyState, TechLabel, buttonVariants } from "@nordprint/ui";
import { ProductCard } from "./product-card";
import { FacetPanel } from "./facet-panel";
import { SortSelect } from "./sort-select";
import { ActiveFilterChips } from "./active-filter-chips";
import { Pagination } from "./pagination";
import { SearchIcon } from "@/components/icons";

/**
 * The catalogue.
 *
 * Server-rendered end to end: filters, sorting and pagination are all in the
 * URL, resolved in SQL, and returned as one page of products. That means a
 * filtered view is shareable, bookmarkable, cacheable and crawlable — none of
 * which is true of a client-side filter.
 */
export function CatalogView({
  result,
  query,
  basePath,
  title,
  description,
  emptyAction,
}: {
  readonly result: ProductSearchResult;
  readonly query: ProductQuery;
  /** e.g. "/filament" — filters are appended as the query string. */
  readonly basePath: string;
  readonly title: string;
  readonly description?: string;
  readonly emptyAction?: React.ReactNode;
}): React.JSX.Element {
  const activeCount = countActiveFilters(query);
  const hasResults = result.items.length > 0;

  return (
    <div className="container-page py-8 md:py-12">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-ink-soft">{description}</p>
        ) : null}
      </header>

      <div className="lg:grid lg:grid-cols-[16rem_1fr] lg:gap-8">
        <FacetPanel
          facets={result.facets}
          query={query}
          basePath={basePath}
          activeCount={activeCount}
          resultCount={result.total}
        />

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-soft" role="status" aria-live="polite">
              <span className="font-medium text-ink tabular-nums">{result.total}</span>{" "}
              {result.total === 1 ? "produkt" : "produkter"}
              {activeCount > 0 ? " med dine filtre" : ""}
            </p>
            <SortSelect query={query} basePath={basePath} />
          </div>

          {activeCount > 0 ? (
            <ActiveFilterChips
              query={query}
              basePath={basePath}
              facets={result.facets}
              className="mb-5"
            />
          ) : null}

          {hasResults ? (
            <>
              <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {result.items.map((product, index) => (
                  <li key={product.id}>
                    <ProductCard product={product} priority={index < 4} className="h-full" />
                  </li>
                ))}
              </ul>

              <Pagination
                page={result.page}
                pageCount={result.pageCount}
                query={query}
                basePath={basePath}
                className="mt-10"
              />
            </>
          ) : (
            <EmptyState
              icon={<SearchIcon className="size-8" />}
              title="Ingen produkter fundet"
              description={
                activeCount > 0
                  ? "Prøv at fjerne et filter — eller lad os finde det rigtige for dig."
                  : "Der er ikke noget i denne kategori lige nu."
              }
              action={
                emptyAction ?? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {activeCount > 0 ? (
                      <Link href={basePath} className={buttonVariants({ variant: "secondary" })}>
                        Ryd alle filtre
                      </Link>
                    ) : null}
                    <Link href="/find-filament" className={buttonVariants({})}>
                      Find filament
                    </Link>
                  </div>
                )
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

/** Builds a catalogue URL for a modified query. Used by every filter control. */
export function catalogHref(basePath: string, query: ProductQuery): string {
  const search = serializeProductQuery(query);
  return search ? `${basePath}?${search}` : basePath;
}

export function CatalogHeading({ label }: { readonly label: string }): React.JSX.Element {
  return <TechLabel>{label}</TechLabel>;
}

export { SORT_LABELS };
