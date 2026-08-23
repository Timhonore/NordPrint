import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { COMPATIBILITY_MODULE } from "../../../../modules/compatibility";
import type CompatibilityModuleService from "../../../../modules/compatibility/service";
import { PRINTER_MODULE } from "../../../../modules/printer";
import type PrinterModuleService from "../../../../modules/printer/service";

/**
 * GET /store/nordprint/compatibility?printer=…&products=a,b,c
 *
 * Batch verdicts for a product listing, so the badge on 24 cards costs one
 * request rather than 24.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const printerModelId = typeof req.query.printer === "string" ? req.query.printer : null;
  const productIds = String(req.query.products ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 100);

  if (!printerModelId || productIds.length === 0) {
    res.json({ verdicts: {} });
    return;
  }

  const printerService = req.scope.resolve<PrinterModuleService>(PRINTER_MODULE);
  const compatibilityService =
    req.scope.resolve<CompatibilityModuleService>(COMPATIBILITY_MODULE);

  const printer = await printerService.retrieveModelWithLineage(printerModelId);
  const verdicts = await compatibilityService.resolveForManySubjects(productIds, printer);

  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=120, stale-while-revalidate=600");
  res.json({
    printerName: printer?.displayName ?? null,
    verdicts: Object.fromEntries(verdicts),
  });
}

export const AUTHENTICATE = false;
