import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findShopSection, shopSections } from "@nordprint/config";
import { CatalogView } from "@/components/catalog/catalog-view";
import { CatalogError } from "@/components/catalog/catalog-error";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { catalogMetadata, loadCatalogPage, type SearchParams } from "@/lib/catalog/page-helpers";

/** Subcategories: /reservedele/dyser, /tilbehoer/opbevaring, … */

export function generateStaticParams(): { slug: string; underkategori: string }[] {
  return shopSections.flatMap((section) =>
    section.subsections.map((subsection) => ({
      slug: section.slug,
      underkategori: subsection.slug,
    }))
  );
}

type Params = Promise<{ slug: string; underkategori: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { slug, underkategori } = await params;
  const section = findShopSection(slug);
  const subsection = section?.subsections.find((entry) => entry.slug === underkategori);
  if (!section || !subsection) return {};

  const { query } = await loadCatalogPage(searchParams);
  return catalogMetadata({
    title: `${subsection.title} — ${section.title}`,
    description: subsection.description,
    basePath: `/${section.slug}/${subsection.slug}`,
    query,
  });
}

export default async function SubsectionPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const { slug, underkategori } = await params;
  const section = findShopSection(slug);
  const subsection = section?.subsections.find((entry) => entry.slug === underkategori);

  if (!section || !subsection) notFound();

  const { query, result, failed } = await loadCatalogPage(searchParams, {
    categoryHandle: subsection.categoryHandle,
  });

  if (failed) return <CatalogError />;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: section.title, href: `/${section.slug}` },
          { label: subsection.title, href: `/${section.slug}/${subsection.slug}` },
        ]}
      />
      <CatalogView
        result={result}
        query={query}
        basePath={`/${section.slug}/${subsection.slug}`}
        title={subsection.title}
        description={subsection.description}
      />
    </>
  );
}
