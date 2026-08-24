import type { StockInfo, StockStatus } from "@nordprint/types";
import type { StockThresholds } from "@nordprint/config";
import { commerceConfig } from "@nordprint/config";

export interface StockLabel {
  readonly status: StockStatus;
  readonly label: string;
  /** Short form for cards and swatch tooltips. */
  readonly short: string;
  /** Semantic tone. Colour is never the only signal — the label carries it. */
  readonly tone: "positive" | "caution" | "negative" | "neutral";
}

export const STOCK_LABELS: Record<StockStatus, StockLabel> = {
  in_stock: { status: "in_stock", label: "På lager", short: "På lager", tone: "positive" },
  low_stock: {
    status: "low_stock",
    label: "Kun få tilbage",
    short: "Få tilbage",
    tone: "caution",
  },
  out_of_stock: { status: "out_of_stock", label: "Udsolgt", short: "Udsolgt", tone: "negative" },
  backorder: {
    status: "backorder",
    label: "Kan bestilles — sendes når varen er hjemme",
    short: "I restordre",
    tone: "neutral",
  },
};

/**
 * Resolves a stock quantity to a customer-facing status using the configured
 * thresholds. Thresholds live in `@nordprint/config` so a single env var moves
 * the "kun få tilbage" line across the whole shop.
 */
export function resolveStockStatus(
  quantity: number | null | undefined,
  options: {
    manageInventory?: boolean;
    allowBackorder?: boolean;
    thresholds?: StockThresholds;
  } = {}
): StockStatus {
  const thresholds = options.thresholds ?? commerceConfig.stock;
  const manageInventory = options.manageInventory ?? true;
  const allowBackorder = options.allowBackorder ?? thresholds.allowBackorder;

  // Un-managed inventory (digital goods, made to order) is always sellable.
  if (!manageInventory) return "in_stock";

  const qty = typeof quantity === "number" && Number.isFinite(quantity) ? quantity : 0;

  if (qty <= 0) return allowBackorder ? "backorder" : "out_of_stock";
  if (qty <= thresholds.lowStockAtOrBelow) return "low_stock";
  return "in_stock";
}

export function buildStockInfo(
  quantity: number | null | undefined,
  options: {
    manageInventory?: boolean;
    allowBackorder?: boolean;
    expectedRestockAt?: string | null;
    thresholds?: StockThresholds;
  } = {}
): StockInfo {
  const thresholds = options.thresholds ?? commerceConfig.stock;
  const manageInventory = options.manageInventory ?? true;
  const allowBackorder = options.allowBackorder ?? thresholds.allowBackorder;
  return {
    status: resolveStockStatus(quantity, options),
    // Negative stock is a data error, not a quantity to show a customer.
    quantity: typeof quantity === "number" ? Math.max(0, quantity) : null,
    manageInventory,
    allowBackorder,
    expectedRestockAt: options.expectedRestockAt ?? null,
  };
}

export const isPurchasable = (status: StockStatus): boolean =>
  status === "in_stock" || status === "low_stock" || status === "backorder";

/**
 * Aggregates variant statuses into a single product-level status: a product is
 * "på lager" if anything at all can be bought.
 */
export function aggregateStockStatus(statuses: readonly StockStatus[]): StockStatus {
  if (statuses.length === 0) return "out_of_stock";
  if (statuses.includes("in_stock")) return "in_stock";
  if (statuses.includes("low_stock")) return "low_stock";
  if (statuses.includes("backorder")) return "backorder";
  return "out_of_stock";
}

/**
 * Guards against writing negative inventory unless backorders are explicitly
 * enabled. Returns the quantity that should actually be persisted.
 */
export function clampInventoryQuantity(
  quantity: number,
  allowBackorder: boolean = commerceConfig.stock.allowBackorder
): number {
  if (allowBackorder) return Math.round(quantity);
  return Math.max(0, Math.round(quantity));
}
