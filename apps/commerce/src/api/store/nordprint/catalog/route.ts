import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { parseProductQuery } from "@nordprint/commerce";
import { resolveSearchProvider } from "../../../../lib/search";
import { attachReviewSummaries } from "../../../../lib/catalog/enrich";

/**
 * GET /store/nordprint/catalog
 *
 * The catalogue endpoint behind /produkter and every category page.
 * Filtering, sorting, pagination and facet counts all happen in PostgreSQL —
 * the query string maps 1:1 onto the URL the customer sees, so a shared link
 * reproduces exactly the same result set.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const provider = resolveSearchProvider(req.scope);
  const query = parseProductQuery(req.query as Record<string, string | string[] | undefined>);

  const result = await provider.search(query);
  const items = await attachReviewSummaries(req.scope, result.items);

  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300");
  res.json({ ...result, items });
}

/** Public: the catalogue is readable without a customer session. */
export const AUTHENTICATE = false;
