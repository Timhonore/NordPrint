import type { CartLine, FreeShippingProgress, Money } from "@nordprint/types";
import type { ShippingRules } from "@nordprint/config";
import { commerceConfig } from "@nordprint/config";
import { money, subtractMoney, zero } from "./money";

/**
 * Free-shipping nudge: "Du mangler 151 kr for fri fragt".
 *
 * The threshold is configuration, never a literal — see
 * `NORDPRINT_FREE_SHIPPING_THRESHOLD`.
 */
export function calculateFreeShippingProgress(
  subtotal: Money,
  rules: ShippingRules = commerceConfig.shipping
): FreeShippingProgress {
  const threshold = money(rules.freeShippingThreshold, subtotal.currencyCode);

  if (!rules.showFreeShippingProgress || threshold.amount <= 0) {
    return {
      enabled: false,
      threshold,
      remaining: zero(subtotal.currencyCode),
      qualified: true,
      ratio: 1,
    };
  }

  const qualified = subtotal.amount >= threshold.amount;
  const remaining = qualified
    ? zero(subtotal.currencyCode)
    : subtractMoney(threshold, subtotal);

  return {
    enabled: true,
    threshold,
    remaining,
    qualified,
    ratio: qualified ? 1 : Math.max(0, Math.min(1, subtotal.amount / threshold.amount)),
  };
}

export function calculateLineTotal(unitPrice: Money, quantity: number): Money {
  return money(unitPrice.amount * Math.max(0, Math.round(quantity)), unitPrice.currencyCode);
}

export function calculateSubtotal(lines: readonly CartLine[], currencyCode: string): Money {
  return money(
    lines.reduce((sum, line) => sum + line.total.amount, 0),
    currencyCode
  );
}

export function calculateItemCount(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

/** Total shipping weight — used by the carrier quote endpoints. */
export function calculateCartWeightG(
  lines: readonly { quantity: number; weightG?: number | null }[]
): number {
  return lines.reduce((sum, line) => sum + (line.weightG ?? 0) * line.quantity, 0);
}
