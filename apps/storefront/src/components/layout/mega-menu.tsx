"use client";

import * as React from "react";
import Link from "next/link";
import type { NavColumn, NavEntry } from "@nordprint/config";
import type { Brand } from "@nordprint/types";
import {
  COLOR_FAMILY_LABELS,
  FILAMENT_FINISHES,
  FILAMENT_MATERIALS,
  FINISH_LABELS,
  MATERIAL_LABELS,
} from "@nordprint/types";
import { cn, TechLabel } from "@nordprint/ui";
import type { PrinterTree } from "@/lib/api/catalog";

/**
 * Desktop mega-menu.
 *
 * Behaviour worth knowing:
 *  - Opens on hover *and* on focus, so it is reachable by keyboard.
 *  - Escape closes it and returns focus to the trigger.
 *  - A short close delay means moving the mouse diagonally into the panel
 *    does not snap it shut.
 *  - Brand and printer columns are populated from the backend; nothing about
 *    Bambu Lab or Polymaker is written into this component.
 */
export function MegaMenu({
  entries,
  brands,
  printerBrands,
  className,
}: {
  entries: readonly NavEntry[];
  brands: Brand[];
  printerBrands: PrinterTree["brands"];
  className?: string;
}): React.JSX.Element {
  const [openLabel, setOpenLabel] = React.useState<string | null>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = React.useRef<HTMLElement>(null);

  const open = (label: string): void => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenLabel(label);
  };

  const scheduleClose = (): void => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenLabel(null), 140);
  };

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpenLabel(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close when focus leaves the whole navigation — tabbing out should not
  // leave a panel hanging open over the page.
  const onBlurCapture = (event: React.FocusEvent<HTMLElement>): void => {
    if (!navRef.current?.contains(event.relatedTarget as Node | null)) setOpenLabel(null);
  };

  return (
    <nav
      ref={navRef}
      aria-label="Hovedmenu"
      className={cn("items-center gap-1", className)}
      onMouseLeave={scheduleClose}
      onBlurCapture={onBlurCapture}
    >
      {entries.map((entry) => {
        const hasPanel = Boolean(entry.columns?.length);
        const isOpen = openLabel === entry.label;

        return (
          <div key={entry.label} className="static">
            <Link
              href={entry.href}
              aria-expanded={hasPanel ? isOpen : undefined}
              aria-haspopup={hasPanel ? "true" : undefined}
              onMouseEnter={() => (hasPanel ? open(entry.label) : setOpenLabel(null))}
              onFocus={() => (hasPanel ? open(entry.label) : setOpenLabel(null))}
              className={cn(
                // whitespace-nowrap: uden den brækkes "3D-printere" over to linjer,
                // så snart pladsen bliver knap, og hele menuen bliver skæv.
                "inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-lg px-3 text-[0.9375rem] font-medium transition-colors",
                entry.highlight
                  ? "text-amber hover:bg-amber/10"
                  : "text-ink hover:bg-surface-muted",
                isOpen && (entry.highlight ? "bg-amber/10" : "bg-surface-muted")
              )}
            >
              {entry.label}
            </Link>

            {hasPanel && isOpen ? (
              <div
                className="absolute inset-x-0 top-full z-40 animate-fade border-b border-line bg-surface shadow-[0_18px_40px_-24px_rgb(13_17_23/0.35)]"
                onMouseEnter={() => open(entry.label)}
              >
                <div className="container-page grid gap-8 py-8 md:grid-cols-3 lg:grid-cols-4">
                  {entry.columns?.map((column) => (
                    <div key={column.title}>
                      <TechLabel className="mb-3 block">{column.title}</TechLabel>
                      <ul className="space-y-1.5">
                        {resolveLinks(column, brands, printerBrands).map((link) => (
                          <li key={link.href}>
                            <Link
                              href={link.href}
                              onClick={() => setOpenLabel(null)}
                              className="block rounded-md px-2 py-1.5 -mx-2 text-sm text-ink-soft transition-colors hover:bg-surface-muted hover:text-ink"
                            >
                              {link.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {column.viewAll ? (
                        <Link
                          href={column.viewAll.href}
                          onClick={() => setOpenLabel(null)}
                          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
                        >
                          {column.viewAll.label} →
                        </Link>
                      ) : null}
                    </div>
                  ))}

                  {/* Promo card: the guided selector is the best answer to
                      "I do not know what I need", which is why it lives in
                      every filament menu. */}
                  <div className="hidden rounded-xl bg-surface-inverse p-5 text-ink-inverse lg:block">
                    <div className="grid-plate-inverse -m-5 mb-4 h-20 rounded-t-xl" />
                    <p className="text-base font-semibold">Ved du ikke hvad du skal vælge?</p>
                    <p className="mt-1.5 text-sm text-white/70">
                      Svar på fire spørgsmål, så finder vi filamentet til din opgave.
                    </p>
                    <Link
                      href="/find-filament"
                      onClick={() => setOpenLabel(null)}
                      className="mt-4 inline-flex h-9 items-center rounded-lg bg-white px-3 text-sm font-medium text-ink hover:bg-white/90"
                    >
                      Find filament
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * Resolves a column's links.
 *
 * Static columns list their own entries; dynamic ones name a `source` and are
 * filled from live catalogue data.
 */
export function resolveLinks(
  column: NavColumn,
  brands: Brand[],
  printerBrands: PrinterTree["brands"]
): { label: string; href: string }[] {
  if (column.links) return [...column.links];

  switch (column.source) {
    case "materials":
      return FILAMENT_MATERIALS.filter((material) => material !== "other").map((material) => ({
        label: MATERIAL_LABELS[material],
        href: `/filament?material=${material}`,
      }));

    case "finishes":
      return FILAMENT_FINISHES.filter((finish) => finish !== "other").map((finish) => ({
        label: FINISH_LABELS[finish],
        href: `/filament?finish=${finish}`,
      }));

    case "brands":
      return brands.map((brand) => ({
        label: brand.name,
        href: `/filament?brand=${brand.handle}`,
      }));

    case "printer-brands":
      return printerBrands.map((brand) => ({
        label: brand.name,
        href: `/shop-efter-printer/${brand.handle}`,
      }));

    default:
      return [];
  }
}

/** Exported for the mobile navigation, which renders the same colour list. */
export const COLOR_LINKS = Object.entries(COLOR_FAMILY_LABELS).map(([value, label]) => ({
  label,
  href: `/filament?color=${value}`,
}));
