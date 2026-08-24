"use client";

import * as React from "react";
import { VisuallyHidden, cn } from "@nordprint/ui";

/**
 * Quantity stepper.
 *
 * Buttons rather than a bare number input: on a phone, a number field opens a
 * keyboard for a change that is almost always ±1. The input is still there
 * and still editable for anyone who wants to type 12.
 */
export function QuantityStepper({
  value,
  onChange,
  label,
  min = 1,
  max = 99,
  disabled = false,
  className,
}: {
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly label: string;
  readonly min?: number;
  readonly max?: number;
  readonly disabled?: boolean;
  readonly className?: string;
}): React.JSX.Element {
  const [draft, setDraft] = React.useState(String(value));
  const [lastValue, setLastValue] = React.useState(value);

  // Adjusting state during render is React's documented way to sync a prop
  // into local state — an effect would render the stale quantity first.
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(String(value));
  }

  const commit = (next: number): void => {
    const clamped = Math.max(min, Math.min(max, Math.round(next)));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <div
      className={cn(
        "inline-flex h-9 items-center rounded-lg border border-line",
        disabled && "opacity-50",
        className
      )}
    >
      <button
        type="button"
        disabled={disabled || value <= min}
        onClick={() => commit(value - 1)}
        className="grid h-full w-9 place-items-center rounded-l-lg text-lg leading-none text-ink-soft transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden="true">−</span>
        <VisuallyHidden>Færre</VisuallyHidden>
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label={label}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
        onBlur={() => commit(Number(draft) || min)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(Number(draft) || min);
          }
        }}
        className="h-full w-9 border-x border-line bg-transparent text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent"
      />

      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => commit(value + 1)}
        className="grid h-full w-9 place-items-center rounded-r-lg text-lg leading-none text-ink-soft transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        <span aria-hidden="true">+</span>
        <VisuallyHidden>Flere</VisuallyHidden>
      </button>
    </div>
  );
}
