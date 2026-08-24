import type { Metadata } from "next";
import { CatalogView } from "@/components/catalog/catalog-view";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CatalogError } from "@/components/catalog/catalog-error";
import { catalogMetadata, loadCatalogPage, type SearchParams } from "@/lib/catalog/page-helpers";

const TITLE = "Filament";
const DESCRIPTION =
  "PLA, PETG, ASA, TPU og teknisk filament. Filtrér på materiale, farve, diameter og spolevægt — og se prisen pr. kg, før du vælger.";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { query } = await loadCatalogPage(searchParams);
  return catalogMetadata({ title: TITLE, description: DESCRIPTION, basePath: "/filament", query });
}

export default async function FilamentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const { query, result, failed } = await loadCatalogPage(searchParams, { kind: "filament" });

  if (failed) return <CatalogError />;

  return (
    <>
      <Breadcrumbs items={[{ label: "Filament", href: "/filament" }]} />
      <CatalogView
        result={result}
        query={query}
        basePath="/filament"
        title={TITLE}
        description={DESCRIPTION}
      />
    </>
  );
}
