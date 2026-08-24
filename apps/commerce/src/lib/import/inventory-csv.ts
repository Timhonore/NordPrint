import { calculateMargin, toMinorUnits } from "@nordprint/commerce";
import { commerceConfig } from "@nordprint/config";

/**
 * Inventory CSV importer.
 *
 * Two hard rules, both of which the brief calls out and both of which are the
 * difference between a useful importer and a dangerous one:
 *
 *  1. **Validate everything before writing anything.** The whole file is
 *     parsed, matched against the catalogue and validated first. Only then is
 *     a single transaction applied.
 *  2. **No partial silent failures.** Every row ends up in exactly one bucket
 *     — update, unchanged, or error — and the counts are shown to the operator
 *     before they commit.
 *
 * Expected columns: sku, ean, stock, cost_price, sale_price.
 * Column order does not matter; unknown columns are ignored.
 */

export const IMPORT_COLUMNS = ["sku", "ean", "stock", "cost_price", "sale_price"] as const;
export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export interface ImportRow {
  /** 1-based line number in the file, including the header. */
  readonly line: number;
  readonly sku: string;
  readonly ean: string | null;
  readonly stock: number | null;
  /** Minor units. */
  readonly costPrice: number | null;
  readonly salePrice: number | null;
}

export interface RowError {
  readonly line: number;
  readonly sku: string | null;
  readonly message: string;
}

export interface RowChange {
  readonly line: number;
  readonly sku: string;
  readonly variantId: string;
  readonly productTitle: string;
  readonly changes: {
    readonly field: "stock" | "cost_price" | "sale_price" | "ean";
    readonly from: string | number | null;
    readonly to: string | number | null;
  }[];
  /** Margin after the import, so a buyer can spot a mispriced row. */
  readonly marginPercent: number | null;
}

export interface ImportPreview {
  readonly found: number;
  readonly toUpdate: number;
  readonly unchanged: number;
  readonly errors: readonly RowError[];
  readonly changes: readonly RowChange[];
  readonly unchangedSkus: readonly string[];
}

/** Current catalogue state for one SKU, as fetched by the caller. */
export interface ExistingVariant {
  readonly variantId: string;
  readonly sku: string;
  readonly ean: string | null;
  readonly productTitle: string;
  readonly stock: number | null;
  readonly costPrice: number | null;
  readonly salePrice: number | null;
}

/**
 * Minimal RFC 4180 CSV parser: handles quoted fields, escaped quotes and both
 * comma and semicolon delimiters (Danish Excel exports use semicolons).
 */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const delimiter = detectDelimiter(text);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((cell) => cell.trim().length > 0));
}

function detectDelimiter(text: string): string {
  const firstLine = text.split("\n", 1)[0] ?? "";
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ";" : ",";
}

export interface ParseResult {
  readonly rows: readonly ImportRow[];
  readonly errors: readonly RowError[];
}

/** Parses and validates the file. No catalogue lookups happen here. */
export function parseInventoryCsv(input: string): ParseResult {
  const table = parseCsv(input);
  if (table.length === 0) {
    return { rows: [], errors: [{ line: 1, sku: null, message: "Filen er tom" }] };
  }

  const header = (table[0] ?? []).map((cell) => cell.trim().toLowerCase());
  const columnIndex = new Map<string, number>();
  header.forEach((name, index) => columnIndex.set(name, index));

  if (!columnIndex.has("sku")) {
    return {
      rows: [],
      errors: [
        {
          line: 1,
          sku: null,
          message: `Kolonnen "sku" mangler. Forventede kolonner: ${IMPORT_COLUMNS.join(", ")}`,
        },
      ],
    };
  }

  const rows: ImportRow[] = [];
  const errors: RowError[] = [];
  const seenSkus = new Set<string>();

  for (let index = 1; index < table.length; index += 1) {
    const line = index + 1;
    const cells = table[index] ?? [];
    const read = (column: string): string => (cells[columnIndex.get(column) ?? -1] ?? "").trim();

    const sku = read("sku");
    if (!sku) {
      errors.push({ line, sku: null, message: "SKU mangler" });
      continue;
    }
    if (seenSkus.has(sku)) {
      errors.push({ line, sku, message: `SKU "${sku}" optræder flere gange i filen` });
      continue;
    }
    seenSkus.add(sku);

    const stock = parseIntegerCell(read("stock"));
    if (stock.error) {
      errors.push({ line, sku, message: `Lager: ${stock.error}` });
      continue;
    }
    if (stock.value !== null && stock.value < 0 && !commerceConfig.stock.allowBackorder) {
      errors.push({
        line,
        sku,
        message: "Negativt lager er ikke tilladt, når restordre er slået fra",
      });
      continue;
    }

    const costPrice = parsePriceCell(read("cost_price"));
    if (costPrice.error) {
      errors.push({ line, sku, message: `Indkøbspris: ${costPrice.error}` });
      continue;
    }

    const salePrice = parsePriceCell(read("sale_price"));
    if (salePrice.error) {
      errors.push({ line, sku, message: `Salgspris: ${salePrice.error}` });
      continue;
    }

    const ean = read("ean") || null;
    if (ean !== null && !/^\d{8}$|^\d{12,14}$/.test(ean)) {
      errors.push({ line, sku, message: `"${ean}" ligner ikke et gyldigt EAN/GTIN` });
      continue;
    }

    rows.push({
      line,
      sku,
      ean,
      stock: stock.value,
      costPrice: costPrice.value,
      salePrice: salePrice.value,
    });
  }

  return { rows, errors };
}

