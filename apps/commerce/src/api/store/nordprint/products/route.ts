import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { loadProductDetail } from "../../../../lib/catalog/product-detail";
import { attachReviewSummaries } from "../../../../lib/catalog/enrich";

/**
 * GET /store/nordprint/products?handles=a,b,c
 *
 * Bulk lookup by handle, for lists the customer assembled themselves —
 * favourites, recently viewed, a shared link.
 *
 * Deliberately separate from /compare, which caps at the configured
 * comparison limit: a wishlist of 30 spools is a perfectly normal thing, and
 * borrowing the comparison endpoint would silently truncate it to four.
 */
const MAX_HANDLES = 60;

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const raw = typeof req.query.handles === "string" ? req.query.handles : "";

  const handles = [
    ...new Set(
      raw
        .split(",")
        .map((handle) => handle.trim())
        .filter(Boolean)
    ),
  ].slice(0, MAX_HANDLES);

  if (handles.length === 0) {
    res.json({ products: [] });
    return;
  }

  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);

  const details = await Promise.all(handles.map((handle) => loadProductDetail(knex, handle)));
  const found = details.filter((detail): detail is NonNullable<typeof detail> => detail !== null);

  // Preserve the order the caller asked for — a wishlist is chronological.
  const byHandle = new Map(found.map((product) => [product.handle, product]));
  const ordered = handles
    .map((handle) => byHandle.get(handle))
    .filter((product): product is NonNullable<typeof product> => product !== undefined);

  const enriched = await attachReviewSummaries(req.scope, ordered);

  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  res.json({ products: enriched });
}

export const AUTHENTICATE = false;
