"use client";

import { useRouter } from "next/navigation";
import type { ProductQuery, ProductSort } from "@nordprint/types";
import { PRODUCT_SORT_OPTIONS, SORT_LABELS } from "@nordprint/types";
import { serializeProductQuery } from "@nordprint/commerce";

/**
 * Sort control.
 *
 * A native `<select>`: it gets the platform picker on mobile, keyboard support
 * for free, and it is one of the few places where the browser's own control is
 * simply better than anything we would build.
 */
export function SortSelect({
  query,
  basePath,
}: {
  readonly query: ProductQuery;
  readonly basePath: string;
}): React.JSX.Element {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sortering" className="text-sm text-ink-soft">
        Sortér
      </label>
      <select
        id="sortering"
        value={query.sort ?? "popular"}
        onChange={(event) => {
          const next: ProductQuery = {
            ...query,
            sort: event.target.value as ProductSort,
            page: 1,
          };
          const search = serializeProductQuery(next);
          router.push(search ? `${basePath}?${search}` : basePath, { scroll: false });
        }}
        className="h-9 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
      >
        {PRODUCT_SORT_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {SORT_LABELS[option]}
          </option>
        ))}
      </select>
    </div>
  );
}
