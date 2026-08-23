import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

/* -------------------------------------------------------------------------
 * Badge
 * ---------------------------------------------------------------------- */

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none",
  {
    variants: {
      tone: {
        neutral: "bg-surface-muted text-ink-soft",
        positive: "bg-positive/10 text-positive",
        caution: "bg-caution/12 text-caution",
        negative: "bg-negative/10 text-negative",
        accent: "bg-accent/10 text-accent",
        offer: "bg-amber text-white",
        outline: "border border-line text-ink-soft",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps): React.JSX.Element {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

/* -------------------------------------------------------------------------
 * Technical label — the small monospace caps used throughout the design,
 * borrowed from CAD drawings and slicer panels.
 * ---------------------------------------------------------------------- */

export function TechLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>): React.JSX.Element {
  return (
    <span
      className={cn(
        "font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint",
        className
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------
 * Card
 * ---------------------------------------------------------------------- */

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      className={cn("rounded-xl border border-line bg-surface", className)}
      {...props}
    />
  );
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return <div className={cn("p-5", className)} {...props} />;
}

/* -------------------------------------------------------------------------
 * Skeleton
 * ---------------------------------------------------------------------- */

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-surface-muted", className)}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------
 * Visually hidden — content for screen readers only. Used constantly for
 * icon-only controls and for the live regions announcing cart changes.
 * ---------------------------------------------------------------------- */

export function VisuallyHidden({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>): React.JSX.Element {
  return <span className={cn("sr-only", className)} {...props} />;
}

/* -------------------------------------------------------------------------
 * Rating dots — "Printvenlighed ●●●●●"
 * ---------------------------------------------------------------------- */

export interface RatingDotsProps {
  readonly value: number;
  readonly max?: number;
  readonly label: string;
  readonly className?: string;
}

/**
 * Five dots, three filled. The numeric value is always announced to screen
 * readers — the dots alone carry no accessible meaning.
 */
export function RatingDots({
  value,
  max = 5,
  label,
  className,
}: RatingDotsProps): React.JSX.Element {
  const clamped = Math.max(0, Math.min(max, Math.round(value)));

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="ml-auto flex items-center gap-1" aria-hidden="true">
        {Array.from({ length: max }, (_, index) => (
          <span
            key={index}
            className={cn(
              "size-2 rounded-full",
              index < clamped ? "bg-accent" : "bg-line"
            )}
          />
        ))}
      </span>
      <VisuallyHidden>
        {label}: {clamped} ud af {max}
      </VisuallyHidden>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Star rating
 * ---------------------------------------------------------------------- */

export function StarRating({
  value,
  count,
  className,
}: {
  readonly value: number | null;
  readonly count?: number;
  readonly className?: string;
}): React.JSX.Element | null {
  if (value === null) return null;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="inline-flex" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <svg key={index} viewBox="0 0 20 20" className="size-4" role="presentation">
            <path
              d="M10 1.6l2.47 5.01 5.53.8-4 3.9.94 5.5L10 14.2l-4.94 2.6.94-5.5-4-3.9 5.53-.8z"
              className={index < Math.round(value) ? "fill-amber" : "fill-line"}
            />
          </svg>
        ))}
      </span>
      <span className="text-sm text-ink-soft">
        {value.toFixed(1).replace(".", ",")}
        {count !== undefined && count > 0 ? ` (${count})` : ""}
      </span>
      <VisuallyHidden>
        Bedømt {value.toFixed(1).replace(".", ",")} ud af 5
        {count !== undefined && count > 0 ? ` af ${count} kunder` : ""}
      </VisuallyHidden>
    </span>
  );
}

/* -------------------------------------------------------------------------
 * Spec row — the label/value pairs on the product page
 * ---------------------------------------------------------------------- */

export function SpecRow({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: React.ReactNode;
  readonly hint?: string;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="text-sm text-ink-soft">
        {label}
        {hint ? <span className="ml-1 text-xs text-ink-faint">({hint})</span> : null}
      </dt>
      <dd className="text-right text-sm font-medium text-ink tabular-nums">{value}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------------
 * Empty state
 * ---------------------------------------------------------------------- */

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  readonly title: string;
  readonly description?: string;
  readonly action?: React.ReactNode;
  readonly icon?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line px-6 py-14 text-center">
      {icon ? <div className="mb-4 text-ink-faint">{icon}</div> : null}
      <p className="text-base font-semibold text-ink">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-md text-sm text-ink-soft">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
