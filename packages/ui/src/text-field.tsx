"use client";

import * as React from "react";
import { cn } from "./cn";

/**
 * A labelled text input.
 *
 * The accessibility details — a real `<label htmlFor>`, `aria-invalid`, and
 * `aria-describedby` wired to both the hint and the error — are easy to get
 * subtly wrong, so they live here once rather than in every form.
 *
 * Errors are never signalled by the red border alone: there is always a text
 * message, and it is associated with the field.
 */
export function TextField({
  name,
  label,
  type = "text",
  error,
  hint,
  className,
  ...props
}: {
  name: string;
  label: string;
  type?: string;
  error?: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  const id = props.id ?? `felt-${name}`;
  const describedBy = [error ? `${id}-fejl` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        {...props}
        id={id}
        name={name}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={cn(
          "mt-1.5 h-11 w-full rounded-lg border bg-surface px-3 text-sm placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30",
          error ? "border-negative" : "border-line focus:border-accent"
        )}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-fejl`} className="mt-1 text-xs text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}
