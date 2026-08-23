import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { resolveSearchProvider } from "../../../../lib/search";

/**
 * GET /store/nordprint/search?q=…
 *
 * Autocomplete for the header search. Returns products, matching categories
 * and guides so a customer typing "tørring" lands on the drying guide rather
 * than an empty product list.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const term = typeof req.query.q === "string" ? req.query.q : "";
  const limit = Math.min(20, Number(req.query.limit ?? 8) || 8);

  if (term.trim().length < 2) {
    res.json({ products: [], categories: [], guides: [], query: term });
    return;
  }

  const provider = resolveSearchProvider(req.scope);
  const result = await provider.suggest(term, limit);

  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=30, stale-while-revalidate=120");
  res.json(result);
}

export const AUTHENTICATE = false;
