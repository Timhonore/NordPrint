import { describe, expect, it } from "vitest";
import type { ProductSummary } from "@nordprint/types";
import { RuleBasedRecommendationEngine, materialsForIntents } from "../recommendation/rule-engine";

const engine = new RuleBasedRecommendationEngine();

function product(overrides: Partial<ProductSummary> & { id: string }): ProductSummary {
  return {
    handle: overrides.id,
    title: overrides.id,
    subtitle: null,
    thumbnail: null,
    kind: "filament",
    brand: null,
    categories: [],
    priceFrom: { amount: 18900, currencyCode: "DKK" },
    compareAtPriceFrom: null,
    pricePerKgFrom: { amount: 18900, currencyCode: "DKK" },
    stock: "in_stock",
    variantCount: 1,
    swatches: [],
    averageRating: null,
    reviewCount: 0,
    isNew: false,
    onSale: false,
    material: "pla",
    finish: "basic",
    ...overrides,
  };
}

const catalogue: ProductSummary[] = [
  product({ id: "pla", material: "pla", title: "NordPrint PLA Basic" }),
  product({ id: "petg", material: "petg", title: "NordPrint PETG HF" }),
  product({ id: "asa", material: "asa", title: "NordPrint ASA" }),
  product({ id: "tpu", material: "tpu", title: "NordPrint TPU 95A" }),
  product({ id: "nylon", material: "nylon", title: "NordPrint PA-CF" }),
];

describe("RuleBasedRecommendationEngine", () => {
  it("recommends PLA for beginner decoration", async () => {
    const result = await engine.recommend(
      { intents: ["decoration", "beginner"], priorities: ["easy_to_print", "low_price"] },
      catalogue
    );
    expect(result.recommendations[0]?.product.id).toBe("pla");
  });

  it("recommends ASA or PETG for outdoor UV resistance", async () => {
    const result = await engine.recommend(
      { intents: ["outdoor"], priorities: ["uv_resistance"] },
      catalogue
    );
    expect(["asa", "petg"]).toContain(result.recommendations[0]?.product.id);
  });

  it("recommends TPU when flexibility is the point", async () => {
    const result = await engine.recommend(
      { intents: ["flexible"], priorities: ["flexibility"] },
      catalogue
    );
    expect(result.recommendations[0]?.product.id).toBe("tpu");
  });

  it("recommends nylon for very strong parts", async () => {
    const result = await engine.recommend(
      { intents: ["very_strong"], priorities: ["strength"] },
      catalogue
    );
    expect(result.recommendations[0]?.product.id).toBe("nylon");
  });

  it("explains every recommendation", async () => {
    const result = await engine.recommend(
      { intents: ["functional"], priorities: ["strength"] },
      catalogue
    );
    expect(result.recommendations[0]?.reasons.length).toBeGreaterThan(0);
  });

  it("demotes sold-out products", async () => {
    const withSoldOut = catalogue.map((entry) =>
      entry.id === "pla" ? { ...entry, stock: "out_of_stock" as const } : entry
    );
    const result = await engine.recommend(
      { intents: ["decoration"], priorities: ["easy_to_print"] },
      withSoldOut
    );
    expect(result.recommendations[0]?.product.id).not.toBe("pla");
  });

  it("prefers products available in the requested colour", async () => {
    const withColors = catalogue.map((entry) =>
      entry.id === "petg"
        ? {
            ...entry,
            swatches: [
              {
                variantId: "var_petg_black",
                name: "Jet Black",
                hex: "#000000",
                hexSecondary: null,
                family: "black" as const,
                stock: "in_stock" as const,
              },
            ],
          }
        : entry
    );
    const result = await engine.recommend(
      { intents: ["functional"], priorities: [], colorFamily: "black" },
      withColors
    );
    expect(result.recommendations[0]?.product.id).toBe("petg");
    expect(result.recommendations[0]?.matchedVariantId).toBe("var_petg_black");
  });

  it("ignores non-filament products", async () => {
    const mixed = [...catalogue, product({ id: "nozzle", kind: "spare_part", material: null })];
    const result = await engine.recommend({ intents: ["decoration"], priorities: [] }, mixed);
    expect(result.recommendations.map((entry) => entry.product.id)).not.toContain("nozzle");
  });

  it("still returns suggestions when nothing scores positively", async () => {
    const result = await engine.recommend({ intents: [], priorities: [] }, catalogue);
    expect(result.recommendations.length).toBeGreaterThanOrEqual(3);
  });

  it("respects the requested limit", async () => {
    const result = await engine.recommend(
      { intents: ["functional"], priorities: ["strength"], limit: 2 },
      catalogue
    );
    expect(result.recommendations).toHaveLength(2);
  });

  it("reports which engine produced the result", async () => {
    const result = await engine.recommend({ intents: [], priorities: [] }, catalogue);
    expect(result.engine).toBe("rule-engine-v1");
  });
});

describe("materialsForIntents", () => {
  it("narrows the candidate query", () => {
    expect(materialsForIntents(["flexible"])).toEqual(["tpu"]);
    expect(materialsForIntents(["outdoor"])).toContain("asa");
  });

  it("falls back to everything when no intent is given", () => {
    expect(materialsForIntents([]).length).toBeGreaterThan(3);
  });
});
