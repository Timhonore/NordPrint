import {
  buildImportPreview,
  parseCsv,
  parseInventoryCsv,
  type ExistingVariant,
} from "../inventory-csv";

describe("parseCsv", () => {
  it("parses comma-separated files", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("parses semicolon-separated files from Danish Excel", () => {
    expect(parseCsv("sku;stock\nBB-1;14")).toEqual([
      ["sku", "stock"],
      ["BB-1", "14"],
    ]);
  });

  it("handles quoted fields containing the delimiter", () => {
    expect(parseCsv('sku,title\nBB-1,"PLA Basic, Jade White"')[1]).toEqual([
      "BB-1",
      "PLA Basic, Jade White",
    ]);
  });

  it("handles escaped quotes", () => {
    expect(parseCsv('a\n"He said ""hi"""')[1]).toEqual(['He said "hi"']);
  });

  it("strips a UTF-8 BOM", () => {
    expect(parseCsv("﻿sku,stock\nBB-1,4")[0]).toEqual(["sku", "stock"]);
  });

  it("skips blank lines", () => {
    expect(parseCsv("sku\n\nBB-1\n\n")).toHaveLength(2);
  });
});

describe("parseInventoryCsv", () => {
  it("parses a well-formed file", () => {
    const result = parseInventoryCsv(
      [
        "sku,ean,stock,cost_price,sale_price",
        "NP-PLA-BLK-1000,5712345678901,14,102,189",
        "NP-PLA-WHT-1000,5712345678902,3,102,189",
      ].join("\n")
    );

    expect(result.errors).toHaveLength(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      sku: "NP-PLA-BLK-1000",
      stock: 14,
      costPrice: 10200,
      salePrice: 18900,
    });
  });

  it("accepts Danish decimal commas in prices", () => {
    const result = parseInventoryCsv("sku,sale_price\nNP-1,189,50".replace("189,50", '"189,50"'));
    expect(result.rows[0]?.salePrice).toBe(18950);
  });

  it("rejects a file without a sku column", () => {
    const result = parseInventoryCsv("ean,stock\n123,4");
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]?.message).toContain("sku");
  });

  it("rejects an empty file", () => {
    expect(parseInventoryCsv("").errors[0]?.message).toBe("Filen er tom");
  });

  it("reports non-numeric stock instead of importing it", () => {
    const result = parseInventoryCsv("sku,stock\nNP-1,mange");
    expect(result.rows).toHaveLength(0);
    expect(result.errors[0]?.message).toContain("Lager");
  });

  it("rejects fractional stock", () => {
    expect(parseInventoryCsv("sku,stock\nNP-1,3.5").errors[0]?.message).toContain("helt tal");
  });

  it("rejects negative stock while backorders are off", () => {
    expect(parseInventoryCsv("sku,stock\nNP-1,-2").errors[0]?.message).toContain("Negativt lager");
  });

  it("rejects an implausible EAN", () => {
    expect(parseInventoryCsv("sku,ean\nNP-1,42").errors[0]?.message).toContain("EAN");
  });

  it("rejects duplicate SKUs so two rows cannot fight over one variant", () => {
    const result = parseInventoryCsv("sku,stock\nNP-1,4\nNP-1,9");
    expect(result.rows).toHaveLength(1);
    expect(result.errors[0]?.message).toContain("flere gange");
  });

  it("treats empty cells as 'leave unchanged', not as zero", () => {
    const result = parseInventoryCsv("sku,stock,cost_price\nNP-1,,");
    expect(result.rows[0]).toMatchObject({ stock: null, costPrice: null });
  });
});

describe("buildImportPreview", () => {
  const existing = new Map<string, ExistingVariant>([
    [
      "NP-PLA-BLK-1000",
      {
        variantId: "var_1",
        sku: "NP-PLA-BLK-1000",
        ean: "5712345678901",
        productTitle: "NordPrint PLA Basic",
        stock: 4,
        costPrice: 10200,
        salePrice: 18900,
      },
    ],
    [
      "NP-PLA-WHT-1000",
      {
        variantId: "var_2",
        sku: "NP-PLA-WHT-1000",
        ean: null,
        productTitle: "NordPrint PLA Basic",
        stock: 9,
        costPrice: 10200,
        salePrice: 18900,
      },
    ],
  ]);

  it("counts updates, unchanged rows and errors separately", () => {
    const { rows, errors } = parseInventoryCsv(
      [
        "sku,stock,cost_price,sale_price",
        "NP-PLA-BLK-1000,14,102,189", // stock changes
        "NP-PLA-WHT-1000,9,102,189", // identical
        "NP-DOES-NOT-EXIST,4,,", // unknown SKU
      ].join("\n")
    );

    const preview = buildImportPreview(rows, errors, existing);

    expect(preview.found).toBe(3);
    expect(preview.toUpdate).toBe(1);
    expect(preview.unchanged).toBe(1);
    expect(preview.errors).toHaveLength(1);
    expect(preview.errors[0]?.message).toContain("findes ikke");
  });

  it("lists exactly which fields change", () => {
    const { rows, errors } = parseInventoryCsv("sku,stock,sale_price\nNP-PLA-BLK-1000,14,199");
    const preview = buildImportPreview(rows, errors, existing);

    expect(preview.changes[0]?.changes).toEqual([
      { field: "stock", from: 4, to: 14 },
      { field: "sale_price", from: 18900, to: 19900 },
    ]);
  });

  it("computes the resulting margin so a mispriced row is visible", () => {
    const { rows, errors } = parseInventoryCsv("sku,sale_price\nNP-PLA-BLK-1000,189");
    // 189 kr sale, 102 kr cost → 46 %
    const withChange = parseInventoryCsv("sku,stock,sale_price\nNP-PLA-BLK-1000,14,189");
    const preview = buildImportPreview(withChange.rows, withChange.errors, existing);
    expect(preview.changes[0]?.marginPercent).toBe(46);
    expect(buildImportPreview(rows, errors, existing).unchanged).toBe(1);
  });

  it("never silently drops a row: every row lands in exactly one bucket", () => {
    const { rows, errors } = parseInventoryCsv(
      [
        "sku,stock",
        "NP-PLA-BLK-1000,14",
        "NP-PLA-WHT-1000,9",
        "NP-MISSING,1",
        ",5",
      ].join("\n")
    );
    const preview = buildImportPreview(rows, errors, existing);
    expect(preview.toUpdate + preview.unchanged + preview.errors.length).toBe(4);
  });
});
