import { MedusaService } from "@medusajs/framework/utils";
import type { GuideDetail, GuideSummary } from "@nordprint/types";
import { Guide } from "./models";

/** Average adult reading speed for technical Danish prose. */
const WORDS_PER_MINUTE = 200;

class GuideModuleService extends MedusaService({ Guide }) {
  async listPublished(limit = 24, offset = 0): Promise<GuideSummary[]> {
    const guides = await this.listGuides(
      { published_at: { $ne: null, $lte: new Date() } },
      { order: { rank: "ASC", published_at: "DESC" }, take: limit, skip: offset }
    );
    return guides.map(toSummary);
  }

  async retrieveBySlug(slug: string): Promise<GuideDetail | null> {
    const [guide] = await this.listGuides({ slug });
    if (!guide) return null;
    // Unpublished guides are invisible to the storefront; the admin preview
    // route fetches them through a separate, authenticated path.
    if (!guide.published_at || new Date(guide.published_at) > new Date()) return null;
    return toDetail(guide);
  }

  /** Guides related to a product — shown under "Guides" on the product page. */
  async listForProduct(productId: string, limit = 3): Promise<GuideSummary[]> {
    const guides = await this.listGuides(
      { published_at: { $ne: null, $lte: new Date() } },
      { order: { rank: "ASC" } }
    );
    return guides
      .filter((guide) => asStringArray(guide.related_product_ids).includes(productId))
      .slice(0, limit)
      .map(toSummary);
  }
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function readingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

function toSummary(guide: any): GuideSummary {
  return {
    id: guide.id,
    slug: guide.slug,
    title: guide.title,
    intro: guide.intro,
    heroImageUrl: guide.hero_image_url ?? null,
    heroImageAlt: guide.hero_image_alt ?? null,
    readingMinutes: readingMinutes(guide.content ?? ""),
    tags: asStringArray(guide.tags),
    publishedAt: guide.published_at ? new Date(guide.published_at).toISOString() : null,
    updatedAt: new Date(guide.updated_at ?? Date.now()).toISOString(),
  };
}

function toDetail(guide: any): GuideDetail {
  return {
    ...toSummary(guide),
    content: guide.content ?? "",
    seoTitle: guide.seo_title ?? null,
    seoDescription: guide.seo_description ?? null,
    relatedProductIds: asStringArray(guide.related_product_ids),
    relatedGuideSlugs: asStringArray(guide.related_guide_slugs),
    author: guide.author ?? null,
  };
}

export default GuideModuleService;
