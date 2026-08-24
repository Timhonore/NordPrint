import type { Money, StockStatus } from "./catalog";

export interface CartLine {
  readonly id: string;
  readonly productId: string;
  readonly productHandle: string;
  readonly variantId: string;
  readonly title: string;
  readonly variantTitle: string | null;
  readonly colorName: string | null;
  readonly colorHex: string | null;
  readonly sku: string | null;
  readonly thumbnail: string | null;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly originalUnitPrice: Money | null;
  readonly total: Money;
  readonly stock: StockStatus;
  readonly maxQuantity: number | null;
}

export interface FreeShippingProgress {
  readonly enabled: boolean;
  readonly threshold: Money;
  readonly remaining: Money;
  readonly qualified: boolean;
  /** 0…1, for the progress bar. */
  readonly ratio: number;
}

export interface CartSummary {
  readonly id: string;
  readonly lines: readonly CartLine[];
  readonly itemCount: number;
  readonly subtotal: Money;
  readonly discountTotal: Money;
  readonly shippingTotal: Money | null;
  readonly taxTotal: Money;
  readonly total: Money;
  readonly currencyCode: string;
  readonly freeShipping: FreeShippingProgress;
  readonly promotionCodes: readonly string[];
  readonly totalWeightG: number;
}
