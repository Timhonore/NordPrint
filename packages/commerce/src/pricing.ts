import type { Money } from "@nordprint/types";
import { money } from "./money";

const GRAMS_PER_KILOGRAM = 1000;

/**
 * Price per kilogram of *net filament* — the number customers actually compare
 * across brands. Spool weight is never included: a 1 kg spool of PLA and a
 * 750 g spool must be comparable.
 *
 * Returns `null` when the weight is missing or non-positive rather than
 * guessing, so the UI can simply omit the line instead of printing nonsense.
 */
export function calculatePricePerKg(
  price: Money,
  netWeightG: number | null | undefined
): Money | null {
  if (netWeightG === null || netWeightG === undefined) return null;
  if (!Number.isFinite(netWeightG) || netWeightG <= 0) return null;
  const perKg = (price.amount * GRAMS_PER_KILOGRAM) / netWeightG;
  return money(perKg, price.currencyCode);
}

/**
 * Discount percentage relative to the compare-at (før-) price.
 * Returns `null` when there is no genuine reduction — a "0 %" badge is worse
 * than no badge, and an inflated før-pris is a marketing law problem.
 */
export function calculateDiscountPercent(
  price: Money,
  compareAtPrice: Money | null | undefined
): number | null {
  if (!compareAtPrice) return null;
  if (compareAtPrice.currencyCode !== price.currencyCode) return null;
  if (compareAtPrice.amount <= price.amount) return null;
  if (compareAtPrice.amount <= 0) return null;
  const ratio = (compareAtPrice.amount - price.amount) / compareAtPrice.amount;
  return Math.round(ratio * 100);
}

export interface MarginBreakdown {
  /** Salgspris */
  readonly salePrice: Money;
  /** Indkøbspris */
  readonly costPrice: Money;
  /** Dækningsbidrag = salgspris − indkøbspris */
  readonly contribution: Money;
  /** Margin % = DB / salgspris, rounded to whole percent. */
  readonly marginPercent: number;
  /** Avance (markup) % = DB / indkøbspris. */
  readonly markupPercent: number | null;
}

/**
 * Internal margin maths. Cost price is *never* exposed on the storefront —
 * this function is only reachable from authenticated admin routes.
 */
export function calculateMargin(salePrice: Money, costPrice: Money): MarginBreakdown {
  if (salePrice.currencyCode !== costPrice.currencyCode) {
    throw new Error("Salgspris og indkøbspris skal være i samme valuta");
  }
  const contributionAmount = salePrice.amount - costPrice.amount;
  const marginPercent =
    salePrice.amount > 0 ? Math.round((contributionAmount / salePrice.amount) * 100) : 0;
  const markupPercent =
    costPrice.amount > 0 ? Math.round((contributionAmount / costPrice.amount) * 100) : null;

  return {
    salePrice,
    costPrice,
    contribution: money(contributionAmount, salePrice.currencyCode),
    marginPercent,
    markupPercent,
  };
}

export interface VatBreakdown {
  readonly gross: Money;
  readonly net: Money;
  readonly vat: Money;
  readonly rate: number;
}

/** Splits a VAT-inclusive amount into net and VAT parts. */
export function splitVatInclusive(gross: Money, rate: number): VatBreakdown {
  const netAmount = Math.round(gross.amount / (1 + rate));
  return {
    gross,
    net: money(netAmount, gross.currencyCode),
    vat: money(gross.amount - netAmount, gross.currencyCode),
    rate,
  };
}

/** "189 kr/kg" — the canonical price-per-kg label. */
export function formatPricePerKg(
  price: Money,
  netWeightG: number | null | undefined,
  format: (value: Money) => string
): string | null {
  const perKg = calculatePricePerKg(price, netWeightG);
  if (!perKg) return null;
  return `${format(perKg)}/kg`;
}

/** Weight in grams rendered the Danish way: 1000 → "1 kg", 750 → "750 g". */
export function formatSpoolWeight(grams: number | null | undefined): string | null {
  if (grams === null || grams === undefined || !Number.isFinite(grams) || grams <= 0) return null;
  if (grams % GRAMS_PER_KILOGRAM === 0) return `${grams / GRAMS_PER_KILOGRAM} kg`;
  if (grams > GRAMS_PER_KILOGRAM) {
    const kilos = Math.round((grams / GRAMS_PER_KILOGRAM) * 100) / 100;
    return `${String(kilos).replace(".", ",")} kg`;
  }
  return `${grams} g`;
}
