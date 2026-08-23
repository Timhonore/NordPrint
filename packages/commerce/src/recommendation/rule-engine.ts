import type {
  ProductSummary,
  Recommendation,
  RecommendationEngine,
  RecommendationInput,
  RecommendationReason,
  RecommendationResult,
} from "@nordprint/types";
import { MATERIAL_PROFILES, PRIORITY_WEIGHTS, materialProfile } from "./rules";

const DEFAULT_LIMIT = 6;
const MIN_RESULTS = 3;

/**
 * Rule-based recommendation engine for `/find-filament`.
 *
 * Scoring is transparent on purpose: every point awarded produces a
 * `RecommendationReason` that the UI renders as "Derfor anbefaler vi den".
 * A recommendation the customer cannot understand is a recommendation they
 * will not trust.
 *
 * Swapping this for an AI engine means implementing `RecommendationEngine`
 * and registering it — nothing else in the system changes.
 */
export class RuleBasedRecommendationEngine implements RecommendationEngine {
  readonly id = "rule-engine-v1";

  async recommend(
    input: RecommendationInput,
    candidates: readonly ProductSummary[]
  ): Promise<RecommendationResult> {
    const limit = input.limit ?? DEFAULT_LIMIT;

    const scored = candidates
      .map((product) => this.scoreProduct(product, input))
      .filter((entry): entry is Recommendation => entry !== null)
      .sort(
        (a, b) =>
          // Availability outranks score: recommending a spool the customer
          // cannot buy today is a worse answer than a slightly weaker match.
          availabilityRank(a) - availabilityRank(b) ||
          b.score - a.score ||
          a.product.title.localeCompare(b.product.title, "da-DK")
      );

    // Never return a single lonely suggestion: if the filters were too strict
    // we widen to the best-scoring products rather than showing an empty state.
    const primary = scored.filter((entry) => entry.score > 0);
    const recommendations = (primary.length >= MIN_RESULTS ? primary : scored).slice(0, limit);

    return { recommendations, engine: this.id, input };
  }

  private scoreProduct(
    product: ProductSummary,
    input: RecommendationInput
  ): Recommendation | null {
    if (product.kind !== "filament" || product.material === null) return null;

    const profile = materialProfile(product.material);
    if (!profile) return null;

    const reasons: RecommendationReason[] = [];
    let score = 0;

    // 1. Intent match — what the customer wants to print.
    for (const intent of input.intents) {
      const weight = profile.intents[intent];
      if (weight) {
        score += weight * 2;
        reasons.push({
          code: `intent:${intent}`,
          label: `Godt valg til ${INTENT_PHRASES[intent] ?? intent}`,
          weight: weight * 2,
        });
      }
    }

    // 2. Priority match — what matters most to them.
    for (const priority of input.priorities) {
      const rule = PRIORITY_WEIGHTS[priority];
      if (rule.rating) {
        const rating = profile.ratings[rule.rating];
        // Only rating 4-5 counts as a genuine selling point.
        if (rating >= 4) {
          const points = rule.weight * (rating - 3);
          score += points;
          reasons.push({ code: `priority:${priority}`, label: rule.label, weight: points });
        } else if (rating <= 2) {
          score -= rule.weight;
        }
        continue;
      }

      if (priority === "low_price") {
        const points = (5 - profile.priceLevel) * 1.5;
        score += points;
        if (profile.priceLevel <= 2) {
          reasons.push({ code: "priority:low_price", label: rule.label, weight: points });
        }
      }

      if (priority === "high_speed" && product.finish === "high-speed") {
        score += rule.weight;
        reasons.push({ code: "priority:high_speed", label: "High Speed-formel", weight: rule.weight });
      }

      if (priority === "finish" && (product.finish === "matte" || product.finish === "silk")) {
        score += rule.weight;
        reasons.push({ code: "priority:finish", label: "Flot overflade", weight: rule.weight });
      }
    }

    // 3. Colour preference — a soft signal, never a hard filter.
    let matchedVariantId: string | null = null;
    if (input.colorFamily) {
      const swatch = product.swatches.find((entry) => entry.family === input.colorFamily);
      if (swatch) {
        matchedVariantId = swatch.variantId;
        const inStock = swatch.stock !== "out_of_stock";
        score += inStock ? 4 : 1;
        if (inStock) {
          reasons.push({
            code: "color",
            label: `Findes i ${swatch.name.toLowerCase()}`,
            weight: 4,
          });
        }
      }
    }

    // 4. Availability — recommending an out-of-stock spool wastes a click.
    if (product.stock === "out_of_stock") score -= 6;
    else if (product.stock === "in_stock") score += 1;

    // 5. Social proof.
    if (product.averageRating !== null && product.reviewCount >= 3 && product.averageRating >= 4) {
      score += 2;
      reasons.push({
        code: "rating",
        label: `${product.averageRating.toFixed(1)}/5 fra ${product.reviewCount} anmeldelser`,
        weight: 2,
      });
    }

    // 6. Enclosure penalty when we know the customer's printer is open.
    if (profile.requiresEnclosure && input.printerModelId) {
      reasons.push({
        code: "enclosure",
        label: "Anbefales med lukket kabinet",
        weight: 0,
      });
    }

    return {
      product,
      score: Math.round(score * 100) / 100,
      reasons: dedupeReasons(reasons),
      matchedVariantId,
    };
  }
}

/** 0 = can be bought now, 1 = sold out. */
function availabilityRank(entry: Recommendation): number {
  return entry.product.stock === "out_of_stock" ? 1 : 0;
}

const INTENT_PHRASES: Partial<Record<RecommendationInput["intents"][number], string>> = {
  decoration: "dekoration",
  prototypes: "prototyper",
  functional: "funktionelle dele",
  outdoor: "udendørs brug",
  flexible: "fleksible dele",
  heat_resistant: "varmebestandige dele",
  very_strong: "meget stærke dele",
  beginner: "begynderprojekter",
};

function dedupeReasons(reasons: readonly RecommendationReason[]): RecommendationReason[] {
  const seen = new Map<string, RecommendationReason>();
  for (const reason of reasons) {
    const existing = seen.get(reason.code);
    if (!existing || reason.weight > existing.weight) seen.set(reason.code, reason);
  }
  return [...seen.values()].sort((a, b) => b.weight - a.weight);
}

/**
 * Materials that answer a given set of intents — used to pre-filter the
 * catalogue query before scoring, so we never load the full catalogue.
 */
export function materialsForIntents(
  intents: readonly RecommendationInput["intents"][number][]
): string[] {
  if (intents.length === 0) return MATERIAL_PROFILES.map((profile) => profile.material);
  const matched = MATERIAL_PROFILES.filter((profile) =>
    intents.some((intent) => (profile.intents[intent] ?? 0) > 0)
  );
  return (matched.length > 0 ? matched : MATERIAL_PROFILES).map((profile) => profile.material);
}

export const ruleBasedRecommendationEngine = new RuleBasedRecommendationEngine();
