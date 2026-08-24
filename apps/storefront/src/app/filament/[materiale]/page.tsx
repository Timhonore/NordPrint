import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { filamentSections, findFilamentSection } from "@nordprint/config";
import { CatalogView } from "@/components/catalog/catalog-view";
import { CatalogError } from "@/components/catalog/catalog-error";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { catalogMetadata, loadCatalogPage, type SearchParams } from "@/lib/catalog/page-helpers";

/**
 * Material pages: /filament/pla, /filament/petg, …
 *
 * These are the pages people actually link to and search for, so they get a
 * real URL and their own description rather than living as a query string on
 * /filament.
 */

export function generateStaticParams(): { materiale: string }[] {
  return filamentSections.map((section) => ({ materiale: section.slug }));
}

type Params = Promise<{ materiale: string }>;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { materiale } = await params;
  const section = findFilamentSection(materiale);
  if (!section) return {};

  const { query } = await loadCatalogPage(searchParams);
  return catalogMetadata({
    title: `${section.title} filament`,
    description: section.description,
    basePath: `/filament/${section.slug}`,
    query,
  });
}

export default async function MaterialPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const { materiale } = await params;
  const section = findFilamentSection(materiale);
  if (!section) notFound();

  const { query, result, failed } = await loadCatalogPage(searchParams, {
    categoryHandle: section.categoryHandle,
  });

  if (failed) return <CatalogError />;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Filament", href: "/filament" },
          { label: section.title, href: `/filament/${section.slug}` },
        ]}
      />
      <CatalogView
        result={result}
        query={query}
        basePath={`/filament/${section.slug}`}
        title={`${section.title} filament`}
        description={section.description}
      />
    </>
  );
}
