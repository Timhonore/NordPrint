import type { ColorFamily } from "./filament";
import type { ProductSummary } from "./catalog";

/**
 * "Find filament" guided selector.
 *
 * The engine is rule based today. The interface is intentionally engine
 * agnostic so an AI-backed recommender can be dropped in later without
 * touching the wizard UI or the routes.
 */

export const PRINT_INTENTS = [
  "decoration",
  "prototypes",
  "functional",
  "outdoor",
  "flexible",
  "heat_resistant",
  "very_strong",
  "beginner",
] as const;
export type PrintIntent = (typeof PRINT_INTENTS)[number];

export const PRINT_INTENT_LABELS: Record<PrintIntent, string> = {
  decoration: "Dekoration",
  prototypes: "Prototyper",
  functional: "Funktionelle dele",
  outdoor: "Udendørs",
  flexible: "Fleksible dele",
  heat_resistant: "Varmebestandige dele",
  very_strong: "Meget stærke dele",
  beginner: "Begynderprojekter",
};

export const PRIORITIES = [
  "easy_to_print",
  "strength",
  "flexibility",
  "finish",
  "heat_resistance",
  "uv_resistance",
  "low_price",
  "high_speed",
] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Record<Priority, string> = {
  easy_to_print: "Nem at printe",
  strength: "Styrke",
  flexibility: "Fleksibilitet",
  finish: "Finish",
  heat_resistance: "Varmebestandighed",
  uv_resistance: "UV-bestandighed",
  low_price: "Lav pris",
  high_speed: "Høj printhastighed",
};

export interface RecommendationInput {
  readonly printerModelId?: string | null;
  readonly intents: readonly PrintIntent[];
  readonly priorities: readonly Priority[];
  readonly colorFamily?: ColorFamily | null;
  readonly limit?: number;
}

export interface RecommendationReason {
  readonly code: string;
  readonly label: string;
  readonly weight: number;
}

export interface Recommendation {
  readonly product: ProductSummary;
  readonly score: number;
  readonly reasons: readonly RecommendationReason[];
  readonly matchedVariantId: string | null;
}

export interface RecommendationResult {
  readonly recommendations: readonly Recommendation[];
  readonly engine: string;
  readonly input: RecommendationInput;
}

/** Implemented by the rule engine today, by an AI engine later. */
export interface RecommendationEngine {
  readonly id: string;
  recommend(
    input: RecommendationInput,
    candidates: readonly ProductSummary[]
  ): Promise<RecommendationResult>;
}
