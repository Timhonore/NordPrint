import type {
  ColorFamily,
  ProductDetail,
  ProductImage,
  ProductVariantSummary,
} from "@nordprint/types";
import {
  aggregateStockStatus,
  buildStockInfo,
  calculatePricePerKg,
  resolveStockStatus,
} from "@nordprint/commerce";
import { commerceConfig } from "@nordprint/config";
import { VARIANT_SOURCE_CTE } from "../search/variant-source.sql";

type Knex = any;

/**
 * Loads one product with everything the product page renders: variants with
 * colour swatches, prices, price per kg, live stock, images, categories and
 * the filament specification.
 *
 * Four queries total, none of them per variant. The colour picker in
 * particular must have stock for *every* colour up front — it shows sold-out
 * swatches rather than hiding them, so the customer can see the colour exists
 * and pick a different one.
 */
export async function loadProductDetail(
  knex: Knex,
  handle: string
): Promise<Omit<ProductDetail, "filament" | "compatibility"> | null> {
  const currency = commerceConfig.currency.toLowerCase();

  const productResult = await knex.raw(
    `SELECT id, handle, title, subtitle, description, thumbnail, metadata, created_at, updated_at
     FROM product WHERE handle = :handle AND deleted_at IS NULL AND status = 'published' LIMIT 1`,
    { handle }
  );
  const product = productResult.rows?.[0];
  if (!product) return null;

  const [variantResult, imageResult, categoryResult] = await Promise.all([
    knex.raw(
      `WITH ${VARIANT_SOURCE_CTE}
       SELECT * FROM variant_source
       WHERE product_id = :productId
       ORDER BY variant_rank ASC NULLS LAST, variant_title ASC`,
      { currency, productId: product.id }
    ),
    knex.raw(
      `SELECT id, url, rank, metadata FROM image
       WHERE product_id = :productId AND deleted_at IS NULL
       ORDER BY rank ASC`,
      { productId: product.id }
    ),
    knex.raw(
      `SELECT pc.id, pc.name, pc.handle, pc.parent_category_id
       FROM product_category_product pcp
       JOIN product_category pc ON pc.id = pcp.product_category_id AND pc.deleted_at IS NULL
       WHERE pcp.product_id = :productId
       ORDER BY pc.rank ASC`,
      { productId: product.id }
    ),
  ]);

  const variantRows = (variantResult.rows ?? []) as any[];
  if (variantRows.length === 0) return null;

  const first = variantRows[0];
  const currencyCode = (first.currency_code ?? currency).toUpperCase();

  const images: ProductImage[] = (imageResult.rows ?? []).map((row: any) => ({
    id: row.id,
    url: row.url,
    alt: (row.metadata?.alt as string) ?? null,
    rank: row.rank ?? 0,
  }));

  const variants: ProductVariantSummary[] = variantRows.map((row) => {
    const amount = row.effective_amount === null ? null : Number(row.effective_amount);
    const price = amount === null ? null : { amount, currencyCode };

    const stock = buildStockInfo(Number(row.available_quantity ?? 0), {
      manageInventory: row.manage_inventory !== false,
      allowBackorder: row.allow_backorder === true,
      expectedRestockAt: row.expected_restock_at
        ? new Date(row.expected_restock_at).toISOString()
        : null,
    });

    return {
      id: row.variant_id,
      title: row.variant_title,
      sku: row.variant_sku,
      ean: row.variant_ean,
      price,
      compareAtPrice:
        row.compare_at_amount === null
          ? null
          : { amount: Number(row.compare_at_amount), currencyCode },
      stock,
      // Variant-specific imagery is resolved from the shared gallery by
      // colour name, so a spool photo follows its swatch.
      images: images.filter((image) =>
        row.color_name ? image.url.toLowerCase().includes(slugFragment(row.color_name)) : false
      ),
      active: true,
      weightG: row.net_weight_g ?? null,
      filament: row.color_name
        ? {
            id: `${row.variant_id}-spec`,
            variantId: row.variant_id,
            colorName: row.color_name,
            colorHex: row.color_hex,
            colorHexSecondary: row.color_hex_secondary,
            manufacturerColorCode: null,
            colorFamily: (row.color_family as ColorFamily | null) ?? null,
            diameterMm: row.diameter_mm === null ? null : Number(row.diameter_mm),
            netFilamentWeightG: row.net_weight_g,
            expectedRestockAt: row.expected_restock_at
              ? new Date(row.expected_restock_at).toISOString()
              : null,
          }
        : null,
      pricePerKg: price ? calculatePricePerKg(price, row.net_weight_g) : null,
    };
  });

  const stockStatuses = variants.map((variant) => variant.stock.status);
  const prices = variants
    .map((variant) => variant.price?.amount)
    .filter((amount): amount is number => amount !== undefined && amount !== null);
  const compareAtPrices = variants
    .map((variant) => variant.compareAtPrice?.amount)
    .filter((amount): amount is number => amount !== undefined && amount !== null);

  const cheapest = variants
    .filter((variant) => variant.price !== null)
    .sort((a, b) => (a.price!.amount ?? 0) - (b.price!.amount ?? 0))[0];

  const createdAt = new Date(product.created_at);

  return {
    id: product.id,
    handle: product.handle,
    title: product.title,
    subtitle: product.subtitle ?? null,
    description: product.description ?? null,
    thumbnail: product.thumbnail ?? images[0]?.url ?? null,
    kind:
      (product.metadata?.kind as ProductDetail["kind"]) ?? (first.material ? "filament" : "other"),
    brand: first.brand_id
      ? {
          id: first.brand_id,
          name: first.brand_name ?? "",
          handle: first.brand_handle ?? "",
          logoUrl: first.brand_logo_url ?? null,
          description: null,
          rank: 0,
        }
      : null,
    categories: (categoryResult.rows ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      handle: row.handle,
      parentId: row.parent_category_id ?? null,
    })),
    priceFrom: prices.length > 0 ? { amount: Math.min(...prices), currencyCode } : null,
    compareAtPriceFrom:
      compareAtPrices.length > 0 ? { amount: Math.max(...compareAtPrices), currencyCode } : null,
    pricePerKgFrom: cheapest?.pricePerKg ?? null,
    stock: aggregateStockStatus(stockStatuses),
    variantCount: variants.length,
    swatches: variants
      .filter((variant) => variant.filament?.colorName)
      .map((variant) => ({
        variantId: variant.id,
        name: variant.filament!.colorName!,
        hex: variant.filament!.colorHex,
        hexSecondary: variant.filament!.colorHexSecondary,
        family: variant.filament!.colorFamily,
        stock: variant.stock.status,
      })),
    averageRating: null,
    reviewCount: 0,
    isNew: Date.now() - createdAt.getTime() < 45 * 24 * 60 * 60 * 1000,
    onSale: compareAtPrices.length > 0,
    material: (first.material as ProductDetail["material"]) ?? null,
    finish: (first.finish as ProductDetail["finish"]) ?? null,
    images,
    variants,
    relatedProductIds: [],
    createdAt: createdAt.toISOString(),
    updatedAt: new Date(product.updated_at ?? product.created_at).toISOString(),
  };
}

