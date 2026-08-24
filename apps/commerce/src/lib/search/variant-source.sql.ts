/**
 * The one SQL view every catalogue read is built on.
 *
 * It flattens a sellable variant together with everything the storefront needs
 * to filter, sort and render it: effective price, før-pris, available stock,
 * filament specification, colour and brand. Keeping it in a single CTE means
 * the product list, the facets and the "find filament" candidate query all
 * agree on what a price and a stock level are — and it keeps the whole
 * catalogue page to two round trips instead of an N+1 per card.
 *
 * Prices follow Medusa's model: the default price (no price list) is the
 * regular price, and an active `sale` price list overrides it. When a sale is
 * active the default price becomes the før-pris — which is exactly what Danish
 * marketing law expects a "førpris" to be.
 */
export const VARIANT_SOURCE_CTE = /* sql */ `
  variant_source AS (
    SELECT
      p.id                        AS product_id,
      p.handle                    AS product_handle,
      p.title                     AS product_title,
      p.subtitle                  AS product_subtitle,
      p.thumbnail                 AS product_thumbnail,
      p.created_at                AS product_created_at,
      p.metadata                  AS product_metadata,

      v.id                        AS variant_id,
      v.title                     AS variant_title,
      v.sku                       AS variant_sku,
      v.ean                       AS variant_ean,
      v.manage_inventory          AS manage_inventory,
      v.allow_backorder           AS allow_backorder,
      v.variant_rank              AS variant_rank,

      b.id                        AS brand_id,
      b.name                      AS brand_name,
      b.handle                    AS brand_handle,
      b.logo_url                  AS brand_logo_url,

      fs.id                       AS spec_id,
      fs.material                 AS material,
      fs.material_variant         AS material_variant,
      fs.finish                   AS finish,
      fs.diameter_mm              AS spec_diameter_mm,
      fs.net_filament_weight_g    AS spec_weight_g,
      fs.ams_compatible           AS ams_compatible,
      fs.ams_lite_compatible      AS ams_lite_compatible,
      fs.abrasive                 AS abrasive,
      fs.hardened_nozzle_recommended AS hardened_nozzle_recommended,
      fs.enclosure_recommended    AS enclosure_recommended,

      fvs.color_name              AS color_name,
      fvs.color_hex               AS color_hex,
      fvs.color_hex_secondary     AS color_hex_secondary,
      fvs.color_family            AS color_family,
      fvs.expected_restock_at     AS expected_restock_at,
      COALESCE(fvs.diameter_mm, fs.diameter_mm)                   AS diameter_mm,
      COALESCE(fvs.net_filament_weight_g, fs.net_filament_weight_g) AS net_weight_g,

      -- Medusa stores prices as decimals in the major unit (189.00), while
      -- NordPrint passes money around as minor units (18900). The conversion
      -- happens here, once, so no call site has to remember it.
      ROUND(base_price.amount * 100)::bigint AS base_amount,
      ROUND(sale_price.amount * 100)::bigint AS sale_amount,
      ROUND(COALESCE(sale_price.amount, base_price.amount) * 100)::bigint AS effective_amount,
      CASE
        WHEN sale_price.amount IS NOT NULL THEN ROUND(base_price.amount * 100)::bigint
      END AS compare_at_amount,
      COALESCE(base_price.currency_code, sale_price.currency_code, 'dkk') AS currency_code,

      COALESCE(stock.available, 0) AS available_quantity

    FROM product p

    INNER JOIN product_variant v
      ON v.product_id = p.id AND v.deleted_at IS NULL

    LEFT JOIN brand_brand_product_product pbl
      ON pbl.product_id = p.id AND pbl.deleted_at IS NULL
    LEFT JOIN brand b
      ON b.id = pbl.brand_id AND b.deleted_at IS NULL

    LEFT JOIN product_product_filament_filament_spec pfl
      ON pfl.product_id = p.id AND pfl.deleted_at IS NULL
    LEFT JOIN filament_spec fs
      ON fs.id = pfl.filament_spec_id AND fs.deleted_at IS NULL

    LEFT JOIN product_product_variant_filament_filament_variant_spec pvfl
      ON pvfl.product_variant_id = v.id AND pvfl.deleted_at IS NULL
    LEFT JOIN filament_variant_spec fvs
      ON fvs.id = pvfl.filament_variant_spec_id AND fvs.deleted_at IS NULL

    LEFT JOIN LATERAL (
      SELECT pr.amount, pr.currency_code
      FROM product_variant_price_set pvps
      JOIN price pr ON pr.price_set_id = pvps.price_set_id AND pr.deleted_at IS NULL
      WHERE pvps.variant_id = v.id
        AND pvps.deleted_at IS NULL
        AND pr.price_list_id IS NULL
        AND pr.currency_code = :currency
        AND pr.rules_count = 0
      ORDER BY pr.amount ASC
      LIMIT 1
    ) base_price ON TRUE

    LEFT JOIN LATERAL (
      SELECT pr.amount, pr.currency_code
      FROM product_variant_price_set pvps
      JOIN price pr ON pr.price_set_id = pvps.price_set_id AND pr.deleted_at IS NULL
      JOIN price_list pl ON pl.id = pr.price_list_id AND pl.deleted_at IS NULL
      WHERE pvps.variant_id = v.id
        AND pvps.deleted_at IS NULL
        AND pr.currency_code = :currency
        AND pl.type = 'sale'
        AND pl.status = 'active'
        AND (pl.starts_at IS NULL OR pl.starts_at <= NOW())
        AND (pl.ends_at IS NULL OR pl.ends_at >= NOW())
      ORDER BY pr.amount ASC
      LIMIT 1
    ) sale_price ON TRUE

    LEFT JOIN LATERAL (
      SELECT SUM(GREATEST(il.stocked_quantity - il.reserved_quantity, 0)) AS available
      FROM product_variant_inventory_item pvii
      JOIN inventory_level il
        ON il.inventory_item_id = pvii.inventory_item_id AND il.deleted_at IS NULL
      WHERE pvii.variant_id = v.id AND pvii.deleted_at IS NULL
    ) stock ON TRUE

    WHERE p.deleted_at IS NULL
      AND p.status = 'published'
  )
`;
