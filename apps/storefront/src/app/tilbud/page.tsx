import type { Metadata } from "next";
import { CatalogView } from "@/components/catalog/catalog-view";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CatalogError } from "@/components/catalog/catalog-error";
import { catalogMetadata, loadCatalogPage, type SearchParams } from "@/lib/catalog/page-helpers";

const TITLE = "Tilbud";
const DESCRIPTION =
  "Nedsatte varer med ægte førpris — den pris, varen faktisk har kostet, ikke en opskrevet vejledende pris.";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { query } = await loadCatalogPage(searchParams, { defaults: { onSale: true } });
  return catalogMetadata({ title: TITLE, description: DESCRIPTION, basePath: "/tilbud", query });
}

export default async function OffersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  // The offer filter is fixed for this route, not something the customer can
  // switch off — that is what makes it a different page rather than a filter.
  const { query, result, failed } = await loadCatalogPage(searchParams, {
    defaults: { onSale: true },
  });

  if (failed) return <CatalogError />;

  return (
    <>
      <Breadcrumbs items={[{ label: "Tilbud", href: "/tilbud" }]} />
      <CatalogView
        result={{ ...result, items: result.items }}
        query={{ ...query, onSale: true }}
        basePath="/tilbud"
        title={TITLE}
        description={DESCRIPTION}
      />
    </>
  );
}
