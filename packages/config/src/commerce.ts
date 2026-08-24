import { readBoolean, readList, readNumber, readString } from "./env";

/**
 * Commerce rules. Nothing here may be duplicated as a literal anywhere else in
 * the codebase — storefront and backend both read from this module so a single
 * environment variable changes the behaviour of the whole shop.
 */

export interface StockThresholds {
  /** Strictly greater than this ⇒ "På lager". */
  readonly inStockAbove: number;
  /** 1 … inStockAbove ⇒ "Kun få tilbage". */
  readonly lowStockAtOrBelow: number;
  /** Allow the stocked quantity to go below zero. */
  readonly allowBackorder: boolean;
}

export interface ShippingRules {
  /** Free shipping from this amount (minor units, i.e. øre). */
  readonly freeShippingThreshold: number;
  /** Default flat rate used by the development shipping provider (øre). */
  readonly defaultRate: number;
  /** Show the "du mangler X for fri fragt" nudge. */
  readonly showFreeShippingProgress: boolean;
}

export interface CommerceConfig {
  readonly currency: "DKK";
  readonly currencySymbol: "kr";
  readonly locale: "da-DK";
  readonly vatRate: number;
  readonly pricesIncludeVat: boolean;
  readonly stock: StockThresholds;
  readonly shipping: ShippingRules;
  readonly countries: readonly string[];
  readonly defaultCountry: string;
  readonly maxCompareItems: number;
  readonly productsPerPage: number;
}

export function loadCommerceConfig(): CommerceConfig {
  return {
    currency: "DKK",
    currencySymbol: "kr",
    locale: "da-DK",
    vatRate: readNumber("NORDPRINT_VAT_RATE", 0.25),
    pricesIncludeVat: readBoolean("NORDPRINT_PRICES_INCLUDE_VAT", true),
    stock: {
      inStockAbove: readNumber("NORDPRINT_STOCK_IN_STOCK_ABOVE", 5),
      lowStockAtOrBelow: readNumber("NORDPRINT_STOCK_LOW_AT_OR_BELOW", 5),
      allowBackorder: readBoolean("NORDPRINT_ALLOW_BACKORDER", false),
    },
    shipping: {
      freeShippingThreshold: readNumber("NORDPRINT_FREE_SHIPPING_THRESHOLD", 49900),
      defaultRate: readNumber("NORDPRINT_DEFAULT_SHIPPING_RATE", 4900),
      showFreeShippingProgress: readBoolean("NORDPRINT_SHOW_FREE_SHIPPING_PROGRESS", true),
    },
    countries: readList("NORDPRINT_COUNTRIES", ["dk"]),
    defaultCountry: readString("NORDPRINT_DEFAULT_COUNTRY", "dk"),
    maxCompareItems: readNumber("NORDPRINT_MAX_COMPARE_ITEMS", 4),
    productsPerPage: readNumber("NORDPRINT_PRODUCTS_PER_PAGE", 24),
  };
}

/** Eagerly resolved singleton for call sites that do not need lazy reads. */
export const commerceConfig: CommerceConfig = loadCommerceConfig();
