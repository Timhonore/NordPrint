"use client";

import * as React from "react";
import Link from "next/link";
import type { Facet, ProductQuery } from "@nordprint/types";
import { serializeProductQuery, toggleFilterValue } from "@nordprint/commerce";
import { Button, VisuallyHidden, cn } from "@nordprint/ui";
import { ChevronDownIcon, FilterIcon, XIcon } from "@/components/icons";

/**
 * Facet panel.
 *
 * Sidebar from `lg` up, full-height drawer below it — a sidebar squeezed into
 * 360 px is unusable, and a filter nobody can reach is a filter nobody uses.
 *
 * Every option is a real `<Link>` to the filtered URL. That is deliberate:
 * filters stay shareable and crawlable, work without JavaScript, and can be
 * middle-clicked. The only thing this component's JavaScript does is open and
 * close the drawer and the accordions.
 */
export function FacetPanel({
  facets,
  query,
  basePath,
  activeCount,
  resultCount,
}: {
  readonly facets: readonly Facet[];
  readonly query: ProductQuery;
  readonly basePath: string;
  readonly activeCount: number;
  readonly resultCount: number;
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const close = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const content = (
    <div className="space-y-1">
      {facets.map((facet) => (
        <FacetGroup
          key={facet.key}
          facet={facet}
          query={query}
          basePath={basePath}
          onNavigate={close}
        />
      ))}
    </div>
  );

  return (
    <>
      {/* Mobile trigger */}
      <div className="mb-4 lg:hidden">
        <Button
          variant="secondary"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="filter-drawer"
          full
        >
          <FilterIcon />
          Filtre
          {activeCount > 0 ? (
            <span className="ml-1 grid size-5 place-items-center rounded-full bg-accent text-xs font-semibold text-white">
              {activeCount}
            </span>
          ) : null}
        </Button>
      </div>

      {/* Desktop sidebar */}
      <aside aria-label="Filtre" className="hidden lg:block">
        <div className="sticky top-28">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Filtre</h2>
            {activeCount > 0 ? (
              <Link href={basePath} className="text-xs text-ink-faint hover:text-negative hover:underline">
                Ryd alle
              </Link>
            ) : null}
          </div>
          {content}
        </div>
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            aria-label="Luk filtre"
            className="absolute inset-0 animate-fade bg-ink/40"
            onClick={close}
          />
          <div
            ref={panelRef}
            id="filter-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Filtre"
            className="absolute inset-y-0 right-0 flex w-[min(22rem,92vw)] animate-slide-in flex-col bg-surface"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
              <h2 className="text-base font-semibold">Filtre</h2>
              <Button variant="ghost" size="icon" onClick={close}>
                <XIcon />
                <VisuallyHidden>Luk filtre</VisuallyHidden>
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-4">{content}</div>

            <div className="shrink-0 space-y-2 border-t border-line p-4">
              <Button full onClick={close}>
                Vis {resultCount} {resultCount === 1 ? "produkt" : "produkter"}
              </Button>
              {activeCount > 0 ? (
                <Link
                  href={basePath}
                  onClick={close}
                  className="block text-center text-sm text-ink-faint hover:text-negative hover:underline"
                >
                  Ryd alle filtre
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** How many values a group shows before "vis flere". */
const COLLAPSE_AFTER = 6;

function FacetGroup({
  facet,
  query,
  basePath,
  onNavigate,
}: {
  facet: Facet;
  query: ProductQuery;
  basePath: string;
  onNavigate: () => void;
}): React.JSX.Element | null {
  const selected = selectedValues(query, facet.key);
  // A group the customer has already used stays open; the rest start closed
  // so the panel is scannable.
  const [expanded, setExpanded] = React.useState(selected.length > 0);
  const [showAll, setShowAll] = React.useState(false);

  if (facet.type === "range") {
    return <PriceFacet facet={facet} query={query} basePath={basePath} onNavigate={onNavigate} />;
  }

  if (facet.values.length === 0) return null;

  const visible = showAll ? facet.values : facet.values.slice(0, COLLAPSE_AFTER);

  return (
    <section className="border-b border-line py-3 last:border-0">
      <h3>
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
          className="flex w-full items-center justify-between gap-2 text-sm font-medium text-ink"
        >
          <span>
            {facet.label}
            {selected.length > 0 ? (
              <span className="ml-1.5 text-xs font-normal text-accent">({selected.length})</span>
            ) : null}
          </span>
          <ChevronDownIcon
            className={cn("size-4 text-ink-faint transition-transform", expanded && "rotate-180")}
          />
        </button>
      </h3>

      {expanded ? (
        <div className="mt-2.5">
          {facet.type === "swatch" ? (
            <ul className="flex flex-wrap gap-1.5">
              {visible.map((value) => {
                const isSelected = selected.includes(value.value);
                return (
                  <li key={value.value}>
                    <Link
                      href={facetHref(basePath, query, facet.key, value.value)}
                      onClick={onNavigate}
                      aria-pressed={isSelected}
                      title={`${value.label} (${value.count})`}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition-colors",
                        isSelected
                          ? "border-accent bg-accent-soft text-ink"
                          : "border-line hover:bg-surface-muted"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        style={{ background: value.hex ?? "#d0d5da" }}
                        className="size-3.5 rounded-full ring-1 ring-inset ring-black/10"
                      />
                      {value.label}
                      <span className="text-ink-faint tabular-nums">{value.count}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ul className="space-y-0.5">
              {visible.map((value) => {
                const isSelected = selected.includes(value.value);
                return (
                  <li key={value.value}>
                    <Link
                      href={facetHref(basePath, query, facet.key, value.value)}
                      onClick={onNavigate}
                      className="flex items-center gap-2.5 rounded-md px-1 py-1.5 text-sm transition-colors hover:bg-surface-muted"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "grid size-4 shrink-0 place-items-center rounded border transition-colors",
                          isSelected ? "border-accent bg-accent" : "border-line-strong bg-surface"
                        )}
                      >
                        {isSelected ? (
                          <svg viewBox="0 0 16 16" className="size-3 text-white">
                            <path
                              d="m3.5 8.5 3 3 6-7"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : null}
                      </span>
                      <span className={cn("flex-1", isSelected ? "text-ink" : "text-ink-soft")}>
                        {value.label}
                      </span>
                      <span className="text-xs text-ink-faint tabular-nums">{value.count}</span>
                      <VisuallyHidden>
                        {isSelected ? "Valgt — klik for at fjerne" : "Klik for at filtrere"}
                      </VisuallyHidden>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {facet.values.length > COLLAPSE_AFTER ? (
            <button
              type="button"
              onClick={() => setShowAll((current) => !current)}
              className="mt-2 text-xs font-medium text-accent hover:underline"
            >
              {showAll ? "Vis færre" : `Vis alle ${facet.values.length}`}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/**
 * Price filter.
 *
 * Preset brackets rather than a dual-handle slider: a slider is fiddly on a
 * phone, impossible with a keyboard without extra work, and the brackets are
 * what customers actually think in.
 */
function PriceFacet({
  facet,
  query,
  basePath,
  onNavigate,
}: {
  facet: Facet;
  query: ProductQuery;
  basePath: string;
  onNavigate: () => void;
}): React.JSX.Element | null {
  const min = facet.min ?? 0;
  const max = facet.max ?? 0;
  if (max <= min) return null;

  // Round brackets outward to whole hundreds of kroner.
  const step = Math.max(10000, Math.ceil((max - min) / 4 / 10000) * 10000);
  const brackets: { label: string; min?: number; max?: number }[] = [];

  for (let lower = Math.floor(min / step) * step; lower < max; lower += step) {
    const upper = lower + step;
    brackets.push({
      label:
        lower === 0
          ? `Under ${upper / 100} kr`
          : upper >= max
            ? `Over ${lower / 100} kr`
            : `${lower / 100}–${upper / 100} kr`,
      ...(lower > 0 ? { min: lower } : {}),
      ...(upper < max ? { max: upper } : {}),
    });
  }

  const active = (bracket: { min?: number; max?: number }): boolean =>
    query.priceMin === bracket.min && query.priceMax === bracket.max;

  return (
    <section className="border-b border-line py-3 last:border-0">
      <h3 className="text-sm font-medium text-ink">{facet.label}</h3>
      <ul className="mt-2.5 space-y-0.5">
        {brackets.map((bracket) => {
          const isActive = active(bracket);
          const next: ProductQuery = {
            ...query,
            page: 1,
            ...(isActive
              ? { priceMin: undefined, priceMax: undefined }
              : { priceMin: bracket.min, priceMax: bracket.max }),
          };
          const search = serializeProductQuery(next);
          return (
            <li key={bracket.label}>
              <Link
                href={search ? `${basePath}?${search}` : basePath}
                onClick={onNavigate}
                className={cn(
                  "block rounded-md px-1 py-1.5 text-sm transition-colors hover:bg-surface-muted",
                  isActive ? "font-medium text-accent" : "text-ink-soft"
                )}
              >
                {bracket.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Which of a facet's values are currently applied. */
function selectedValues(query: ProductQuery, key: string): string[] {
  switch (key) {
    case "material":
      return [...(query.material ?? [])];
    case "finish":
      return [...(query.finish ?? [])];
    case "brand":
      return [...(query.brand ?? [])];
    case "color":
      return [...(query.color ?? [])];
    case "diameter":
      return (query.diameter ?? []).map(String);
    case "vaegt":
      return (query.spoolWeight ?? []).map(String);
    default:
      return [];
  }
}

/** URL with one facet value toggled and pagination reset. */
function facetHref(
  basePath: string,
  query: ProductQuery,
  key: string,
  value: string
): string {
  let next: ProductQuery;

  if (key === "diameter" || key === "vaegt") {
    const field = key === "diameter" ? "diameter" : "spoolWeight";
    const current = (query[field] ?? []) as readonly number[];
    const numeric = Number(value);
    next = {
      ...query,
      [field]: current.includes(numeric)
        ? current.filter((entry) => entry !== numeric)
        : [...current, numeric],
      page: 1,
    };
  } else {
    next = toggleFilterValue(query, key as "material" | "finish" | "brand" | "color", value);
  }

  const search = serializeProductQuery(next);
  return search ? `${basePath}?${search}` : basePath;
}
