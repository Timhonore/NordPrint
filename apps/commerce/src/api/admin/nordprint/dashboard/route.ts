import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { commerceConfig } from "@nordprint/config";
import { ORDER_TOTAL_MINOR } from "../../../../lib/sql/order-total";

/**
 * GET /admin/nordprint/dashboard
 *
 * The NordPrint overview in the admin.
 *
 * Every number is a real aggregate over the operational tables. There are no
 * placeholder metrics and no sample data: a dashboard that invents numbers is
 * worse than no dashboard, because people make purchasing decisions on it.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const currency = commerceConfig.currency.toLowerCase();
  const lowStockAt = commerceConfig.stock.lowStockAtOrBelow;

  const [today, topProducts, lowStock, recentOrders, needsAction] = await Promise.all([
    knex.raw(
      /* sql */ `
      SELECT
        COALESCE(SUM(${ORDER_TOTAL_MINOR}), 0)::bigint AS revenue,
        COUNT(*)::int                                                 AS order_count
      FROM "order" o
      JOIN order_summary os ON os.order_id = o.id AND os.deleted_at IS NULL
      WHERE o.deleted_at IS NULL
        AND o.status <> 'canceled'
        AND o.currency_code = :currency
        AND o.created_at >= date_trunc('day', NOW())
    `,
      { currency }
    ),

    knex.raw(/* sql */ `
      SELECT
        oli.product_id,
        MAX(oli.product_title)      AS title,
        SUM(oi.quantity)::int       AS units,
        ROUND(SUM(oi.quantity * oli.unit_price) * 100)::bigint AS revenue
      FROM order_item oi
      JOIN order_line_item oli ON oli.id = oi.item_id AND oli.deleted_at IS NULL
      JOIN "order" o ON o.id = oi.order_id AND o.deleted_at IS NULL AND o.status <> 'canceled'
      WHERE oi.deleted_at IS NULL
        AND o.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY oli.product_id
      ORDER BY units DESC
      LIMIT 8
    `),

    knex.raw(
      /* sql */ `
      SELECT
        v.id AS variant_id, v.sku, v.title AS variant_title,
        p.title AS product_title, p.handle,
        COALESCE(SUM(GREATEST(il.stocked_quantity - il.reserved_quantity, 0)), 0)::int AS available
      FROM product_variant v
      JOIN product p ON p.id = v.product_id AND p.deleted_at IS NULL AND p.status = 'published'
      LEFT JOIN product_variant_inventory_item pvii
        ON pvii.variant_id = v.id AND pvii.deleted_at IS NULL
      LEFT JOIN inventory_level il
        ON il.inventory_item_id = pvii.inventory_item_id AND il.deleted_at IS NULL
      WHERE v.deleted_at IS NULL AND v.manage_inventory = TRUE
      GROUP BY v.id, v.sku, v.title, p.title, p.handle
      HAVING COALESCE(SUM(GREATEST(il.stocked_quantity - il.reserved_quantity, 0)), 0) <= :lowStockAt
      ORDER BY available ASC, p.title ASC
      LIMIT 25
    `,
      { lowStockAt }
    ),

    knex.raw(/* sql */ `
      SELECT
        o.id, o.display_id, o.email, o.created_at, o.status, o.currency_code,
        ${ORDER_TOTAL_MINOR} AS total
      FROM "order" o
      JOIN order_summary os ON os.order_id = o.id AND os.deleted_at IS NULL
      WHERE o.deleted_at IS NULL
      ORDER BY o.created_at DESC
      LIMIT 10
    `),

    knex.raw(/* sql */ `
      SELECT COUNT(*)::int AS count
      FROM "order" o
      WHERE o.deleted_at IS NULL
        AND o.status = 'pending'
        AND o.created_at <= NOW() - INTERVAL '24 hours'
    `),
  ]);

  const todayRow = today.rows?.[0] ?? { revenue: 0, order_count: 0 };
  const revenue = Number(todayRow.revenue ?? 0);
  const orderCount = Number(todayRow.order_count ?? 0);

  const pendingReviews = await knex.raw(
    `SELECT COUNT(*)::int AS count FROM product_review
     WHERE deleted_at IS NULL AND status = 'pending'`
  );

  res.json({
    currency: commerceConfig.currency,
    today: {
      revenue,
      orderCount,
      // Guard against dividing by zero on a quiet morning.
      averageOrderValue: orderCount > 0 ? Math.round(revenue / orderCount) : 0,
    },
    lowStockCount: (lowStock.rows ?? []).length,
    topProducts: (topProducts.rows ?? []).map((row: any) => ({
      productId: row.product_id,
      title: row.title,
      units: Number(row.units),
      revenue: Number(row.revenue),
    })),
    lowStock: (lowStock.rows ?? []).map((row: any) => ({
      variantId: row.variant_id,
      sku: row.sku,
      productTitle: row.product_title,
      variantTitle: row.variant_title,
      handle: row.handle,
      available: Number(row.available),
    })),
    recentOrders: (recentOrders.rows ?? []).map((row: any) => ({
      id: row.id,
      displayId: row.display_id,
      email: row.email,
      status: row.status,
      total: Number(row.total),
      currencyCode: row.currency_code?.toUpperCase() ?? commerceConfig.currency,
      createdAt: new Date(row.created_at).toISOString(),
    })),
    needsAction: {
      staleOrders: Number(needsAction.rows?.[0]?.count ?? 0),
      pendingReviews: Number(pendingReviews.rows?.[0]?.count ?? 0),
    },
  });
}
