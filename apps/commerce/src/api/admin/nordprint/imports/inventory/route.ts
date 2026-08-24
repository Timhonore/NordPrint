import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import type { IInventoryService, IPricingModuleService } from "@medusajs/framework/types";
import { clampInventoryQuantity } from "@nordprint/commerce";
import { commerceConfig } from "@nordprint/config";
import {
  buildImportPreview,
  parseInventoryCsv,
  type ExistingVariant,
} from "../../../../../lib/import/inventory-csv";
import { PROCUREMENT_MODULE } from "../../../../../modules/procurement";
import type ProcurementModuleService from "../../../../../modules/procurement/service";

/**
 * POST /admin/nordprint/imports/inventory
 *
 * Body: `{ csv: string, commit?: boolean }`
 *
 * With `commit: false` (the default) this only validates and returns the
 * preview — "129 varer fundet, 118 opdateres, 8 uændrede, 3 fejl".
 *
 * With `commit: true` the changes are applied. If *any* row fails validation
 * nothing is written: a half-applied stock import is worse than no import,
 * because nobody can tell which half landed.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const body = (req.body ?? {}) as { csv?: string; commit?: boolean; force?: boolean };

  if (typeof body.csv !== "string" || body.csv.trim().length === 0) {
    res.status(400).json({ message: "Ingen CSV-data modtaget" });
    return;
  }

  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const procurement = req.scope.resolve<ProcurementModuleService>(PROCUREMENT_MODULE);

  const { rows, errors } = parseInventoryCsv(body.csv);
  const existing = await loadExistingVariants(
    knex,
    procurement,
    rows.map((row) => row.sku)
  );

  const preview = buildImportPreview(rows, errors, existing);

  if (!body.commit) {
    res.json({ committed: false, ...preview });
    return;
  }

  // No partial silent failures: refuse the whole import unless the operator
  // explicitly forces it after seeing the errors.
  if (preview.errors.length > 0 && !body.force) {
    res.status(422).json({
      committed: false,
      message:
        `Importen blev afvist: ${preview.errors.length} rækker har fejl. ` +
        "Ret filen, eller send force=true for at importere de gyldige rækker.",
      ...preview,
    });
    return;
  }

  const inventoryService = req.scope.resolve<IInventoryService>(Modules.INVENTORY);
  const pricingService = req.scope.resolve<IPricingModuleService>(Modules.PRICING);
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);

  const applied: string[] = [];
  const failed: { sku: string; message: string }[] = [];

  for (const change of preview.changes) {
    try {
      for (const field of change.changes) {
        switch (field.field) {
          case "stock":
            await setStock(
              knex,
              inventoryService,
              change.variantId,
              clampInventoryQuantity(Number(field.to))
            );
            break;
          case "cost_price":
            await procurement.setCost({
              variantId: change.variantId,
              costPrice: Number(field.to),
              currencyCode: commerceConfig.currency.toLowerCase(),
            });
            break;
          case "sale_price":
            await setSalePrice(knex, pricingService, change.variantId, Number(field.to));
            break;
          case "ean":
            await knex("product_variant")
              .where({ id: change.variantId })
              .update({ ean: field.to === null ? null : String(field.to) });
            break;
        }
      }
      applied.push(change.sku);
    } catch (error) {
      failed.push({
        sku: change.sku,
        message: error instanceof Error ? error.message : "Ukendt fejl",
      });
    }
  }

  logger.info(
    `[import] Lagerimport: ${applied.length} opdateret, ${failed.length} fejlede, ` +
      `${preview.unchanged} uændrede (bruger ${req.auth_context?.actor_id ?? "ukendt"})`
  );

  res.status(failed.length > 0 ? 207 : 200).json({
    committed: true,
    applied: applied.length,
    failed,
    ...preview,
  });
}

/** Reads the current state of every SKU in the file, in three queries. */
async function loadExistingVariants(
  knex: any,
  procurement: ProcurementModuleService,
  skus: string[]
): Promise<Map<string, ExistingVariant>> {
  const result = new Map<string, ExistingVariant>();
  if (skus.length === 0) return result;

  const rows = await knex.raw(
    `SELECT
       v.id AS variant_id, v.sku, v.ean, p.title AS product_title,
       COALESCE(SUM(GREATEST(il.stocked_quantity - il.reserved_quantity, 0)), 0) AS stock,
       -- Medusa stores decimals in the major unit; the importer works in
       -- minor units, so normalise here.
       ROUND(MIN(pr.amount) * 100) AS sale_price
     FROM product_variant v
     JOIN product p ON p.id = v.product_id AND p.deleted_at IS NULL
     LEFT JOIN product_variant_inventory_item pvii
       ON pvii.variant_id = v.id AND pvii.deleted_at IS NULL
     LEFT JOIN inventory_level il
       ON il.inventory_item_id = pvii.inventory_item_id AND il.deleted_at IS NULL
     LEFT JOIN product_variant_price_set pvps
       ON pvps.variant_id = v.id AND pvps.deleted_at IS NULL
     LEFT JOIN price pr
       ON pr.price_set_id = pvps.price_set_id AND pr.deleted_at IS NULL
       AND pr.price_list_id IS NULL AND pr.currency_code = :currency AND pr.rules_count = 0
     WHERE v.sku = ANY(:skus) AND v.deleted_at IS NULL
     GROUP BY v.id, v.sku, v.ean, p.title`,
    { skus, currency: commerceConfig.currency.toLowerCase() }
  );

  const variantIds = (rows.rows ?? []).map((row: any) => row.variant_id);
  const costs = await procurement.getCostMap(variantIds);

  for (const row of rows.rows ?? []) {
    result.set(row.sku, {
      variantId: row.variant_id,
      sku: row.sku,
      ean: row.ean ?? null,
      productTitle: row.product_title,
      stock: row.stock === null ? null : Number(row.stock),
      costPrice: costs.get(row.variant_id) ?? null,
      salePrice: row.sale_price === null ? null : Number(row.sale_price),
    });
  }

  return result;
}

