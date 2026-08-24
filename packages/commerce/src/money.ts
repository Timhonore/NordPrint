import type { Money } from "@nordprint/types";

/**
 * All money in NordPrint is stored and passed around as **minor units** (øre)
 * plus a currency code. Floating point kroner never enter the system — every
 * conversion goes through this module.
 */

export const DKK = "DKK";

export function money(amount: number, currencyCode: string = DKK): Money {
  return { amount: Math.round(amount), currencyCode };
}

export function zero(currencyCode: string = DKK): Money {
  return { amount: 0, currencyCode };
}

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currencyCode !== b.currencyCode) {
    throw new Error(`Kan ikke regne på ${a.currencyCode} og ${b.currencyCode} sammen`);
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currencyCode);
}

export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currencyCode);
}

export function multiplyMoney(a: Money, factor: number): Money {
  return money(a.amount * factor, a.currencyCode);
}

export const isPositive = (value: Money): boolean => value.amount > 0;

/** Minor units → major units, for display only. */
export const toMajorUnits = (value: Money): number => value.amount / 100;

/** Major units → minor units, e.g. when parsing admin input. */
export const toMinorUnits = (major: number): number => Math.round(major * 100);

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(currencyCode: string, fractionDigits: number): Intl.NumberFormat {
  const key = `${currencyCode}:${fractionDigits}`;
  const cached = formatterCache.get(key);
  if (cached) return cached;
  // Danish convention: "189 kr", thousands separated by a dot, decimal comma.
  const created = new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  formatterCache.set(key, created);
  return created;
}

export interface FormatMoneyOptions {
  /** Always show ",00" even for whole kroner. Default: only when needed. */
  readonly forceDecimals?: boolean;
  /** Append a suffix such as "/kg". */
  readonly suffix?: string;
}

/**
 * Formats minor units as Danish currency.
 *
 * `189_00` → `"189 kr"`, `189_50` → `"189,50 kr"`.
 */
export function formatMoney(value: Money, options: FormatMoneyOptions = {}): string {
  const hasFraction = value.amount % 100 !== 0;
  const digits = options.forceDecimals === true || hasFraction ? 2 : 0;
  const formatted = getFormatter(value.currencyCode, digits)
    .format(toMajorUnits(value))
    // Intl renders DKK as "189\u00a0kr." — a no-break space plus a trailing
    // abbreviation dot. NordPrint's house style is "189 kr", so the whitespace
    // and the dot are normalised here, once, for the whole shop.
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/\skr\.$/, " kr")
    .trim();
  return options.suffix ? `${formatted}${options.suffix}` : formatted;
}

/** Convenience wrapper for the common DKK case. */
export const formatDkk = (amount: number, options?: FormatMoneyOptions): string =>
  formatMoney(money(amount), options);
