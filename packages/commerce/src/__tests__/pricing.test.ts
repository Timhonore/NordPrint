import { describe, expect, it } from "vitest";
import {
  calculateDiscountPercent,
  calculateIncludedVat,
  calculateMargin,
  calculatePricePerKg,
  formatPricePerKg,
  formatSpoolWeight,
  splitVatInclusive,
} from "../pricing";
import { formatMoney, money } from "../money";

describe("calculatePricePerKg", () => {
  it("returns the price itself for a 1 kg spool", () => {
    // 189 kr / 1000 g → 189 kr/kg
    expect(calculatePricePerKg(money(18900), 1000)).toEqual({ amount: 18900, currencyCode: "DKK" });
  });

  it("scales up for a 750 g spool", () => {
    // 169 kr / 750 g → 225,33 kr/kg
    expect(calculatePricePerKg(money(16900), 750)?.amount).toBe(22533);
  });

  it("scales down for a 2 kg spool", () => {
    expect(calculatePricePerKg(money(34900), 2000)?.amount).toBe(17450);
  });

  it("handles 500 g and 250 g spools", () => {
    expect(calculatePricePerKg(money(9900), 500)?.amount).toBe(19800);
    expect(calculatePricePerKg(money(5900), 250)?.amount).toBe(23600);
  });

  it("returns null rather than guessing when weight is missing or invalid", () => {
    expect(calculatePricePerKg(money(18900), null)).toBeNull();
    expect(calculatePricePerKg(money(18900), 0)).toBeNull();
    expect(calculatePricePerKg(money(18900), -100)).toBeNull();
    expect(calculatePricePerKg(money(18900), Number.NaN)).toBeNull();
  });

  it("preserves the currency", () => {
    expect(calculatePricePerKg(money(2500, "EUR"), 1000)?.currencyCode).toBe("EUR");
  });

  it("renders the canonical label", () => {
    expect(formatPricePerKg(money(18900), 1000, formatMoney)).toBe("189 kr/kg");
    expect(formatPricePerKg(money(16900), 750, formatMoney)).toBe("225,33 kr/kg");
    expect(formatPricePerKg(money(16900), null, formatMoney)).toBeNull();
  });
});

describe("calculateDiscountPercent", () => {
  it("computes a genuine reduction", () => {
    expect(calculateDiscountPercent(money(14900), money(18900))).toBe(21);
  });

  it("returns null when there is no reduction", () => {
    expect(calculateDiscountPercent(money(18900), money(18900))).toBeNull();
    expect(calculateDiscountPercent(money(18900), money(14900))).toBeNull();
    expect(calculateDiscountPercent(money(18900), null)).toBeNull();
  });

  it("ignores mismatched currencies", () => {
    expect(calculateDiscountPercent(money(100, "DKK"), money(200, "EUR"))).toBeNull();
  });
});

describe("calculateMargin", () => {
  it("matches the worked example from the brief", () => {
    // Salgspris 189 kr, indkøbspris 102 kr → DB 87 kr, margin 46 %
    const result = calculateMargin(money(18900), money(10200));
    expect(result.contribution.amount).toBe(8700);
    expect(result.marginPercent).toBe(46);
    expect(result.markupPercent).toBe(85);
  });

  it("handles a zero cost price", () => {
    const result = calculateMargin(money(18900), money(0));
    expect(result.marginPercent).toBe(100);
    expect(result.markupPercent).toBeNull();
  });

  it("reports negative margin when sold below cost", () => {
    expect(calculateMargin(money(9000), money(10200)).marginPercent).toBe(-13);
  });

  it("refuses mismatched currencies", () => {
    expect(() => calculateMargin(money(100, "DKK"), money(100, "EUR"))).toThrow();
  });
});

describe("splitVatInclusive", () => {
  it("splits 25 % Danish VAT out of a gross price", () => {
    const result = splitVatInclusive(money(18900), 0.25);
    expect(result.net.amount).toBe(15120);
    expect(result.vat.amount).toBe(3780);
    expect(result.net.amount + result.vat.amount).toBe(18900);
  });
});

describe("formatSpoolWeight", () => {
  it("renders kilograms and grams the Danish way", () => {
    expect(formatSpoolWeight(1000)).toBe("1 kg");
    expect(formatSpoolWeight(2000)).toBe("2 kg");
    expect(formatSpoolWeight(750)).toBe("750 g");
    expect(formatSpoolWeight(null)).toBeNull();
    expect(formatSpoolWeight(0)).toBeNull();
  });
});

describe("calculateIncludedVat", () => {
  it("trækker momsen ud af en momsinklusiv pris", () => {
    // 189 kr inkl. 25 % moms = 151,20 netto + 37,80 moms.
    expect(calculateIncludedVat(money(18900, "DKK"), 0.25, true)).toEqual(money(3780, "DKK"));
  });

  it("giver null, når priserne ikke er momsinklusive", () => {
    expect(calculateIncludedVat(money(18900, "DKK"), 0.25, false)).toBeNull();
  });

  it("giver null ved en meningsløs momssats", () => {
    expect(calculateIncludedVat(money(18900, "DKK"), 0, true)).toBeNull();
    expect(calculateIncludedVat(money(18900, "DKK"), Number.NaN, true)).toBeNull();
  });

  it("netto plus moms giver bruttobeløbet igen", () => {
    const brutto = money(22533, "DKK");
    const moms = calculateIncludedVat(brutto, 0.25, true);
    expect(moms).not.toBeNull();
    // Ingen øre må forsvinde i afrundingen.
    expect(Math.round(brutto.amount - moms!.amount) + moms!.amount).toBe(brutto.amount);
  });
});
