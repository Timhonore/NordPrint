import type { Metadata } from "next";
import { CatalogView } from "@/components/catalog/catalog-view";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CatalogError } from "@/components/catalog/catalog-error";
import { catalogMetadata, loadCatalogPage, type SearchParams } from "@/lib/catalog/page-helpers";

const TITLE = "Alle produkter";
const DESCRIPTION =
  "Hele NordPrints sortiment: filament, printere, reservedele, tilbehør og værktøj.";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { query } = await loadCatalogPage(searchParams);
  return catalogMetadata({
    title: TITLE,
    description: DESCRIPTION,
    basePath: "/produkter",
    query,
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const { query, result, failed } = await loadCatalogPage(searchParams);

  if (failed) return <CatalogError />;

  return (
    <>
      <Breadcrumbs items={[{ label: "Produkter", href: "/produkter" }]} />
      <CatalogView
        result={result}
        query={query}
        basePath="/produkter"
        title={TITLE}
        description={DESCRIPTION}
      />
    </>
  );
}
