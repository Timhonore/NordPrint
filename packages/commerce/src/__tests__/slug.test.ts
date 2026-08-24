import { describe, expect, it } from "vitest";
import { contrastRatio, isLightColor, normalizeHex, slugify } from "../slug";

describe("slugify", () => {
  it("transliterates Danish letters instead of dropping them", () => {
    expect(slugify("Grøn")).toBe("groen");
    expect(slugify("Blå")).toBe("blaa");
    expect(slugify("Værktøj")).toBe("vaerktoej");
    expect(slugify("Filamenttørrere")).toBe("filamenttoerrere");
  });

  it("produces clean slugs", () => {
    expect(slugify("Bambu Lab PLA Basic — 1,75 mm")).toBe("bambu-lab-pla-basic-1-75-mm");
    expect(slugify("  double  spaces  ")).toBe("double-spaces");
  });
});

describe("normalizeHex", () => {
  it("expands shorthand and lowercases", () => {
    expect(normalizeHex("#FFF")).toBe("#ffffff");
    expect(normalizeHex("1F6EEB")).toBe("#1f6eeb");
  });

  it("rejects nonsense", () => {
    expect(normalizeHex("not-a-colour")).toBeNull();
    expect(normalizeHex(null)).toBeNull();
  });
});

describe("colour contrast", () => {
  it("detects light swatches that need a visible border", () => {
    expect(isLightColor("#ffffff")).toBe(true);
    expect(isLightColor("#f7f8fa")).toBe(true);
    expect(isLightColor("#000000")).toBe(false);
  });

  it("computes WCAG contrast ratios", () => {
    expect(Math.round(contrastRatio("#ffffff", "#000000"))).toBe(21);
    expect(contrastRatio("#ffffff", "#ffffff")).toBe(1);
  });
});
