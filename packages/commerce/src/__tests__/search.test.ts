import { describe, expect, it } from "vitest";
import { parseSearchTerm, toTsQuery } from "../search/provider";

describe("parseSearchTerm", () => {
  it("understands 'sort pla' as colour + material", () => {
    const parsed = parseSearchTerm("sort pla");
    expect(parsed.colors).toEqual(["black"]);
    expect(parsed.materials).toEqual(["pla"]);
  });

  it("understands 'PLA 1.75' as material + diameter", () => {
    const parsed = parseSearchTerm("PLA 1.75");
    expect(parsed.materials).toEqual(["pla"]);
    expect(parsed.diameters).toEqual([1.75]);
  });

  it("understands 'petg bambu' as material + free text brand", () => {
    const parsed = parseSearchTerm("petg bambu");
    expect(parsed.materials).toEqual(["petg"]);
    expect(parsed.tokens).toContain("bambu");
  });

  it("understands 'x1c nozzle' as a printer hint", () => {
    expect(parseSearchTerm("x1c nozzle").printerHints).toEqual(["x1c"]);
  });

  it("understands '0.4 hardened' as nozzle size + property", () => {
    const parsed = parseSearchTerm("0.4 hardened");
    expect(parsed.nozzleSizes).toEqual([0.4]);
    expect(parsed.flags).toContain("hardened");
  });

  it("understands 'build plate p1s'", () => {
    const parsed = parseSearchTerm("build plate p1s");
    expect(parsed.printerHints).toEqual(["p1s"]);
    expect(parsed.tokens).toContain("build");
  });

  it("understands 'filament dryer'", () => {
    expect(parseSearchTerm("filament dryer").flags).toContain("dryer");
  });

  it("handles Danish colour words and a comma decimal", () => {
    const parsed = parseSearchTerm("grøn petg 1,75");
    expect(parsed.colors).toEqual(["green"]);
    expect(parsed.diameters).toEqual([1.75]);
  });

  it("survives punctuation and empty input", () => {
    expect(parseSearchTerm("   ").tokens).toEqual([]);
    expect(() => parseSearchTerm("!!!")).not.toThrow();
  });
});

describe("toTsQuery", () => {
  it("strips characters that would break tsquery parsing", () => {
    expect(toTsQuery(parseSearchTerm("pla & petg | abs"))).toBe("pla petg abs");
  });

  it("drops single characters that only add noise", () => {
    expect(toTsQuery(parseSearchTerm("a pla"))).toBe("pla");
  });
});
