import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { commerceConfig, loadUsps } from "@nordprint/config";

/**
 * GET /store/nordprint/settings
 *
 * The shop's configurable promises and thresholds, served to the storefront so
 * the two never disagree about when fri fragt kicks in or what "kun få
 * tilbage" means.
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse): Promise<void> {
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=900");
  res.json({
    usps: loadUsps(),
    currency: commerceConfig.currency,
    freeShippingThreshold: commerceConfig.shipping.freeShippingThreshold,
    stockThresholds: commerceConfig.stock,
    maxCompareItems: commerceConfig.maxCompareItems,
    productsPerPage: commerceConfig.productsPerPage,
  });
}

export const AUTHENTICATE = false;