/** Stock for a set of variants, used by the cart to re-validate before checkout. */
export async function loadVariantStock(
  knex: Knex,
  variantIds: string[]
): Promise<Map<string, ReturnType<typeof resolveStockStatus>>> {
  const result = new Map<string, ReturnType<typeof resolveStockStatus>>();
  if (variantIds.length === 0) return result;

  const rows = await knex.raw(
    `SELECT v.id, v.manage_inventory, v.allow_backorder,
            COALESCE(SUM(GREATEST(il.stocked_quantity - il.reserved_quantity, 0)), 0) AS available
     FROM product_variant v
     LEFT JOIN product_variant_inventory_item pvii
       ON pvii.variant_id = v.id AND pvii.deleted_at IS NULL
     LEFT JOIN inventory_level il
       ON il.inventory_item_id = pvii.inventory_item_id AND il.deleted_at IS NULL
     WHERE v.id = ANY(:ids) AND v.deleted_at IS NULL
     GROUP BY v.id, v.manage_inventory, v.allow_backorder`,
    { ids: variantIds }
  );

  for (const row of rows.rows ?? []) {
    result.set(
      row.id,
      resolveStockStatus(Number(row.available ?? 0), {
        manageInventory: row.manage_inventory !== false,
        allowBackorder: row.allow_backorder === true,
      })
    );
  }
  return result;
}

const slugFragment = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
