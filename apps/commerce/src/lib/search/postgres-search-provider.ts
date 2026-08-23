import type {
  ColorFamily,
  Facet,
  FacetValue,
  ProductQuery,
  ProductSearchResult,
  ProductSort,
  ProductSummary,
  SearchSuggestionResult,
} from "@nordprint/types";
import {
  COLOR_FAMILY_LABELS,
  FINISH_LABELS,
  MATERIAL_LABELS,
} from "@nordprint/types";
import {
  aggregateStockStatus,
  calculatePricePerKg,
  parseSearchTerm,
  resolveStockStatus,
  toLikePatterns,
  type SearchProvider,
} from "@nordprint/commerce";
import { commerceConfig } from "@nordprint/config";
import { VARIANT_SOURCE_CTE } from "./variant-source.sql";

type Knex = any;

interface VariantRow {
  product_id: string;
  product_handle: string;
  product_title: string;
  product_subtitle: string | null;
  product_thumbnail: string | null;
  product_created_at: Date;
  product_metadata: Record<string, unknown> | null;
  variant_id: string;
  variant_title: string;
  variant_sku: string | null;
  variant_ean: string | null;
  manage_inventory: boolean;
  allow_backorder: boolean;
  brand_id: string | null;
  brand_name: string | null;
  brand_handle: string | null;
  brand_logo_url: string | null;
  material: string | null;
  material_variant: string | null;
  finish: string | null;
  ams_compatible: boolean | null;
  abrasive: boolean | null;
  hardened_nozzle_recommended: boolean | null;
  color_name: string | null;
  color_hex: string | null;
  color_hex_secondary: string | null;
  color_family: string | null;
  expected_restock_at: Date | null;
  diameter_mm: string | number | null;
  net_weight_g: number | null;
  effective_amount: string | number | null;
  compare_at_amount: string | number | null;
  currency_code: string;
  available_quantity: string | number;
}

/**
 * PostgreSQL-backed search provider.
 *
 * Everything is done in the database: filtering, sorting, pagination and facet
 * counts. Loading the catalogue into Node and filtering there works for the
 * 40 seed products and falls over at 4.000.
 *
 * This is v1. Because both the storefront and the API only ever see the
 * `SearchProvider` interface, moving to Meilisearch or OpenSearch later is a
 * new class and a config change — no UI component changes.
 */
export class PostgresSearchProvider implements SearchProvider {
  readonly id = "postgres";

  constructor(private readonly knex: Knex) {}

  async health(): Promise<{ ok: boolean; detail?: string }> {
    try {
      await this.knex.raw("SELECT 1");
      return { ok: true };
    } catch (error) {
      return { ok: false, detail: error instanceof Error ? error.message : "ukendt fejl" };
    }
  }

