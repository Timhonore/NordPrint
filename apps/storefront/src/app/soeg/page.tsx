import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@nordprint/ui";
import { CatalogView } from "@/components/catalog/catalog-view";
import { CatalogError } from "@/components/catalog/catalog-error";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { loadCatalogPage, type SearchParams } from "@/lib/catalog/page-helpers";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const params = await searchParams;
  const term = typeof params.q === "string" ? params.q : "";

  return {
    title: term ? `Søgning: ${term}` : "Søg",
    // Search result pages have no business in an index — they are generated
    // by visitors, not by us, and every one of them is thin duplicate content.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const term = typeof params.q === "string" ? params.q.trim() : "";

  const { query, result, failed } = await loadCatalogPage(searchParams);

  if (failed) return <CatalogError />;

  return (
    <>
      <Breadcrumbs items={[{ label: "Søgning", href: "/soeg" }]} />

      <CatalogView
        result={result}
        query={query}
        basePath={`/soeg?q=${encodeURIComponent(term)}`}
        title={term ? `Søgeresultater for “${term}”` : "Søg"}
        description={
          term
            ? `${result.total} ${result.total === 1 ? "produkt matcher" : "produkter matcher"} din søgning.`
            : "Skriv i søgefeltet foroven for at finde produkter."
        }
        emptyAction={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/find-filament" className={buttonVariants({})}>
              Lad os finde det rigtige filament
            </Link>
            <Link href="/produkter" className={buttonVariants({ variant: "secondary" })}>
              Se hele sortimentet
            </Link>
          </div>
        }
      />
    </>
  );
}
