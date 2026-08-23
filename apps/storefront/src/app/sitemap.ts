import type { MetadataRoute } from "next";
import { siteConfig } from "@nordprint/config";
import { EMPTY_SEARCH_RESULT, fetchCatalog, fetchGuides } from "@/lib/api/catalog";

/**
 * XML sitemap.
 *
 * Only canonical, indexable URLs: static pages, products, guides and the
 * material landing pages. Filtered catalogue views, search results, the cart
 * and the account area are all excluded — they are `noindex`, and listing
 * them here would contradict that.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${siteConfig.url}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteConfig.url}/filament`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteConfig.url}/produkter`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteConfig.url}/tilbud`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${siteConfig.url}/find-filament`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteConfig.url}/sammenlign`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${siteConfig.url}/guides`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${siteConfig.url}/shop-efter-printer`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];

  // A sitemap is a nice-to-have; a failed fetch must not 500 the route.
  const [catalog, guides] = await Promise.all([
    fetchCatalog({ limit: 96, page: 1 }).then((result) =>
      result.ok ? result.data : EMPTY_SEARCH_RESULT
    ),
    fetchGuides(96),
  ]);

  return [
    ...staticPages,
    ...catalog.items.map((product) => ({
      url: `${siteConfig.url}/produkt/${product.handle}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...guides.map((guide) => ({
      url: `${siteConfig.url}/guides/${guide.slug}`,
      lastModified: new Date(guide.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
