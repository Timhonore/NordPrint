"use client";

import * as React from "react";
import Link from "next/link";
import type { Brand } from "@nordprint/types";
import { primaryNavigation } from "@nordprint/config";
import { Button, VisuallyHidden, buttonVariants, cn } from "@nordprint/ui";
import { resolveLinks } from "./mega-menu";
import { PrinterPill } from "@/components/printer/printer-pill";
import type { PrinterTree } from "@/lib/api/catalog";
import { MenuIcon, XIcon, ChevronDownIcon } from "@/components/icons";

/**
 * Mobile navigation.
 *
 * A full-height drawer with accordion sections rather than a squeezed
 * mega-menu. Focus is trapped while it is open, Escape closes it, and the
 * page behind it does not scroll.
 */
export function MobileNav({
  brands,
  printerBrands,
}: {
  brands: Brand[];
  printerBrands: PrinterTree["brands"];
}): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const close = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      // Focus trap: keep Tab inside the drawer while it is open.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // Move focus into the drawer so the next Tab lands somewhere sensible.
    panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-expanded={open}
        aria-controls="mobil-menu"
        onClick={() => setOpen(true)}
      >
        <MenuIcon />
        <VisuallyHidden>Åbn menu</VisuallyHidden>
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            type="button"
            aria-label="Luk menu"
            className="absolute inset-0 animate-fade bg-ink/40"
            onClick={close}
          />

          <div
            ref={panelRef}
            id="mobil-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 left-0 flex w-[min(22rem,88vw)] animate-slide-in flex-col bg-surface"
          >
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <span className="text-lg font-bold tracking-tight">
                NORD<span className="text-accent">PRINT</span>
              </span>
              <Button variant="ghost" size="icon" onClick={close}>
                <XIcon />
                <VisuallyHidden>Luk menu</VisuallyHidden>
              </Button>
            </div>

            <div className="border-b border-line px-4 py-3">
              <PrinterPill className="w-full justify-between" />
            </div>

            <nav aria-label="Mobilmenu" className="flex-1 overflow-y-auto overscroll-contain p-2">
              <ul className="space-y-0.5">
                {primaryNavigation.map((entry) => {
                  const columns = entry.columns ?? [];
                  const isExpanded = expanded === entry.label;

                  if (columns.length === 0) {
                    return (
                      <li key={entry.label}>
                        <Link
                          href={entry.href}
                          onClick={close}
                          className={cn(
                            "block rounded-lg px-3 py-3 text-base font-medium",
                            entry.highlight ? "text-amber" : "text-ink"
                          )}
                        >
                          {entry.label}
                        </Link>
                      </li>
                    );
                  }

                  return (
                    <li key={entry.label}>
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => setExpanded(isExpanded ? null : entry.label)}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-base font-medium text-ink"
                      >
                        {entry.label}
                        <ChevronDownIcon
                          className={cn(
                            "size-4 text-ink-faint transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </button>

                      {isExpanded ? (
                        <div className="space-y-4 px-3 pb-4 pt-1">
                          <Link
                            href={entry.href}
                            onClick={close}
                            className="block text-sm font-medium text-accent"
                          >
                            Se alt i {entry.label.toLowerCase()} →
                          </Link>
                          {columns.map((column) => {
                            const links = resolveLinks(column, brands, printerBrands);
                            if (links.length === 0) return null;
                            return (
                              <div key={column.title}>
                                <p className="mb-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
                                  {column.title}
                                </p>
                                <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                                  {links.map((link) => (
                                    <li key={link.href}>
                                      <Link
                                        href={link.href}
                                        onClick={close}
                                        className="block py-1.5 text-sm text-ink-soft"
                                      >
                                        {link.label}
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="border-t border-line p-4">
              <Link
                href="/find-filament"
                onClick={close}
                className={buttonVariants({ variant: "secondary", full: true })}
              >
                Find filament til min printer
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
