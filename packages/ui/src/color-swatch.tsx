"use client";

import * as React from "react";
import type { ColorSwatch as ColorSwatchData, StockStatus } from "@nordprint/types";
import { STOCK_LABELS, isLightColor } from "@nordprint/commerce";
import { cn } from "./cn";
import { VisuallyHidden } from "./primitives";

/**
 * The colour picker.
 *
 * This is the single most important control on a filament product page, and a
 * `<select>` is the wrong answer: customers pick filament by looking at it.
 *
 * How it behaves:
 *  - Real swatches, big enough to tap with one thumb (44 px target).
 *  - Sold-out colours stay visible and are struck through with a diagonal
 *    line — the customer needs to know the colour exists before choosing
 *    another. Hiding it makes the range look smaller than it is.
 *  - Colour is never the only signal: every swatch has an accessible name and
 *    stock status, and the selected one carries a check mark, not just a ring.
 *  - Near-white swatches get a darker border so they do not vanish.
 *
 * Keyboard model: a radiogroup, so arrow keys move between colours and the
 * whole group is a single tab stop.
 */
export interface ColorSwatchPickerProps {
  readonly swatches: readonly ColorSwatchData[];
  readonly selectedVariantId: string | null;
  readonly onSelect: (variantId: string) => void;
  readonly label?: string;
  readonly className?: string;
}

export function ColorSwatchPicker({
  swatches,
  selectedVariantId,
  onSelect,
  label = "Farve",
  className,
}: ColorSwatchPickerProps): React.JSX.Element {
  const selected = swatches.find((swatch) => swatch.variantId === selectedVariantId);
  const refs = React.useRef<Map<string, HTMLButtonElement>>(new Map());

  const move = (direction: 1 | -1): void => {
    const index = swatches.findIndex((swatch) => swatch.variantId === selectedVariantId);
    if (index === -1) return;
    const next = swatches[(index + direction + swatches.length) % swatches.length];
    if (!next) return;
    onSelect(next.variantId);
    refs.current.get(next.variantId)?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-ink" id="color-picker-label">
          {label}
        </span>
        {selected ? (
          <span className="text-sm text-ink-soft">
            {selected.name}
            {selected.stock === "out_of_stock" ? " — udsolgt" : ""}
          </span>
        ) : null}
      </div>

      <div
        role="radiogroup"
        aria-labelledby="color-picker-label"
        className="flex flex-wrap gap-2.5"
        onKeyDown={onKeyDown}
      >
        {swatches.map((swatch) => (
          <Swatch
            key={swatch.variantId}
            swatch={swatch}
            selected={swatch.variantId === selectedVariantId}
            onSelect={onSelect}
            registerRef={(element) => {
              if (element) refs.current.set(swatch.variantId, element);
              else refs.current.delete(swatch.variantId);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function Swatch({
  swatch,
  selected,
  onSelect,
  registerRef,
}: {
  swatch: ColorSwatchData;
  selected: boolean;
  onSelect: (variantId: string) => void;
  registerRef: (element: HTMLButtonElement | null) => void;
}): React.JSX.Element {
  const soldOut = swatch.stock === "out_of_stock";
  const hex = swatch.hex ?? "#d0d5da";
  const light = isLightColor(hex);
  const stockLabel = STOCK_LABELS[swatch.stock as StockStatus].short;

  const background = swatch.hexSecondary
    ? `linear-gradient(135deg, ${hex} 0%, ${hex} 48%, ${swatch.hexSecondary} 52%, ${swatch.hexSecondary} 100%)`
    : hex;

  return (
    <button
      ref={registerRef}
      type="button"
      role="radio"
      aria-checked={selected}
      // Only the selected swatch is in the tab order; arrows move within.
      tabIndex={selected ? 0 : -1}
      onClick={() => onSelect(swatch.variantId)}
      title={`${swatch.name} — ${stockLabel}`}
      className={cn(
        "group relative grid size-11 place-items-center rounded-full transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        "focus-visible:ring-offset-surface",
        selected ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : "hover:scale-105"
      )}
    >
      <span
        aria-hidden="true"
        style={{ background }}
        className={cn(
          "size-9 rounded-full",
          // A light swatch on a light page needs its own outline.
          light ? "ring-1 ring-inset ring-ink/20" : "ring-1 ring-inset ring-black/10",
          soldOut && "opacity-45"
        )}
      />

      {soldOut ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid place-items-center"
        >
          <span className="h-px w-9 rotate-45 bg-ink/60" />
        </span>
      ) : null}

      {selected && !soldOut ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={cn(
            "pointer-events-none absolute size-4",
            light ? "text-ink" : "text-white"
          )}
        >
          <path
            d="M5 10.5l3.2 3.2L15 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}

      <VisuallyHidden>
        {swatch.name}, {stockLabel}
      </VisuallyHidden>
    </button>
  );
}

/**
 * Compact, non-interactive swatch row for product cards.
 * Shows at most `max` colours and a "+N" affordance for the rest.
 */
export function ColorSwatchRow({
  swatches,
  max = 6,
  className,
}: {
  readonly swatches: readonly ColorSwatchData[];
  readonly max?: number;
  readonly className?: string;
}): React.JSX.Element | null {
  if (swatches.length === 0) return null;

  const shown = swatches.slice(0, max);
  const rest = swatches.length - shown.length;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {shown.map((swatch) => (
        <span
          key={swatch.variantId}
          title={swatch.name}
          style={{
            background: swatch.hexSecondary
              ? `linear-gradient(135deg, ${swatch.hex ?? "#d0d5da"} 50%, ${swatch.hexSecondary} 50%)`
              : (swatch.hex ?? "#d0d5da"),
          }}
          className={cn(
            "size-4 rounded-full ring-1 ring-inset",
            swatch.hex && isLightColor(swatch.hex) ? "ring-ink/20" : "ring-black/10",
            swatch.stock === "out_of_stock" && "opacity-40"
          )}
        />
      ))}
      {rest > 0 ? <span className="text-xs text-ink-faint">+{rest}</span> : null}
      <VisuallyHidden>
        Findes i {swatches.length} farver: {swatches.map((swatch) => swatch.name).join(", ")}
      </VisuallyHidden>
    </div>
  );
}