  async search(query: ProductQuery): Promise<ProductSearchResult> {
    const limit = query.limit ?? commerceConfig.productsPerPage;
    const page = Math.max(1, query.page ?? 1);
    const sort: ProductSort = query.sort ?? "popular";

    const { where, bindings } = this.buildFilters(query);

    // Step 1 — the page of product ids. Sorting and pagination happen here so
    // we never fetch variants for products we are not going to show.
    const idsSql = /* sql */ `
      WITH ${VARIANT_SOURCE_CTE},
      matched AS (
        SELECT
          product_id,
          MIN(effective_amount) FILTER (WHERE effective_amount IS NOT NULL) AS min_price,
          MAX(effective_amount) FILTER (WHERE effective_amount IS NOT NULL) AS max_price,
          MIN(
            CASE
              WHEN effective_amount IS NOT NULL AND net_weight_g > 0
              THEN effective_amount * 1000.0 / net_weight_g
            END
          ) AS min_price_per_kg,
          MAX(product_created_at) AS created_at,
          SUM(available_quantity) AS total_available,
          BOOL_OR(compare_at_amount IS NOT NULL) AS on_sale
        FROM variant_source
        WHERE ${where}
        GROUP BY product_id
      )
      SELECT product_id, COUNT(*) OVER () AS total_count
      FROM matched
      ORDER BY ${this.orderBy(sort)}
      LIMIT :limit OFFSET :offset
    `;

    const idsResult = await this.knex.raw(idsSql, {
      ...bindings,
      limit,
      offset: (page - 1) * limit,
    });

    const idRows = (idsResult.rows ?? []) as { product_id: string; total_count: string }[];
    const total = idRows.length > 0 ? Number(idRows[0]!.total_count) : 0;
    const productIds = idRows.map((row) => row.product_id);

    // Step 2 — every variant of those products, plus the facet counts.
    const [items, facets] = await Promise.all([
      this.loadProducts(productIds, sort),
      this.loadFacets(query),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pageCount: Math.max(1, Math.ceil(total / limit)),
      facets,
      sort,
    };
  }

  /**
   * Autocomplete. Deliberately forgiving: "sort pla" and "PLA 1.75" are parsed
   * into structured hints so the ranking can put the obvious answer first.
   */
  async suggest(term: string, limit = 8): Promise<SearchSuggestionResult> {
    const parsed = parseSearchTerm(term);
    if (parsed.tokens.length === 0) {
      return { products: [], categories: [], guides: [], query: term };
    }

    const patterns = toLikePatterns(parsed);
    const sql = /* sql */ `
      WITH ${VARIANT_SOURCE_CTE}
      SELECT
        product_id, product_handle, product_title, product_thumbnail,
        brand_name, currency_code,
        MIN(effective_amount) AS min_price,
        SUM(available_quantity) AS available,
        BOOL_OR(manage_inventory) AS manage_inventory,
        -- Exact-ish matches beat fuzzy ones; a material hint beats neither.
        MAX(
          CASE
            WHEN LOWER(product_title) = :exact THEN 100
            WHEN LOWER(product_title) LIKE :prefix THEN 60
            WHEN :material <> '' AND material = :material THEN 40
            WHEN LOWER(COALESCE(color_name, '')) LIKE ANY(:patterns) THEN 30
            ELSE 10
          END
        ) AS score
      FROM variant_source
      WHERE (
          LOWER(product_title) LIKE ANY(:patterns)
          OR LOWER(COALESCE(product_subtitle, '')) LIKE ANY(:patterns)
          OR LOWER(COALESCE(brand_name, '')) LIKE ANY(:patterns)
          OR LOWER(COALESCE(color_name, '')) LIKE ANY(:patterns)
          OR LOWER(COALESCE(variant_sku, '')) LIKE ANY(:patterns)
          OR LOWER(COALESCE(material_variant, '')) LIKE ANY(:patterns)
          OR (:material <> '' AND material = :material)
        )
      GROUP BY product_id, product_handle, product_title, product_thumbnail, brand_name, currency_code
      ORDER BY score DESC, min_price ASC NULLS LAST
      LIMIT :limit
    `;

    const [productResult, categoryResult, guideResult] = await Promise.all([
      this.knex.raw(sql, {
        currency: commerceConfig.currency.toLowerCase(),
        patterns,
        exact: parsed.text.toLowerCase(),
        prefix: `${parsed.tokens[0]}%`,
        material: parsed.materials[0] ?? "",
        limit,
      }),
      this.knex.raw(
        `SELECT handle, name FROM product_category
         WHERE deleted_at IS NULL AND is_active = TRUE AND LOWER(name) LIKE ANY(:patterns)
         ORDER BY rank ASC LIMIT 4`,
        { patterns }
      ),
      this.knex.raw(
        `SELECT slug, title FROM guide
         WHERE deleted_at IS NULL AND published_at IS NOT NULL AND published_at <= NOW()
           AND (LOWER(title) LIKE ANY(:patterns) OR LOWER(intro) LIKE ANY(:patterns))
         ORDER BY rank ASC LIMIT 3`,
        { patterns }
      ),
    ]);

    return {
      products: (productResult.rows ?? []).map((row: any) => ({
        id: row.product_id,
        handle: row.product_handle,
        title: row.product_title,
        brandName: row.brand_name,
        categoryName: null,
        thumbnail: row.product_thumbnail,
        price:
          row.min_price === null
            ? null
            : { amount: Number(row.min_price), currencyCode: row.currency_code.toUpperCase() },
        stock: resolveStockStatus(Number(row.available ?? 0), {
          manageInventory: row.manage_inventory !== false,
        }),
      })),
      categories: (categoryResult.rows ?? []).map((row: any) => ({
        handle: row.handle,
        name: row.name,
      })),
      guides: (guideResult.rows ?? []).map((row: any) => ({ slug: row.slug, title: row.title })),
      query: term,
    };
  }

  /** Loads full variant rows for a page of products and assembles summaries. */
  private async loadProducts(
    productIds: string[],
    sort: ProductSort
  ): Promise<ProductSummary[]> {
    if (productIds.length === 0) return [];

    const result = await this.knex.raw(
      /* sql */ `
        WITH ${VARIANT_SOURCE_CTE}
        SELECT * FROM variant_source
        WHERE product_id = ANY(:ids)
        ORDER BY product_id, variant_rank ASC NULLS LAST, variant_title ASC
      `,
      { currency: commerceConfig.currency.toLowerCase(), ids: productIds }
    );

    const byProduct = new Map<string, VariantRow[]>();
    for (const row of (result.rows ?? []) as VariantRow[]) {
      const list = byProduct.get(row.product_id) ?? [];
      list.push(row);
      byProduct.set(row.product_id, list);
    }

    // Preserve the order the ranking query decided on.
    return productIds
      .map((id) => {
        const rows = byProduct.get(id);
        return rows && rows.length > 0 ? toProductSummary(rows, sort) : null;
      })
      .filter((entry): entry is ProductSummary => entry !== null);
  }

  /**
   * Facet counts.
   *
   * Each facet is counted with the *other* filters applied but its own removed
   * — otherwise selecting "PLA" would make every other material read 0 and the
   * customer could never broaden their search.
   */
  private async loadFacets(query: ProductQuery): Promise<Facet[]> {
    const countFor = async (
      column: string,
      omit: keyof ProductQuery
    ): Promise<{ value: string; count: number }[]> => {
      const { where, bindings } = this.buildFilters(query, omit);
      const result = await this.knex.raw(
        /* sql */ `
          WITH ${VARIANT_SOURCE_CTE}
          SELECT ${column} AS value, COUNT(DISTINCT product_id)::int AS count
          FROM variant_source
          WHERE ${where} AND ${column} IS NOT NULL
          GROUP BY ${column}
          ORDER BY count DESC, value ASC
        `,
        bindings
      );
      return (result.rows ?? []) as { value: string; count: number }[];
    };

    const [materials, finishes, brands, colors, diameters, weights, priceRange] =
      await Promise.all([
        countFor("material", "material"),
        countFor("finish", "finish"),
        countFor("brand_handle", "brand"),
        countFor("color_family", "color"),
        countFor("diameter_mm", "diameter"),
        countFor("net_weight_g", "spoolWeight"),
        this.loadPriceRange(query),
      ]);

    const colorHexByFamily = await this.loadColorHexes(colors.map((entry) => entry.value));
    const brandNames = await this.loadBrandNames(brands.map((entry) => entry.value));

    const facets: Facet[] = [
      {
        key: "material",
        label: "Materiale",
        type: "checkbox",
        values: materials.map(
          (entry): FacetValue => ({
            value: entry.value,
            label: MATERIAL_LABELS[entry.value as keyof typeof MATERIAL_LABELS] ?? entry.value,
            count: entry.count,
          })
        ),
      },
      {
        key: "brand",
        label: "Brand",
        type: "checkbox",
        values: brands.map(
          (entry): FacetValue => ({
            value: entry.value,
            label: brandNames.get(entry.value) ?? entry.value,
            count: entry.count,
          })
        ),
      },
      {
        key: "color",
        label: "Farve",
        type: "swatch",
        values: colors.map(
          (entry): FacetValue => ({
            value: entry.value,
            label: COLOR_FAMILY_LABELS[entry.value as ColorFamily] ?? entry.value,
            count: entry.count,
            hex: colorHexByFamily.get(entry.value) ?? null,
          })
        ),
      },
      {
        key: "finish",
        label: "Finish",
        type: "checkbox",
        values: finishes.map(
          (entry): FacetValue => ({
            value: entry.value,
            label: FINISH_LABELS[entry.value as keyof typeof FINISH_LABELS] ?? entry.value,
            count: entry.count,
          })
        ),
      },
      {
        key: "diameter",
        label: "Diameter",
        type: "checkbox",
        values: diameters.map(
          (entry): FacetValue => ({
            value: String(entry.value),
            label: `${String(entry.value).replace(".", ",")} mm`,
            count: entry.count,
          })
        ),
      },
      {
        key: "vaegt",
        label: "Spolevægt",
        type: "checkbox",
        values: weights.map(
          (entry): FacetValue => ({
            value: String(entry.value),
            label:
              Number(entry.value) % 1000 === 0
                ? `${Number(entry.value) / 1000} kg`
                : `${entry.value} g`,
            count: entry.count,
          })
        ),
      },
      {
        key: "pris",
        label: "Pris",
        type: "range",
        values: [],
        min: priceRange.min,
        max: priceRange.max,
      },
    ];

    // A facet with a single value tells the customer nothing they cannot see.
    return facets.filter((facet) => facet.type === "range" || facet.values.length > 1);
  }

  private async loadPriceRange(query: ProductQuery): Promise<{ min: number; max: number }> {
    const { where, bindings } = this.buildFilters(query, "price");
    const result = await this.knex.raw(
      /* sql */ `
        WITH ${VARIANT_SOURCE_CTE}
        SELECT
          COALESCE(MIN(effective_amount), 0)::int AS min,
          COALESCE(MAX(effective_amount), 0)::int AS max
        FROM variant_source WHERE ${where}
      `,
      bindings
    );
    const row = result.rows?.[0] ?? { min: 0, max: 0 };
    return { min: Number(row.min), max: Number(row.max) };
  }

  /** One representative hex per colour family, for the swatch facet. */
  private async loadColorHexes(families: string[]): Promise<Map<string, string>> {
    if (families.length === 0) return new Map();
    const result = await this.knex.raw(
      `SELECT DISTINCT ON (color_family) color_family, color_hex
       FROM filament_variant_spec
       WHERE deleted_at IS NULL AND color_family = ANY(:families) AND color_hex IS NOT NULL
       ORDER BY color_family, created_at ASC`,
      { families }
    );
    return new Map(
      (result.rows ?? []).map((row: any) => [row.color_family, row.color_hex] as [string, string])
    );
  }

  private async loadBrandNames(handles: string[]): Promise<Map<string, string>> {
    if (handles.length === 0) return new Map();
    const result = await this.knex.raw(
      `SELECT handle, name FROM brand WHERE deleted_at IS NULL AND handle = ANY(:handles)`,
      { handles }
    );
    return new Map(
      (result.rows ?? []).map((row: any) => [row.handle, row.name] as [string, string])
    );
  }

  /**
   * Builds the WHERE clause. `omit` drops one filter so a facet can count the
   * alternatives the customer could switch to.
   */
  private buildFilters(
    query: ProductQuery,
    omit?: keyof ProductQuery | "price"
  ): { where: string; bindings: Record<string, unknown> } {
    const clauses: string[] = ["TRUE"];
    const bindings: Record<string, unknown> = {
      currency: commerceConfig.currency.toLowerCase(),
    };

    if (query.categoryHandle) {
      clauses.push(`product_id IN (
        SELECT pcp.product_id FROM product_category_product pcp
        JOIN product_category pc ON pc.id = pcp.product_category_id AND pc.deleted_at IS NULL
        WHERE pc.handle = :categoryHandle OR pc.id IN (
          SELECT id FROM product_category
          WHERE deleted_at IS NULL AND parent_category_id = (
            SELECT id FROM product_category WHERE handle = :categoryHandle AND deleted_at IS NULL
          )
        )
      )`);
      bindings.categoryHandle = query.categoryHandle;
    }

    if (query.q) {
      const parsed = parseSearchTerm(query.q);
      if (parsed.tokens.length > 0) {
        clauses.push(`(
          LOWER(product_title) LIKE ANY(:searchPatterns)
          OR LOWER(COALESCE(product_subtitle, '')) LIKE ANY(:searchPatterns)
          OR LOWER(COALESCE(brand_name, '')) LIKE ANY(:searchPatterns)
          OR LOWER(COALESCE(color_name, '')) LIKE ANY(:searchPatterns)
          OR LOWER(COALESCE(variant_sku, '')) LIKE ANY(:searchPatterns)
          OR LOWER(COALESCE(material_variant, '')) LIKE ANY(:searchPatterns)
        )`);
        bindings.searchPatterns = toLikePatterns(parsed);
      }
    }

    if (omit !== "material" && query.material?.length) {
      clauses.push("material = ANY(:materials)");
      bindings.materials = [...query.material];
    }
    if (omit !== "finish" && query.finish?.length) {
      clauses.push("finish = ANY(:finishes)");
      bindings.finishes = [...query.finish];
    }
    if (omit !== "brand" && query.brand?.length) {
      clauses.push("brand_handle = ANY(:brands)");
      bindings.brands = [...query.brand];
    }
    if (omit !== "color" && query.color?.length) {
      clauses.push("color_family = ANY(:colors)");
      bindings.colors = [...query.color];
    }
    if (omit !== "diameter" && query.diameter?.length) {
      clauses.push("diameter_mm = ANY(:diameters)");
      bindings.diameters = [...query.diameter];
    }
    if (omit !== "spoolWeight" && query.spoolWeight?.length) {
      clauses.push("net_weight_g = ANY(:weights)");
      bindings.weights = [...query.spoolWeight];
    }
    if (omit !== "price") {
      if (query.priceMin !== undefined) {
        clauses.push("effective_amount >= :priceMin");
        bindings.priceMin = query.priceMin;
      }
      if (query.priceMax !== undefined) {
        clauses.push("effective_amount <= :priceMax");
        bindings.priceMax = query.priceMax;
      }
    }
    if (query.inStockOnly) {
      clauses.push("(manage_inventory = FALSE OR available_quantity > 0)");
    }
    if (query.amsCompatible) {
      clauses.push("ams_compatible = TRUE");
    }
    if (query.hardenedNozzleRequired !== undefined) {
      clauses.push("COALESCE(hardened_nozzle_recommended, FALSE) = :hardened");
      bindings.hardened = query.hardenedNozzleRequired;
    }
    if (query.onSale) {
      clauses.push("compare_at_amount IS NOT NULL");
    }
    if (query.kind) {
      clauses.push("product_metadata->>'kind' = :kind");
      bindings.kind = query.kind;
    }
    if (query.printerModelId) {
      // Products explicitly recorded as fitting this printer, at any level of
      // the hierarchy. "unknown" products are excluded — this filter is the
      // customer asking "show me what you know fits".
      clauses.push(`product_id IN (
        SELECT cr.subject_id FROM compatibility_rule cr
        WHERE cr.deleted_at IS NULL
          AND cr.subject_type = 'product'
          AND cr.status IN ('compatible', 'conditional')
          AND cr.target_id IN (
            SELECT :printerModelId
            UNION SELECT pm.family_id FROM printer_model pm WHERE pm.id = :printerModelId
            UNION SELECT pf.brand_id FROM printer_model pm
              JOIN printer_family pf ON pf.id = pm.family_id
              WHERE pm.id = :printerModelId
          )
      )`);
      bindings.printerModelId = query.printerModelId;
    }

    return { where: clauses.join(" AND "), bindings };
  }

  private orderBy(sort: ProductSort): string {
    switch (sort) {
      case "newest":
        return "created_at DESC";
      case "price_asc":
        return "min_price ASC NULLS LAST";
      case "price_desc":
        return "max_price DESC NULLS LAST";
      case "price_per_kg_asc":
        return "min_price_per_kg ASC NULLS LAST";
      case "popular":
      default:
        // Until order statistics are wired up, "populære" means: available,
        // on offer, and recent. It is a real ordering, not a random one.
        return "(total_available > 0) DESC, on_sale DESC, created_at DESC";
    }
  }
}

/** Assembles one product summary from its variant rows. */
function toProductSummary(rows: VariantRow[], _sort: ProductSort): ProductSummary {
  const first = rows[0]!;
  const currencyCode = first.currency_code.toUpperCase();

  const priced = rows.filter((row) => row.effective_amount !== null);
  const amounts = priced.map((row) => Number(row.effective_amount));
  const minAmount = amounts.length > 0 ? Math.min(...amounts) : null;

  const cheapest = priced.find((row) => Number(row.effective_amount) === minAmount) ?? null;

  const stockStatuses = rows.map((row) =>
    resolveStockStatus(Number(row.available_quantity ?? 0), {
      manageInventory: row.manage_inventory !== false,
      allowBackorder: row.allow_backorder === true,
    })
  );

  const swatches = rows
    .filter((row) => row.color_name !== null)
    .map((row, index) => ({
      variantId: row.variant_id,
      name: row.color_name ?? row.variant_title,
      hex: row.color_hex,
      hexSecondary: row.color_hex_secondary,
      family: (row.color_family as ColorFamily | null) ?? null,
      stock: stockStatuses[index] ?? ("out_of_stock" as const),
    }));

  const pricePerKg =
    cheapest && minAmount !== null
      ? calculatePricePerKg({ amount: minAmount, currencyCode }, cheapest.net_weight_g)
      : null;

  const metadata = (first.product_metadata ?? {}) as Record<string, unknown>;
  const createdAt = new Date(first.product_created_at);
  const isNew = Date.now() - createdAt.getTime() < 45 * 24 * 60 * 60 * 1000;

  const compareAmounts = rows
    .filter((row) => row.compare_at_amount !== null)
    .map((row) => Number(row.compare_at_amount));

  return {
    id: first.product_id,
    handle: first.product_handle,
    title: first.product_title,
    subtitle: first.product_subtitle,
    thumbnail: first.product_thumbnail,
    kind: (metadata.kind as ProductSummary["kind"]) ?? (first.material ? "filament" : "other"),
    brand: first.brand_id
      ? {
          id: first.brand_id,
          name: first.brand_name ?? "",
          handle: first.brand_handle ?? "",
          logoUrl: first.brand_logo_url,
          description: null,
          rank: 0,
        }
      : null,
    categories: [],
    priceFrom: minAmount === null ? null : { amount: minAmount, currencyCode },
    compareAtPriceFrom:
      compareAmounts.length > 0
        ? { amount: Math.max(...compareAmounts), currencyCode }
        : null,
    pricePerKgFrom: pricePerKg,
    stock: aggregateStockStatus(stockStatuses),
    variantCount: rows.length,
    swatches,
    averageRating: null,
    reviewCount: 0,
    isNew,
    onSale: compareAmounts.length > 0,
    material: (first.material as ProductSummary["material"]) ?? null,
    finish: (first.finish as ProductSummary["finish"]) ?? null,
  };
}
