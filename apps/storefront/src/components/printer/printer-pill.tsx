"use client";

import * as React from "react";
import { Button, VisuallyHidden, cn } from "@nordprint/ui";
import { ChevronDownIcon, PrinterIcon, XIcon } from "@/components/icons";
import { usePreferences } from "@/lib/preferences/preferences-provider";
import type { PrinterTree } from "@/lib/api/catalog";

/**
 * "Min printer" — the control that turns a generic catalogue into a personal
 * one.
 *
 * Guests keep the choice in local storage; logged-in customers have it merged
 * into their account at login. Until it is set, the pill invites the customer
 * to choose; once set, every product page can answer "passer det til min
 * printer?".
 */
export function PrinterPill({ className }: { className?: string }): React.JSX.Element {
  const { primaryPrinter, ready, removePrinter } = usePreferences();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm transition-colors hover:bg-surface-muted",
          className
        )}
      >
        <PrinterIcon className="size-4 shrink-0 text-ink-faint" />
        <span className="min-w-0 flex-1 text-left">
          {/* Before hydration we do not know the saved printer, so the neutral
              label is rendered on both server and client. */}
          {!ready ? (
            <span className="text-ink-soft">Min printer</span>
          ) : primaryPrinter ? (
            <span className="block truncate font-medium text-ink">
              {primaryPrinter.displayName}
            </span>
          ) : (
            <span className="text-ink-soft">Vælg din printer</span>
          )}
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-ink-faint" />
      </button>

      {open ? <PrinterDialog onClose={() => setOpen(false)} onRemove={removePrinter} /> : null}
    </>
  );
}

function PrinterDialog({
  onClose,
  onRemove,
}: {
  onClose: () => void;
  onRemove: (modelId: string) => void;
}): React.JSX.Element {
  const { savePrinter, primaryPrinter } = usePreferences();
  const [tree, setTree] = React.useState<PrinterTree | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = React.useState("");
  const dialogRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/printere");
        if (!response.ok) throw new Error("printers failed");
        const body = (await response.json()) as PrinterTree;
        if (!cancelled) {
          setTree(body);
          setStatus("ready");
        }
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const normalized = query.trim().toLowerCase();
  const brands = (tree?.brands ?? [])
    .map((brand) => ({
      ...brand,
      families: brand.families
        .map((family) => ({
          ...family,
          models: family.models.filter(
            (model) =>
              normalized.length === 0 ||
              model.displayName.toLowerCase().includes(normalized) ||
              brand.name.toLowerCase().includes(normalized)
          ),
        }))
        .filter((family) => family.models.length > 0),
    }))
    .filter((brand) => brand.families.length > 0);

  return (
    <div className="fixed inset-0 z-[80] grid place-items-end sm:place-items-center sm:p-4">
      <button
        type="button"
        aria-label="Luk"
        className="absolute inset-0 animate-fade bg-ink/40"
        onClick={onClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="printer-dialog-titel"
        className="relative flex max-h-[85vh] w-full animate-rise flex-col rounded-t-2xl bg-surface sm:max-w-xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <h2 id="printer-dialog-titel" className="text-lg font-semibold">
              Vælg din printer
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Så viser vi, hvad der passer — og hvad der kræver forbehold.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XIcon />
            <VisuallyHidden>Luk</VisuallyHidden>
          </Button>
        </div>

        <div className="border-b border-line p-4">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Søg efter model — fx X1C eller MK4"
            aria-label="Søg efter printer"
            className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {status === "loading" ? (
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-11 animate-pulse rounded-lg bg-surface-muted" />
              ))}
            </div>
          ) : status === "error" ? (
            <p className="py-8 text-center text-sm text-ink-soft">
              Printerlisten kunne ikke hentes.{" "}
              <button
                type="button"
                className="font-medium text-accent underline"
                onClick={() => window.location.reload()}
              >
                Prøv igen
              </button>
            </p>
          ) : brands.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-soft">
              Ingen printere matcher “{query}”.
            </p>
          ) : (
            <div className="space-y-5">
              {brands.map((brand) => (
                <section key={brand.id}>
                  <h3 className="mb-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
                    {brand.name}
                  </h3>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {brand.families.flatMap((family) =>
                      family.models.map((model) => {
                        const selected = primaryPrinter?.modelId === model.id;
                        return (
                          <button
                            key={model.id}
                            type="button"
                            onClick={() => {
                              savePrinter({
                                modelId: model.id,
                                displayName: model.displayName,
                                handle: model.handle,
                                savedAt: new Date().toISOString(),
                              });
                              onClose();
                            }}
                            className={cn(
                              "flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                              selected
                                ? "border-accent bg-accent-soft text-ink"
                                : "border-line hover:bg-surface-muted"
                            )}
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{model.name}</span>
                              <span className="mt-0.5 block text-xs text-ink-faint">
                                {model.enclosed ? "Lukket" : "Åben"}
                                {model.supportsAms ? " · AMS" : ""}
                                {model.supportsAmsLite ? " · AMS Lite" : ""}
                                {model.hardenedNozzleStock ? " · hærdet dyse" : ""}
                              </span>
                            </span>
                            {selected ? (
                              <span className="shrink-0 text-xs font-medium text-accent">
                                Valgt
                              </span>
                            ) : null}
                          </button>
                        );
                      })
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        {primaryPrinter ? (
          <div className="border-t border-line p-4">
            <button
              type="button"
              onClick={() => {
                onRemove(primaryPrinter.modelId);
                onClose();
              }}
              className="text-sm text-ink-faint underline-offset-2 hover:text-negative hover:underline"
            >
              Fjern {primaryPrinter.displayName}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
