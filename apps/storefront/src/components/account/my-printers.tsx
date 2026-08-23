"use client";

import * as React from "react";
import Link from "next/link";
import { Badge, Button, EmptyState, buttonVariants, cn } from "@nordprint/ui";
import { CheckIcon, PrinterIcon } from "@/components/icons";
import { usePreferences } from "@/lib/preferences/preferences-provider";
import type { PrinterTree } from "@/lib/api/catalog";

/**
 * "Mine printere".
 *
 * Guests keep their printers in local storage; the list is merged into the
 * account at login. Whichever printer is primary is the one every
 * compatibility badge on the site answers for.
 */
export function MyPrinters({
  brands,
}: {
  readonly brands: PrinterTree["brands"];
}): React.JSX.Element {
  const { printers, primaryPrinterId, ready, savePrinter, removePrinter, setPrimaryPrinter } =
    usePreferences();
  const [adding, setAdding] = React.useState(false);

  const allModels = React.useMemo(
    () =>
      brands.flatMap((brandEntry) =>
        brandEntry.families.flatMap((family) =>
          family.models.map((model) => ({ ...model, brandName: brandEntry.name }))
        )
      ),
    [brands]
  );

  if (!ready) {
    return <div className="h-32 animate-pulse rounded-xl bg-surface-muted" />;
  }

  return (
    <div className="space-y-6">
      {printers.length === 0 ? (
        <EmptyState
          icon={<PrinterIcon className="size-8" />}
          title="Ingen printere gemt endnu"
          description="Tilføj din printer, så vi kan vise dig, hvad der passer til den."
          action={<Button onClick={() => setAdding(true)}>Tilføj printer</Button>}
        />
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {printers.map((printer) => {
              const isPrimary = printer.modelId === primaryPrinterId;
              return (
                <li
                  key={printer.modelId}
                  className={cn(
                    "rounded-xl border p-4",
                    isPrimary ? "border-accent bg-accent-soft" : "border-line bg-surface"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{printer.displayName}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        Gemt{" "}
                        {new Intl.DateTimeFormat("da-DK", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(printer.savedAt))}
                      </p>
                    </div>
                    {isPrimary ? <Badge tone="accent">Primær</Badge> : null}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {!isPrimary ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setPrimaryPrinter(printer.modelId)}
                      >
                        Gør primær
                      </Button>
                    ) : null}
                    <Link
                      href={`/filament?printer=${printer.modelId}`}
                      className={buttonVariants({ size: "sm", variant: "ghost" })}
                    >
                      Se hvad der passer
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-ink-faint hover:text-negative"
                      onClick={() => removePrinter(printer.modelId)}
                    >
                      Fjern
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          {!adding ? (
            <Button variant="secondary" onClick={() => setAdding(true)}>
              Tilføj en printer mere
            </Button>
          ) : null}
        </>
      )}

      {adding ? (
        <div className="rounded-xl border border-line bg-surface p-5">
          <h3 className="mb-3 font-semibold">Vælg printer</h3>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {allModels.map((model) => {
              const saved = printers.some((printer) => printer.modelId === model.id);
              return (
                <li key={model.id}>
                  <button
                    type="button"
                    disabled={saved}
                    onClick={() => {
                      savePrinter({
                        modelId: model.id,
                        displayName: model.displayName,
                        handle: model.handle,
                        savedAt: new Date().toISOString(),
                      });
                      setAdding(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                      saved
                        ? "cursor-not-allowed border-line bg-surface-muted text-ink-faint"
                        : "border-line hover:bg-surface-muted"
                    )}
                  >
                    <span>
                      <span className="block font-medium">{model.displayName}</span>
                      <span className="mt-0.5 block text-xs text-ink-faint">
                        {model.enclosed ? "Lukket" : "Åben"}
                        {model.supportsAms ? " · AMS" : ""}
                        {model.hardenedNozzleStock ? " · hærdet dyse" : ""}
                      </span>
                    </span>
                    {saved ? <CheckIcon className="size-4 shrink-0" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <Button variant="ghost" className="mt-4" onClick={() => setAdding(false)}>
            Annuller
          </Button>
        </div>
      ) : null}
    </div>
  );
}
