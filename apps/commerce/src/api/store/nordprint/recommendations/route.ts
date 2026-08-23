import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type {
  ColorFamily,
  FilamentMaterial,
  PrintIntent,
  Priority,
  RecommendationInput,
} from "@nordprint/types";
import { COLOR_FAMILIES, PRINT_INTENTS, PRIORITIES } from "@nordprint/types";
import { materialsForIntents, ruleBasedRecommendationEngine } from "@nordprint/commerce";
import { resolveSearchProvider } from "../../../../lib/search";
import { attachReviewSummaries } from "../../../../lib/catalog/enrich";
import { PRINTER_MODULE } from "../../../../modules/printer";
import type PrinterModuleService from "../../../../modules/printer/service";

/**
 * POST /store/nordprint/recommendations
 *
 * The engine behind /find-filament.
 *
 * The candidate set is narrowed in SQL first (materials that can answer the
 * customer's intents, in stock, for their printer if they told us) and only
 * then scored in memory. That keeps the wizard fast at any catalogue size and
 * keeps the scoring readable.
 *
 * The engine is swappable: `RecommendationEngine` is an interface, and an
 * AI-backed implementation can replace the rule engine here without the
 * wizard, the routes or the response shape changing.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const body = (req.body ?? {}) as Record<string, unknown>;

  const intents = asEnumArray(body.intents, PRINT_INTENTS) as PrintIntent[];
  const priorities = asEnumArray(body.priorities, PRIORITIES) as Priority[];
  const colorFamily = asEnum(body.colorFamily, COLOR_FAMILIES) as ColorFamily | null;
  const printerModelId = typeof body.printerModelId === "string" ? body.printerModelId : null;
  const limit = Math.min(12, Math.max(1, Number(body.limit ?? 6) || 6));

  const input: RecommendationInput = {
    intents,
    priorities,
    colorFamily,
    printerModelId,
    limit,
  };

  const provider = resolveSearchProvider(req.scope);

  // Narrow before scoring: only materials that plausibly answer the intents.
  const candidateMaterials = materialsForIntents(intents) as FilamentMaterial[];

  const candidates = await provider.search({
    material: candidateMaterials,
    inStockOnly: true,
    ...(printerModelId ? { printerModelId } : {}),
    sort: "popular",
    page: 1,
    // A generous candidate pool: scoring is cheap, a bad shortlist is not.
    limit: 60,
  });

  // A printer filter that eliminates everything is worse than no filter: fall
  // back to the unfiltered catalogue rather than showing "ingen resultater".
  const pool =
    candidates.items.length > 0
      ? candidates.items
      : (await provider.search({ material: candidateMaterials, inStockOnly: true, limit: 60 }))
          .items;

  const result = await ruleBasedRecommendationEngine.recommend(input, pool);
  const enriched = await attachReviewSummaries(
    req.scope,
    result.recommendations.map((entry) => entry.product)
  );
  const byId = new Map(enriched.map((product) => [product.id, product]));

  let printerName: string | null = null;
  if (printerModelId) {
    const printerService = req.scope.resolve<PrinterModuleService>(PRINTER_MODULE);
    const printer = await printerService.retrieveModelWithLineage(printerModelId);
    printerName = printer?.displayName ?? null;
  }

  res.json({
    engine: result.engine,
    printerName,
    recommendations: result.recommendations.map((entry) => ({
      ...entry,
      product: byId.get(entry.product.id) ?? entry.product,
    })),
  });
}

function asEnumArray(value: unknown, allowed: readonly string[]): string[] {
  if (!Array.isArray(value)) return [];
  const set = new Set(allowed);
  return value.filter((entry): entry is string => typeof entry === "string" && set.has(entry));
}

function asEnum(value: unknown, allowed: readonly string[]): string | null {
  return typeof value === "string" && allowed.includes(value) ? value : null;
}

export const AUTHENTICATE = false;
