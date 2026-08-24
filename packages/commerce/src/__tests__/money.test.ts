import { describe, expect, it } from "vitest";
import { addMoney, formatDkk, formatMoney, money, subtractMoney, toMinorUnits } from "../money";

describe("money", () => {
  it("formats whole kroner without decimals", () => {
    expect(formatDkk(18900)).toBe("189 kr");
  });

  it("formats øre with a Danish decimal comma", () => {
    expect(formatMoney(money(18950))).toBe("189,50 kr");
  });

  it("formats thousands with a Danish separator", () => {
    // da-DK groups with a period: 12.481 kr
    expect(formatDkk(1248100)).toBe("12.481 kr");
  });

  it("can force decimals", () => {
    expect(formatDkk(18900, { forceDecimals: true })).toBe("189,00 kr");
  });

  it("appends a suffix", () => {
    expect(formatDkk(18900, { suffix: "/kg" })).toBe("189 kr/kg");
  });

  it("adds and subtracts within a currency", () => {
    expect(addMoney(money(100), money(50)).amount).toBe(150);
    expect(subtractMoney(money(100), money(50)).amount).toBe(50);
  });

  it("refuses to mix currencies", () => {
    expect(() => addMoney(money(100, "DKK"), money(100, "EUR"))).toThrow();
  });

  it("converts major to minor units without float drift", () => {
    expect(toMinorUnits(189.9)).toBe(18990);
    expect(toMinorUnits(0.1 + 0.2)).toBe(30);
  });
});
