import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { calculateMargin, formatMoney, money } from "@nordprint/commerce";
import { commerceConfig } from "@nordprint/config";
import { PROCUREMENT_MODULE } from "../../../../modules/procurement";
import type ProcurementModuleService from "../../../../modules/procurement/service";

/**
 * GET /admin/nordprint/margins
 *
 * Salgspris, indkøbspris, dækningsbidrag og margin pr. variant.
 *
 * This route is under `/admin`, which Medusa authenticates — cost price is
 * never reachable from `/store`, and no storefront DTO carries it. That
 * separation is the whole reason cost lives in its own module.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const procurement = req.scope.resolve<ProcurementModuleService>(PROCUREMENT_MODULE);

  const limit = Math.min(200, Number(req.query.limit ?? 50) || 50);
  const offset = Math.max(0, Number(req.query.offset ?? 0) || 0);
  const search = typeof req.query.q === "string" ? `%${req.query.q.toLowerCase()}%` : null;

  const rows = await knex.raw(
    /* sql */ `
    SELECT
      v.id AS variant_id, v.sku, v.title AS variant_title,
      p.id AS product_id, p.title AS product_title, p.handle,
      ROUND(MIN(pr.amount) * 100)::bigint AS sale_price,
      COUNT(*) OVER ()::int AS total_count
    FROM product_variant v
    JOIN product p ON p.id = v.product_id AND p.deleted_at IS NULL
    LEFT JOIN product_variant_price_set pvps
      ON pvps.variant_id = v.id AND pvps.deleted_at IS NULL
    LEFT JOIN price pr
      ON pr.price_set_id = pvps.price_set_id AND pr.deleted_at IS NULL
      AND pr.price_list_id IS NULL AND pr.currency_code = :currency AND pr.rules_count = 0
    WHERE v.deleted_at IS NULL
      AND (:search::text IS NULL OR LOWER(p.title) LIKE :search OR LOWER(COALESCE(v.sku, '')) LIKE :search)
    GROUP BY v.id, v.sku, v.title, p.id, p.title, p.handle
    ORDER BY p.title ASC, v.variant_rank ASC NULLS LAST
    LIMIT :limit OFFSET :offset
  `,
    { currency: commerceConfig.currency.toLowerCase(), search, limit, offset }
  );

  const variants = (rows.rows ?? []) as any[];
  const costs = await procurement.getCostMap(variants.map((row) => row.variant_id));
  const currency = commerceConfig.currency;

  const items = variants.map((row) => {
    const salePrice = row.sale_price === null ? null : Number(row.sale_price);
    const costPrice = costs.get(row.variant_id) ?? null;

    const breakdown =
      salePrice !== null && costPrice !== null
        ? calculateMargin(money(salePrice, currency), money(costPrice, currency))
        : null;

    return {
      variantId: row.variant_id,
      sku: row.sku,
      productId: row.product_id,
      productTitle: row.product_title,
      variantTitle: row.variant_title,
      handle: row.handle,
      salePrice,
      costPrice,
      contribution: breakdown?.contribution.amount ?? null,
      marginPercent: breakdown?.marginPercent ?? null,
      markupPercent: breakdown?.markupPercent ?? null,
      // Pre-formatted for the admin table, so the widget cannot format
      // Danish currency differently from the storefront.
      formatted: breakdown
        ? {
            salePrice: formatMoney(breakdown.salePrice),
            costPrice: formatMoney(breakdown.costPrice),
            contribution: formatMoney(breakdown.contribution),
            margin: `${breakdown.marginPercent} %`,
          }
        : null,
    };
  });

  res.json({
    items,
    count: variants[0]?.total_count ?? 0,
    limit,
    offset,
    currency,
    missingCostPrice: items.filter((item) => item.costPrice === null).length,
  });
}

/** PUT /admin/nordprint/margins — sets the cost price for one variant. */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const body = (req.body ?? {}) as {
    variantId?: string;
    costPrice?: number;
    supplierName?: string | null;
    supplierSku?: string | null;
  };

  if (!body.variantId || typeof body.costPrice !== "number") {
    res.status(400).json({ message: "variantId og costPrice er påkrævet" });
    return;
  }

  const procurement = req.scope.resolve<ProcurementModuleService>(PROCUREMENT_MODULE);

  try {
    await procurement.setCost({
      variantId: body.variantId,
      costPrice: body.costPrice,
      currencyCode: commerceConfig.currency.toLowerCase(),
      supplierName: body.supplierName ?? null,
      supplierSku: body.supplierSku ?? null,
    });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Ugyldig pris" });
    return;
  }

  res.json({ ok: true });
}
