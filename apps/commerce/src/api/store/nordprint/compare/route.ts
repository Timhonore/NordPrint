import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { commerceConfig } from "@nordprint/config";
import { loadProductDetail } from "../../../../lib/catalog/product-detail";
import { FILAMENT_MODULE } from "../../../../modules/filament";
import type FilamentModuleService from "../../../../modules/filament/service";

/**
 * GET /store/nordprint/compare?handles=a,b,c
 *
 * Side-by-side comparison of up to `maxCompareItems` filaments.
 * The number is configuration, not a literal, so it can be raised without
 * touching the comparison table.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const raw = typeof req.query.handles === "string" ? req.query.handles : "";
  const handles = raw
    .split(",")
    .map((handle) => handle.trim())
    .filter(Boolean)
    .slice(0, commerceConfig.maxCompareItems);

  if (handles.length === 0) {
    res.json({ products: [], max: commerceConfig.maxCompareItems });
    return;
  }

  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const filamentService = req.scope.resolve<FilamentModuleService>(FILAMENT_MODULE);

  const details = await Promise.all(handles.map((handle) => loadProductDetail(knex, handle)));
  const found = details.filter((detail): detail is NonNullable<typeof detail> => detail !== null);

  const specs = await filamentService.listSpecsWithAttributes(found.map((entry) => entry.id));
  const specByProduct = new Map(specs.map((spec) => [spec.productId, spec]));

  res.json({
    max: commerceConfig.maxCompareItems,
    products: found.map((product) => ({
      ...product,
      filament: specByProduct.get(product.id) ?? null,
      compatibility: null,
    })),
  });
}

export const AUTHENTICATE = false;
