import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brand, findShopSection, shopSections, siteConfig } from "@nordprint/config";
import { SectionView } from "@/components/catalog/section-view";
import { CatalogError } from "@/components/catalog/catalog-error";
import { InfoPageView } from "@/components/info/info-page-view";
import { findInfoPage, infoPages } from "@/lib/content/info-pages";
import { catalogMetadata, loadCatalogPage, type SearchParams } from "@/lib/catalog/page-helpers";

/**
 * The root-level slugs: shop sections (/reservedele, /tilbehoer, /vaerktoej,
 * /3d-printere) and information pages (/kontakt, /levering, /privatliv, …).
 *
 * Next allows only one dynamic segment at a given level, so both live here
 * and the route dispatches on which registry owns the slug. Everything else
 * — the catalogue itself, the info page layout — sits in its own component;
 * this file only decides *which*.
 *
 * A slug in neither registry is a 404. That check is what stops a dynamic
 * root segment from turning every typo into a blank shop page.
 */

export function generateStaticParams(): { slug: string }[] {
  return [
    ...shopSections.map((section) => ({ slug: section.slug })),
    ...infoPages.map((page) => ({ slug: page.slug })),
  ];
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { slug } = await params;

  const info = findInfoPage(slug);
  if (info) {
    return {
      title: info.title,
      description: info.description,
      alternates: { canonical: `/${info.slug}` },
      openGraph: {
        title: `${info.title} | ${brand.name}`,
        description: info.description,
        url: `${siteConfig.url}/${info.slug}`,
        type: "article",
      },
    };
  }

  const section = findShopSection(slug);
  if (!section) return {};

  const { query } = await loadCatalogPage(searchParams);
  return catalogMetadata({
    title: section.title,
    description: section.description,
    basePath: `/${section.slug}`,
    query,
  });
}

export default async function RootSlugPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const { slug } = await params;

  const info = findInfoPage(slug);
  if (info) return <InfoPageView page={info} />;

  const section = findShopSection(slug);
  if (!section) notFound();

  const { query, result, failed } = await loadCatalogPage(searchParams, {
    ...(section.kind ? { kind: section.kind } : {}),
    ...(section.categoryHandle ? { categoryHandle: section.categoryHandle } : {}),
  });

  if (failed) return <CatalogError />;

  return <SectionView section={section} result={result} query={query} />;
}
