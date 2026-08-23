import { MedusaService } from "@medusajs/framework/utils";
import type { ReviewSummary } from "@nordprint/types";
import { ProductReview } from "./models";

class ReviewModuleService extends MedusaService({ ProductReview }) {
  /** Only approved reviews are ever returned to the storefront. */
  async listPublished(productId: string, limit = 20, offset = 0) {
    return this.listProductReviews(
      { product_id: productId, status: "approved" },
      { order: { created_at: "DESC" }, take: limit, skip: offset }
    );
  }

  /**
   * Rating summaries for a set of products, in one query.
   * Used by product cards, so it must not be per-product.
   */
  async summarize(productIds: string[]): Promise<Map<string, ReviewSummary>> {
    const result = new Map<string, ReviewSummary>();
    if (productIds.length === 0) return result;

    const reviews = await this.listProductReviews({
      product_id: productIds,
      status: "approved",
    });

    const grouped = new Map<string, number[]>();
    for (const review of reviews) {
      const list = grouped.get(review.product_id) ?? [];
      list.push(review.rating);
      grouped.set(review.product_id, list);
    }

    for (const productId of productIds) {
      const ratings = grouped.get(productId) ?? [];
      const distribution: ReviewSummary["distribution"] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const rating of ratings) {
        const bucket = Math.min(5, Math.max(1, Math.round(rating))) as 1 | 2 | 3 | 4 | 5;
        distribution[bucket] += 1;
      }
      result.set(productId, {
        average:
          ratings.length > 0
            ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10
            : null,
        count: ratings.length,
        distribution,
      });
    }

    return result;
  }

  /**
   * Submits a review. Always lands in moderation; `verified_purchase` is set
   * by the caller from a verified order, never from client input.
   */
  async submit(input: {
    productId: string;
    variantId?: string | null;
    customerId?: string | null;
    orderId?: string | null;
    authorName: string;
    authorEmail?: string | null;
    rating: number;
    title?: string | null;
    body: string;
  }) {
    const rating = Math.round(input.rating);
    if (rating < 1 || rating > 5) {
      throw new Error("Bedømmelsen skal være mellem 1 og 5 stjerner");
    }
    if (input.body.trim().length < 10) {
      throw new Error("Skriv gerne lidt mere — mindst 10 tegn");
    }

    return this.createProductReviews({
      product_id: input.productId,
      variant_id: input.variantId ?? null,
      customer_id: input.customerId ?? null,
      order_id: input.orderId ?? null,
      author_name: input.authorName.trim().slice(0, 80),
      author_email: input.authorEmail ?? null,
      rating,
      title: input.title?.trim().slice(0, 120) ?? null,
      body: input.body.trim().slice(0, 4000),
      verified_purchase: Boolean(input.orderId),
      status: "pending",
    } as any);
  }

  async moderate(
    id: string,
    status: "approved" | "rejected",
    moderatedBy: string,
    note?: string | null
  ) {
    return this.updateProductReviews({
      id,
      status,
      moderated_by: moderatedBy,
      moderated_at: new Date(),
      moderation_note: note ?? null,
    } as any);
  }
}

export default ReviewModuleService;
