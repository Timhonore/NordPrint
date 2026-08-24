import Link from "next/link";
import type { ProductQuery } from "@nordprint/types";
import { serializeProductQuery } from "@nordprint/commerce";
import { cn } from "@nordprint/ui";
import { ChevronRightIcon } from "@/components/icons";

/**
 * Pagination.
 *
 * Real links with `rel="prev"`/`rel="next"`, so search engines can walk the
 * catalogue and customers can open a page in a new tab. Infinite scroll would
 * be worse on both counts.
 */
export function Pagination({
  page,
  pageCount,
  query,
  basePath,
  className,
}: {
  readonly page: number;
  readonly pageCount: number;
  readonly query: ProductQuery;
  readonly basePath: string;
  readonly className?: string;
}): React.JSX.Element | null {
  if (pageCount <= 1) return null;

  const href = (target: number): string => {
    const search = serializeProductQuery({ ...query, page: target });
    return search ? `${basePath}?${search}` : basePath;
  };

  return (
    <nav
      aria-label="Sidenavigation"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      {page > 1 ? (
        <Link
          href={href(page - 1)}
          rel="prev"
          className="grid size-10 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:bg-surface-muted"
        >
          <ChevronRightIcon className="size-4 rotate-180" />
          <span className="sr-only">Forrige side</span>
        </Link>
      ) : null}

      {pageNumbers(page, pageCount).map((entry, index) =>
        entry === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-ink-faint" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={href(entry)}
            aria-current={entry === page ? "page" : undefined}
            className={cn(
              "grid size-10 place-items-center rounded-lg border text-sm tabular-nums transition-colors",
              entry === page
                ? "border-accent bg-accent text-white"
                : "border-line text-ink-soft hover:bg-surface-muted"
            )}
          >
            {entry}
            <span className="sr-only">Side {entry}</span>
          </Link>
        )
      )}

      {page < pageCount ? (
        <Link
          href={href(page + 1)}
          rel="next"
          className="grid size-10 place-items-center rounded-lg border border-line text-ink-soft transition-colors hover:bg-surface-muted"
        >
          <ChevronRightIcon className="size-4" />
          <span className="sr-only">Næste side</span>
        </Link>
      ) : null}
    </nav>
  );
}

/** First, last, and a window around the current page. */
function pageNumbers(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const window = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  const pages = [...window]
    .filter((entry) => entry >= 1 && entry <= pageCount)
    .sort((a, b) => a - b);

  const result: (number | "gap")[] = [];
  let previous = 0;
  for (const entry of pages) {
    if (previous > 0 && entry - previous > 1) result.push("gap");
    result.push(entry);
    previous = entry;
  }
  return result;
}
