import type { MedusaContainer } from "@medusajs/framework/types";
import type { ProductSummary } from "@nordprint/types";
import { REVIEW_MODULE } from "../../modules/review";
import type ReviewModuleService from "../../modules/review/service";

/**
 * Attaches approved-review summaries to a page of products.
 *
 * One query for the whole page. Star ratings on product cards are exactly the
 * kind of feature that quietly becomes an N+1 and turns a 60 ms listing into a
 * 600 ms one.
 */
export async function attachReviewSummaries(
  scope: MedusaContainer,
  products: readonly ProductSummary[]
): Promise<ProductSummary[]> {
  if (products.length === 0) return [];

  const reviewService = scope.resolve<ReviewModuleService>(REVIEW_MODULE);
  const summaries = await reviewService.summarize(products.map((product) => product.id));

  return products.map((product) => {
    const summary = summaries.get(product.id);
    if (!summary) return product as ProductSummary;
    return { ...product, averageRating: summary.average, reviewCount: summary.count };
  });
}
