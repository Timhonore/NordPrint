import type { MetadataRoute } from "next";
import { siteConfig } from "@nordprint/config";

/**
 * robots.txt
 *
 * Staging and preview deployments are disallowed wholesale: an unlisted
 * environment that gets indexed competes with the real shop, and the fix
 * afterwards is slow.
 */
export default function robots(): MetadataRoute.Robots {
  const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

  if (!allowIndexing) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/kurv",
          "/checkout",
          "/ordre/",
          "/konto",
          "/soeg",
          // Filtered catalogue views are noindex; keeping crawlers out of the
          // combinatorial explosion saves the budget for real pages.
          "/*?*material=",
          "/*?*brand=",
          "/*?*color=",
          "/*?*pris_min=",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