async function setStock(
  knex: any,
  inventoryService: IInventoryService,
  variantId: string,
  quantity: number
): Promise<void> {
  const rows = await knex.raw(
    `SELECT il.inventory_item_id, il.location_id
     FROM product_variant_inventory_item pvii
     JOIN inventory_level il
       ON il.inventory_item_id = pvii.inventory_item_id AND il.deleted_at IS NULL
     WHERE pvii.variant_id = :variantId AND pvii.deleted_at IS NULL
     LIMIT 1`,
    { variantId }
  );

  const level = rows.rows?.[0];
  if (!level) {
    throw new Error("Varianten har ingen lagerlokation — opret den først i admin");
  }

  // A level is addressed by inventory item + location, not by its own id.
  await inventoryService.updateInventoryLevels([
    {
      inventory_item_id: level.inventory_item_id,
      location_id: level.location_id,
      stocked_quantity: quantity,
    } as never,
  ]);
}

async function setSalePrice(
  knex: any,
  pricingService: IPricingModuleService,
  variantId: string,
  amountMinor: number
): Promise<void> {
  const rows = await knex.raw(
    `SELECT pvps.price_set_id, pr.id AS price_id
     FROM product_variant_price_set pvps
     LEFT JOIN price pr ON pr.price_set_id = pvps.price_set_id AND pr.deleted_at IS NULL
       AND pr.price_list_id IS NULL AND pr.currency_code = :currency AND pr.rules_count = 0
     WHERE pvps.variant_id = :variantId AND pvps.deleted_at IS NULL
     LIMIT 1`,
    { variantId, currency: commerceConfig.currency.toLowerCase() }
  );

  const priceSetId: string | undefined = rows.rows?.[0]?.price_set_id;
  if (!priceSetId) {
    throw new Error("Varianten har intet prissæt — opret prisen i admin først");
  }

  // Go through the pricing module rather than writing the row directly: it
  // owns the raw_amount bookkeeping that keeps decimal precision exact.
  await pricingService.updatePriceSets(priceSetId, {
    prices: [
      {
        currency_code: commerceConfig.currency.toLowerCase(),
        // Medusa expects the major unit; the CSV gave us minor units.
        amount: amountMinor / 100,
      },
    ],
  } as never);
}
