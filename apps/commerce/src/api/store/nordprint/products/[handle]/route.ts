import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { CompatibilityVerdict } from "@nordprint/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { loadProductDetail } from "../../../../../lib/catalog/product-detail";
import { FILAMENT_MODULE } from "../../../../../modules/filament";
import type FilamentModuleService from "../../../../../modules/filament/service";
import { PRINTER_MODULE } from "../../../../../modules/printer";
import type PrinterModuleService from "../../../../../modules/printer/service";
import { COMPATIBILITY_MODULE } from "../../../../../modules/compatibility";
import type CompatibilityModuleService from "../../../../../modules/compatibility/service";
import { REVIEW_MODULE } from "../../../../../modules/review";
import type ReviewModuleService from "../../../../../modules/review/service";

/**
 * GET /store/nordprint/products/:handle
 *
 * Everything the product page needs in one request: variants with colours,
 * prices and live stock, the filament specification with its typed
 * attributes, review summary and — when the customer has told us which
 * printer they own — a compatibility verdict.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const handle = req.params.handle;
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);

  const product = await loadProductDetail(knex, handle);
  if (!product) {
    res.status(404).json({ message: `Produktet "${handle}" findes ikke` });
    return;
  }

  const filamentService = req.scope.resolve<FilamentModuleService>(FILAMENT_MODULE);
  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE);

  const [filament, reviewSummaries] = await Promise.all([
    filamentService.retrieveSpecByProduct(product.id),
    reviewService.summarize([product.id]),
  ]);

  const printerModelId =
    typeof req.query.printer === "string" && req.query.printer.length > 0
      ? req.query.printer
      : null;

  let compatibility: CompatibilityVerdict | null = null;
  if (printerModelId) {
    const printerService = req.scope.resolve<PrinterModuleService>(PRINTER_MODULE);
    const compatibilityService =
      req.scope.resolve<CompatibilityModuleService>(COMPATIBILITY_MODULE);

    const printer = await printerService.retrieveModelWithLineage(printerModelId);
    compatibility = await compatibilityService.resolveForSubjects(
      // Variant-level rules win over product-level ones for things like a
      // 0.4 mm nozzle where only some sizes fit.
      [product.id, ...product.variants.map((variant) => variant.id)],
      printer
    );
  }

  const summary = reviewSummaries.get(product.id);

  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  res.json({
    product: {
      ...product,
      filament,
      compatibility,
      averageRating: summary?.average ?? null,
      reviewCount: summary?.count ?? 0,
    },
  });
}

export const AUTHENTICATE = false;
