import { describe, expect, it } from "vitest";
import {
  countActiveFilters,
  parseProductQuery,
  serializeProductQuery,
  toggleFilterValue,
} from "../filters";

describe("parseProductQuery", () => {
  it("parses the canonical catalogue URL", () => {
    // /filament?material=pla&brand=bambu-lab&color=black
    const query = parseProductQuery({ material: "pla", brand: "bambu-lab", color: "black" });
    expect(query.material).toEqual(["pla"]);
    expect(query.brand).toEqual(["bambu-lab"]);
    expect(query.color).toEqual(["black"]);
    expect(query.page).toBe(1);
    expect(query.sort).toBe("popular");
  });

  it("accepts comma-separated and repeated values", () => {
    expect(parseProductQuery({ material: "pla,petg" }).material).toEqual(["pla", "petg"]);
    expect(parseProductQuery({ material: ["pla", "petg"] }).material).toEqual(["pla", "petg"]);
  });

  it("drops unknown values instead of failing", () => {
    const query = parseProductQuery({ material: "pla,unobtanium", sort: "cheapest" });
    expect(query.material).toEqual(["pla"]);
    expect(query.sort).toBe("popular");
  });

  it("parses toggles and ranges", () => {
    const query = parseProductQuery({
      ams: "1",
      lager: "true",
      tilbud: "0",
      pris_min: "100",
      pris_max: "400",
    });
    expect(query.amsCompatible).toBe(true);
    expect(query.inStockOnly).toBe(true);
    expect(query.onSale).toBe(false);
    expect(query.priceMin).toBe(100);
    expect(query.priceMax).toBe(400);
  });

  it("parses the route's scope filters", () => {
    // Scope comes from the route (/filament, a category page), not the customer.
    const query = parseProductQuery({ kind: "filament", kategori: "filament-pla" });
    expect(query.kind).toBe("filament");
    expect(query.categoryHandle).toBe("filament-pla");
  });

  it("clamps pagination to sane values", () => {
    expect(parseProductQuery({ side: "0" }).page).toBe(1);
    expect(parseProductQuery({ side: "-4" }).page).toBe(1);
    expect(parseProductQuery({ limit: "5000" }).limit).toBe(96);
  });
});

describe("serializeProductQuery", () => {
  it("round-trips a query", () => {
    const original = parseProductQuery({
      material: "pla,petg",
      brand: "bambu-lab",
      sort: "price_per_kg_asc",
      side: "2",
      ams: "1",
    });
    const reparsed = parseProductQuery(
      Object.fromEntries(new URLSearchParams(serializeProductQuery(original)))
    );
    expect(reparsed.material).toEqual(original.material);
    expect(reparsed.brand).toEqual(original.brand);
    expect(reparsed.sort).toBe("price_per_kg_asc");
    expect(reparsed.page).toBe(2);
    expect(reparsed.amsCompatible).toBe(true);
  });

  it("never emits scope filters — a category page owns its scope", () => {
    const query = parseProductQuery({ kind: "filament", kategori: "filament-pla", material: "pla" });
    const search = serializeProductQuery(query);
    expect(search).toBe("material=pla");
  });

  it("omits defaults so canonical URLs stay clean", () => {
    expect(serializeProductQuery(parseProductQuery({}))).toBe("");
    expect(serializeProductQuery(parseProductQuery({ sort: "popular", side: "1" }))).toBe("");
  });
});

describe("toggleFilterValue", () => {
  it("adds, removes and resets pagination", () => {
    const base = parseProductQuery({ side: "4" });
    const added = toggleFilterValue(base, "material", "pla");
    expect(added.material).toEqual(["pla"]);
    expect(added.page).toBe(1);
    expect(toggleFilterValue(added, "material", "pla").material).toEqual([]);
  });
});

describe("countActiveFilters", () => {
  it("counts every applied facet", () => {
    const query = parseProductQuery({ material: "pla,petg", ams: "1", pris_min: "100" });
    expect(countActiveFilters(query)).toBe(4);
  });
});