/**
 * Diffs the parsed rows against the catalogue and produces the preview the
 * operator confirms:
 *
 *     129 varer fundet
 *     118 opdateres
 *       8 uændrede
 *       3 fejl
 */
export function buildImportPreview(
  rows: readonly ImportRow[],
  parseErrors: readonly RowError[],
  existing: ReadonlyMap<string, ExistingVariant>
): ImportPreview {
  const errors: RowError[] = [...parseErrors];
  const changes: RowChange[] = [];
  const unchangedSkus: string[] = [];

  for (const row of rows) {
    const current = existing.get(row.sku);
    if (!current) {
      errors.push({ line: row.line, sku: row.sku, message: `SKU "${row.sku}" findes ikke` });
      continue;
    }

    const rowChanges: RowChange["changes"] = [];

    if (row.stock !== null && row.stock !== current.stock) {
      rowChanges.push({ field: "stock", from: current.stock, to: row.stock });
    }
    if (row.costPrice !== null && row.costPrice !== current.costPrice) {
      rowChanges.push({ field: "cost_price", from: current.costPrice, to: row.costPrice });
    }
    if (row.salePrice !== null && row.salePrice !== current.salePrice) {
      rowChanges.push({ field: "sale_price", from: current.salePrice, to: row.salePrice });
    }
    if (row.ean !== null && row.ean !== current.ean) {
      rowChanges.push({ field: "ean", from: current.ean, to: row.ean });
    }

    if (rowChanges.length === 0) {
      unchangedSkus.push(row.sku);
      continue;
    }

    const salePrice = row.salePrice ?? current.salePrice;
    const costPrice = row.costPrice ?? current.costPrice;

    changes.push({
      line: row.line,
      sku: row.sku,
      variantId: current.variantId,
      productTitle: current.productTitle,
      changes: rowChanges,
      marginPercent:
        salePrice !== null && costPrice !== null
          ? calculateMargin(
              { amount: salePrice, currencyCode: commerceConfig.currency },
              { amount: costPrice, currencyCode: commerceConfig.currency }
            ).marginPercent
          : null,
    });
  }

  return {
    found: rows.length + parseErrors.length,
    toUpdate: changes.length,
    unchanged: unchangedSkus.length,
    errors,
    changes,
    unchangedSkus,
  };
}

function parseIntegerCell(raw: string): { value: number | null; error?: string } {
  if (raw === "") return { value: null };
  const parsed = Number(raw.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(parsed)) return { value: null, error: `"${raw}" er ikke et tal` };
  if (!Number.isInteger(parsed)) return { value: null, error: `"${raw}" skal være et helt tal` };
  return { value: parsed };
}

/** Accepts "189", "189,50" and "189.50"; returns minor units. */
function parsePriceCell(raw: string): { value: number | null; error?: string } {
  if (raw === "") return { value: null };
  const normalized = raw
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}\b)/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return { value: null, error: `"${raw}" er ikke et beløb` };
  if (parsed < 0) return { value: null, error: "Beløbet kan ikke være negativt" };
  return { value: toMinorUnits(parsed) };
}
