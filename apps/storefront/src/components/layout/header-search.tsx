"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { SearchSuggestionResult } from "@nordprint/types";
import { formatMoney } from "@nordprint/commerce";
import { Button, StockIndicator, VisuallyHidden, cn } from "@nordprint/ui";
import { SearchIcon, XIcon } from "@/components/icons";

/**
 * Header search with autocomplete.
 *
 * Implemented as a WAI-ARIA combobox so screen readers announce how many
 * results appeared and which one is highlighted. Requests are debounced and
 * the in-flight one is aborted when the customer keeps typing, so results can
 * never arrive out of order and show a stale list.
 */
const DEBOUNCE_MS = 180;
const MIN_QUERY_LENGTH = 2;

const EMPTY: SearchSuggestionResult = {
  products: [],
  categories: [],
  guides: [],
  query: "",
};

export function HeaderSearch(): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [term, setTerm] = React.useState("");
  const [results, setResults] = React.useState<SearchSuggestionResult>(EMPTY);
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const [activeIndex, setActiveIndex] = React.useState(-1);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const active = term.trim().length >= MIN_QUERY_LENGTH;

  React.useEffect(() => {
    if (!active) return;

    const controller = new AbortController();
    // All state changes happen asynchronously, after the debounce — the effect
    // body itself only schedules work.
    const timer = setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetch(`/api/soeg?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search failed");
        setResults((await response.json()) as SearchSuggestionResult);
        setStatus("idle");
      } catch (error) {
        // An aborted request is the expected outcome of typing, not an error.
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term, active]);

  React.useEffect(() => {
    const onPointerDown = (event: PointerEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const products = active ? results.products : EMPTY.products;
  const hasResults =
    products.length > 0 ||
    (active && (results.categories.length > 0 || results.guides.length > 0));

  const submit = (): void => {
    if (term.trim().length === 0) return;
    setOpen(false);
    router.push(`/soeg?q=${encodeURIComponent(term.trim())}`);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, products.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, -1));
      return;
    }
    if (event.key === "Enter") {
      const active = products[activeIndex];
      if (active) {
        event.preventDefault();
        setOpen(false);
        router.push(`/produkt/${active.handle}`);
        return;
      }
      submit();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Below lg the search collapses to an icon that opens the full field. */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      >
        <SearchIcon />
        <VisuallyHidden>Søg</VisuallyHidden>
      </Button>

      <div
        className={cn(
          "lg:relative lg:block",
          open
            ? "fixed inset-x-0 top-0 z-[70] border-b border-line bg-surface p-3 lg:static lg:border-0 lg:bg-transparent lg:p-0"
            : "hidden lg:block"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-72 xl:w-96">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint"
              aria-hidden="true"
            />
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-expanded={open && hasResults}
              aria-controls="soegeresultater"
              aria-autocomplete="list"
              aria-label="Søg efter produkter"
              placeholder="Søg — fx sort PLA eller 0.4 hardened"
              value={term}
              onChange={(event) => {
                setTerm(event.target.value);
                setOpen(true);
                setActiveIndex(-1);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              className="h-11 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            />
          </div>

          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(false)}>
            <XIcon />
            <VisuallyHidden>Luk søgning</VisuallyHidden>
          </Button>
        </div>

        {/* Live region: screen readers hear how many results arrived. */}
        <VisuallyHidden aria-live="polite">
          {status === "loading"
            ? "Søger …"
            : hasResults
              ? `${products.length} produkter fundet`
              : term.length >= MIN_QUERY_LENGTH
                ? "Ingen resultater"
                : ""}
        </VisuallyHidden>

        {open && term.trim().length >= MIN_QUERY_LENGTH ? (
          <div
            id="soegeresultater"
            role="listbox"
            aria-label="Søgeforslag"
            className="absolute inset-x-3 top-full mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-surface p-2 shadow-[0_20px_44px_-28px_rgb(13_17_23/0.45)] lg:inset-x-auto lg:right-0 lg:w-[26rem]"
          >
            {status === "error" ? (
              <p className="px-3 py-6 text-center text-sm text-ink-soft">
                Søgningen kunne ikke gennemføres.{" "}
                <button
                  type="button"
                  className="font-medium text-accent underline"
                  onClick={() => setTerm((current) => `${current} `.trim())}
                >
                  Prøv igen
                </button>
              </p>
            ) : !hasResults && status !== "loading" ? (
              <p className="px-3 py-6 text-center text-sm text-ink-soft">
                Ingen resultater for “{term}”.
                <br />
                <Link
                  href="/find-filament"
                  className="mt-1 inline-block font-medium text-accent hover:underline"
                  onClick={() => setOpen(false)}
                >
                  Lad os finde det rigtige filament for dig →
                </Link>
              </p>
            ) : (
              <>
                {products.map((product, index) => (
                  <Link
                    key={product.id}
                    href={`/produkt/${product.handle}`}
                    role="option"
                    aria-selected={index === activeIndex}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg p-2 transition-colors",
                      index === activeIndex ? "bg-surface-muted" : "hover:bg-surface-muted"
                    )}
                  >
                    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-canvas">
                      {product.thumbnail ? (
                        <Image
                          src={product.thumbnail}
                          alt=""
                          width={48}
                          height={48}
                          className="size-full object-cover"
                        />
                      ) : (
                        <span className="grid-plate size-full" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {product.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        {product.brandName ? (
                          <span className="text-xs text-ink-faint">{product.brandName}</span>
                        ) : null}
                        <StockIndicator status={product.stock} className="text-xs" />
                      </span>
                    </span>
                    {product.price ? (
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                        {formatMoney(product.price)}
                      </span>
                    ) : null}
                  </Link>
                ))}

                {results.guides.length > 0 ? (
                  <div className="mt-1 border-t border-line pt-2">
                    <p className="px-2 pb-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
                      Guides
                    </p>
                    {results.guides.map((guide) => (
                      <Link
                        key={guide.slug}
                        href={`/guides/${guide.slug}`}
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-2 py-2 text-sm text-ink-soft hover:bg-surface-muted hover:text-ink"
                      >
                        {guide.title}
                      </Link>
                    ))}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={submit}
                  className="mt-1 w-full rounded-lg border-t border-line px-2 py-2.5 text-center text-sm font-medium text-accent hover:bg-surface-muted"
                >
                  Se alle resultater for “{term}”
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
