/** Guides — NordPrint as a knowledge platform, not only a shop. */

export interface GuideSummary {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly intro: string;
  readonly heroImageUrl: string | null;
  readonly heroImageAlt: string | null;
  readonly readingMinutes: number;
  readonly tags: readonly string[];
  readonly publishedAt: string | null;
  readonly updatedAt: string;
}

export interface GuideDetail extends GuideSummary {
  /** Markdown. Rendered server-side and sanitised. */
  readonly content: string;
  readonly seoTitle: string | null;
  readonly seoDescription: string | null;
  readonly relatedProductIds: readonly string[];
  readonly relatedGuideSlugs: readonly string[];
  readonly author: string | null;
}

export interface Review {
  readonly id: string;
  readonly productId: string;
  readonly customerId: string | null;
  readonly authorName: string;
  readonly rating: 1 | 2 | 3 | 4 | 5;
  readonly title: string | null;
  readonly body: string;
  readonly verifiedPurchase: boolean;
  readonly status: ReviewStatus;
  readonly createdAt: string;
}

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface ReviewSummary {
  readonly average: number | null;
  readonly count: number;
  readonly distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}
