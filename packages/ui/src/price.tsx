import * as React from "react";
import type { Money, StockStatus } from "@nordprint/types";
import { STOCK_LABELS, calculateDiscountPercent, formatMoney } from "@nordprint/commerce";
import { cn } from "./cn";
import { Badge, VisuallyHidden } from "./primitives";

/**
 * Price display.
 *
 * All formatting goes through `formatMoney` from `@nordprint/commerce`, so the
 * shop, the admin and the order confirmation e-mail can never disagree about
 * what "189 kr" looks like.
 */
export interface PriceProps {
  readonly price: Money | null;
  readonly compareAtPrice?: Money | null;
  readonly pricePerKg?: Money | null;
  /** "Fra 189 kr" when a product's variants differ in price. */
  readonly from?: boolean;
  readonly size?: "sm" | "md" | "lg";
  readonly className?: string;
}

const SIZES = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
} as const;

export function Price({
  price,
  compareAtPrice,
  pricePerKg,
  from = false,
  size = "md",
  className,
}: PriceProps): React.JSX.Element {
  if (!price) {
    return <span className={cn("text-sm text-ink-faint", className)}>Pris på forespørgsel</span>;
  }

  const discount = calculateDiscountPercent(price, compareAtPrice);

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2.5 gap-y-1", className)}>
      <span
        className={cn(
          "font-semibold tabular-nums",
          SIZES[size],
          discount !== null ? "text-negative" : "text-ink"
        )}
      >
        {from ? <span className="mr-1 text-sm font-normal text-ink-soft">Fra</span> : null}
        {formatMoney(price)}
      </span>

      {discount !== null && compareAtPrice ? (
        <>
          <span className="text-sm text-ink-faint line-through tabular-nums">
            {formatMoney(compareAtPrice)}
          </span>
          <Badge tone="offer">−{discount} %</Badge>
          <VisuallyHidden>
            Nedsat fra {formatMoney(compareAtPrice)} til {formatMoney(price)}
          </VisuallyHidden>
        </>
      ) : null}

      {pricePerKg ? (
        <span className="w-full text-sm text-ink-soft tabular-nums">
          {/* One string, so the DOM text reads "189 kr/kg" and can be copied. */}
          {`${formatMoney(pricePerKg)}/kg`}
        </span>
      ) : null}
    </div>
  );
}

/**
 * Stock indicator.
 *
 * Colour is never the only signal — the text carries the meaning, and a dot
 * shape reinforces it for anyone who cannot distinguish the hues.
 */
export function StockIndicator({
  status,
  quantity,
  expectedRestockAt,
  className,
}: {
  readonly status: StockStatus;
  readonly quantity?: number | null;
  readonly expectedRestockAt?: string | null;
  readonly className?: string;
}): React.JSX.Element {
  const label = STOCK_LABELS[status];

  const tone = {
    positive: "text-positive",
    caution: "text-caution",
    negative: "text-negative",
    neutral: "text-ink-soft",
  }[label.tone];

  const dot = {
    positive: "bg-positive",
    caution: "bg-caution",
    negative: "bg-negative",
    neutral: "bg-ink-faint",
  }[label.tone];

  return (
    <span className={cn("inline-flex items-center gap-2 text-sm font-medium", tone, className)}>
      <span aria-hidden="true" className={cn("size-2 rounded-full", dot)} />
      <span>
        {label.label}
        {status === "low_stock" && typeof quantity === "number" && quantity > 0
          ? ` (${quantity} stk.)`
          : ""}
      </span>
      {status === "out_of_stock" && expectedRestockAt ? (
        <span className="font-normal text-ink-soft">
          · forventes {formatRestockDate(expectedRestockAt)}
        </span>
      ) : null}
    </span>
  );
}

function formatRestockDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "snart";
  return new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long" }).format(date);
}
