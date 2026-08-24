import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { commerceConfig } from "@nordprint/config";

/**
 * Daily low-stock report.
 *
 * Runs on the worker at 07:00 and writes a structured log line per variant
 * that has fallen to or below the "kun få tilbage" threshold. Structured
 * rather than prose so the log pipeline can alert on it without parsing
 * Danish.
 *
 * This is deliberately a log, not an e-mail: whoever needs it should get it
 * through the same channel as everything else they monitor.
 */
export default async function lowStockReport(container: MedusaContainer): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION);

  const rows = await knex.raw(
    `SELECT
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
     HAVING COALESCE(SUM(GREATEST(il.stocked_quantity - il.reserved_quantity, 0)), 0) <= :threshold
     ORDER BY available ASC, p.title ASC`,
    { threshold: commerceConfig.stock.lowStockAtOrBelow }
  );

  const items = (rows.rows ?? []) as {
    sku: string | null;
    product_title: string;
    variant_title: string;
    available: number;
  }[];

  if (items.length === 0) {
    logger.info("[lager] Ingen varer under grænsen.");
    return;
  }

  const soldOut = items.filter((item) => item.available === 0).length;

  logger.warn(
    JSON.stringify({
      event: "low_stock_report",
      threshold: commerceConfig.stock.lowStockAtOrBelow,
      total: items.length,
      soldOut,
      items: items.slice(0, 50).map((item) => ({
        sku: item.sku,
        product: item.product_title,
        variant: item.variant_title,
        available: item.available,
      })),
    })
  );
}

export const config = {
  name: "nordprint-low-stock-report",
  // 07:00 every day — before the warehouse starts picking.
  schedule: "0 7 * * *",
};
