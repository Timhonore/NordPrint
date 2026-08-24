import Link from "next/link";
import type { Facet, ProductQuery } from "@nordprint/types";
import { COLOR_FAMILY_LABELS, FINISH_LABELS, MATERIAL_LABELS } from "@nordprint/types";
import { serializeProductQuery } from "@nordprint/commerce";
import { cn } from "@nordprint/ui";
import { XIcon } from "@/components/icons";

/**
 * The filters currently applied, each removable.
 *
 * A server component: every chip is a link to the URL without that one filter,
 * so removing a filter is a normal navigation rather than a state update.
 */
export function ActiveFilterChips({
  query,
  basePath,
  facets,
  className,
}: {
  readonly query: ProductQuery;
  readonly basePath: string;
  readonly facets: readonly Facet[];
  readonly className?: string;
}): React.JSX.Element | null {
  const chips: { key: string; label: string; href: string }[] = [];

  const push = (key: string, label: string, next: ProductQuery): void => {
    const search = serializeProductQuery(next);
    chips.push({ key, label, href: search ? `${basePath}?${search}` : basePath });
  };

  for (const value of query.material ?? []) {
    push(`material-${value}`, MATERIAL_LABELS[value] ?? value, {
      ...query,
      material: (query.material ?? []).filter((entry) => entry !== value),
      page: 1,
    });
  }

  for (const value of query.finish ?? []) {
    push(`finish-${value}`, FINISH_LABELS[value] ?? value, {
      ...query,
      finish: (query.finish ?? []).filter((entry) => entry !== value),
      page: 1,
    });
  }

  const brandFacet = facets.find((facet) => facet.key === "brand");
  for (const value of query.brand ?? []) {
    const label = brandFacet?.values.find((entry) => entry.value === value)?.label ?? value;
    push(`brand-${value}`, label, {
      ...query,
      brand: (query.brand ?? []).filter((entry) => entry !== value),
      page: 1,
    });
  }

  for (const value of query.color ?? []) {
    push(`color-${value}`, COLOR_FAMILY_LABELS[value] ?? value, {
      ...query,
      color: (query.color ?? []).filter((entry) => entry !== value),
      page: 1,
    });
  }

  for (const value of query.diameter ?? []) {
    push(`diameter-${value}`, `${String(value).replace(".", ",")} mm`, {
      ...query,
      diameter: (query.diameter ?? []).filter((entry) => entry !== value),
      page: 1,
    });
  }

  for (const value of query.spoolWeight ?? []) {
    push(`vaegt-${value}`, value % 1000 === 0 ? `${value / 1000} kg` : `${value} g`, {
      ...query,
      spoolWeight: (query.spoolWeight ?? []).filter((entry) => entry !== value),
      page: 1,
    });
  }

  if (query.priceMin !== undefined || query.priceMax !== undefined) {
    const from = query.priceMin !== undefined ? `${query.priceMin / 100} kr` : null;
    const to = query.priceMax !== undefined ? `${query.priceMax / 100} kr` : null;
    push("pris", from && to ? `${from}–${to}` : from ? `Over ${from}` : `Under ${to}`, {
      ...query,
      priceMin: undefined,
      priceMax: undefined,
      page: 1,
    });
  }

  if (query.inStockOnly) {
    push("lager", "Kun på lager", { ...query, inStockOnly: false, page: 1 });
  }
  if (query.amsCompatible) {
    push("ams", "AMS-kompatibel", { ...query, amsCompatible: false, page: 1 });
  }
  if (query.hardenedNozzleRequired !== undefined) {
    push("hardened", query.hardenedNozzleRequired ? "Kræver hærdet dyse" : "Uden hærdet dyse", {
      ...query,
      hardenedNozzleRequired: undefined,
      page: 1,
    });
  }
  if (query.onSale) {
    push("tilbud", "På tilbud", { ...query, onSale: false, page: 1 });
  }

  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="text-xs text-ink-faint">Aktive filtre:</span>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink transition-colors hover:border-negative/40 hover:text-negative"
        >
          {chip.label}
          <XIcon className="size-3" />
          <span className="sr-only">Fjern filter</span>
        </Link>
      ))}
      <Link
        href={basePath}
        className="text-xs font-medium text-ink-faint underline-offset-2 hover:text-negative hover:underline"
      >
        Ryd alle
      </Link>
    </div>
  );
}
