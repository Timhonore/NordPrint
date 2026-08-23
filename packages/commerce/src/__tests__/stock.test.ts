import { describe, expect, it } from "vitest";
import {
  aggregateStockStatus,
  buildStockInfo,
  clampInventoryQuantity,
  isPurchasable,
  resolveStockStatus,
} from "../stock";

const thresholds = { inStockAbove: 5, lowStockAtOrBelow: 5, allowBackorder: false };

describe("resolveStockStatus", () => {
  it("follows the configured thresholds", () => {
    // > 5 → på lager, 1-5 → kun få tilbage, 0 → udsolgt
    expect(resolveStockStatus(14, { thresholds })).toBe("in_stock");
    expect(resolveStockStatus(6, { thresholds })).toBe("in_stock");
    expect(resolveStockStatus(5, { thresholds })).toBe("low_stock");
    expect(resolveStockStatus(1, { thresholds })).toBe("low_stock");
    expect(resolveStockStatus(0, { thresholds })).toBe("out_of_stock");
  });

  it("treats negative stock as sold out, never as a quantity", () => {
    expect(resolveStockStatus(-3, { thresholds })).toBe("out_of_stock");
    expect(buildStockInfo(-3, { thresholds }).quantity).toBe(0);
  });

  it("reports backorder only when explicitly enabled", () => {
    expect(resolveStockStatus(0, { thresholds, allowBackorder: true })).toBe("backorder");
    expect(resolveStockStatus(0, { thresholds, allowBackorder: false })).toBe("out_of_stock");
  });

  it("treats unmanaged inventory as always available", () => {
    expect(resolveStockStatus(0, { manageInventory: false, thresholds })).toBe("in_stock");
  });

  it("honours a different threshold configuration", () => {
    const generous = { inStockAbove: 20, lowStockAtOrBelow: 20, allowBackorder: false };
    expect(resolveStockStatus(14, { thresholds: generous })).toBe("low_stock");
  });
});

describe("aggregateStockStatus", () => {
  it("reports the best status across variants", () => {
    expect(aggregateStockStatus(["out_of_stock", "low_stock", "in_stock"])).toBe("in_stock");
    expect(aggregateStockStatus(["out_of_stock", "low_stock"])).toBe("low_stock");
    expect(aggregateStockStatus(["out_of_stock"])).toBe("out_of_stock");
    expect(aggregateStockStatus([])).toBe("out_of_stock");
  });
});

describe("purchasability", () => {
  it("blocks only sold-out variants", () => {
    expect(isPurchasable("in_stock")).toBe(true);
    expect(isPurchasable("low_stock")).toBe(true);
    expect(isPurchasable("backorder")).toBe(true);
    expect(isPurchasable("out_of_stock")).toBe(false);
  });
});

describe("clampInventoryQuantity", () => {
  it("never writes negative stock unless backorders are on", () => {
    expect(clampInventoryQuantity(-4, false)).toBe(0);
    expect(clampInventoryQuantity(-4, true)).toBe(-4);
    expect(clampInventoryQuantity(3.6, false)).toBe(4);
  });
});
