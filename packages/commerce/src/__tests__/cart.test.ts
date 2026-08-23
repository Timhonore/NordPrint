import { describe, expect, it } from "vitest";
import { calculateCartWeightG, calculateFreeShippingProgress, calculateLineTotal } from "../cart";
import { formatMoney, money } from "../money";

const rules = {
  freeShippingThreshold: 49900,
  defaultRate: 4900,
  showFreeShippingProgress: true,
};

describe("calculateFreeShippingProgress", () => {
  it("reports how much is missing", () => {
    // 348 kr i kurven, fri fragt ved 499 kr → mangler 151 kr
    const progress = calculateFreeShippingProgress(money(34800), rules);
    expect(progress.qualified).toBe(false);
    expect(progress.remaining.amount).toBe(15100);
    expect(formatMoney(progress.remaining)).toBe("151 kr");
  });

  it("qualifies exactly at the threshold", () => {
    const progress = calculateFreeShippingProgress(money(49900), rules);
    expect(progress.qualified).toBe(true);
    expect(progress.remaining.amount).toBe(0);
    expect(progress.ratio).toBe(1);
  });

  it("never reports a ratio above 1", () => {
    expect(calculateFreeShippingProgress(money(99900), rules).ratio).toBe(1);
  });

  it("can be turned off entirely by configuration", () => {
    const progress = calculateFreeShippingProgress(money(1000), {
      ...rules,
      showFreeShippingProgress: false,
    });
    expect(progress.enabled).toBe(false);
    expect(progress.qualified).toBe(true);
  });

  it("respects a reconfigured threshold", () => {
    const progress = calculateFreeShippingProgress(money(34800), {
      ...rules,
      freeShippingThreshold: 29900,
    });
    expect(progress.qualified).toBe(true);
  });
});

describe("line totals", () => {
  it("multiplies without float drift", () => {
    expect(calculateLineTotal(money(18900), 3).amount).toBe(56700);
    expect(calculateLineTotal(money(3333), 3).amount).toBe(9999);
  });

  it("sums shipping weight across quantities", () => {
    expect(
      calculateCartWeightG([
        { quantity: 2, weightG: 1200 },
        { quantity: 1, weightG: 350 },
        { quantity: 1 },
      ])
    ).toBe(2750);
  });
});
