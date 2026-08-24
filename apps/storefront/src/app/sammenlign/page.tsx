import type { Metadata } from "next";
import { commerceConfig } from "@nordprint/config";
import { TechLabel } from "@nordprint/ui";
import { fetchComparison } from "@/lib/api/catalog";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ComparisonTable } from "@/components/compare/comparison-table";
import { ComparePicker } from "@/components/compare/compare-picker";

export const metadata: Metadata = {
  title: "Sammenlign filament",
  description:
    "Stil op til fire filamenter side om side: pris pr. kg, temperaturer, tørring, egenskaber og AMS-kompatibilitet.",
  alternates: { canonical: "/sammenlign" },
};

export const dynamic = "force-dynamic";

/**
 * Comparison.
 *
 * The list of handles lives in the URL, so a comparison can be shared and
 * bookmarked. `ComparePicker` syncs it with the customer's locally stored
 * selections, which is what the "Sammenlign" toggle on a product card writes
 * to.
 */
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.JSX.Element> {
  const params = await searchParams;
  const raw = Array.isArray(params.produkter) ? params.produkter[0] : params.produkter;

  const handles = (raw ?? "")
    .split(",")
    .map((handle) => handle.trim())
    .filter(Boolean)
    .slice(0, commerceConfig.maxCompareItems);

  const products = handles.length > 0 ? await fetchComparison(handles) : [];

  return (
    <>
      <Breadcrumbs items={[{ label: "Sammenlign", href: "/sammenlign" }]} />

      <div className="container-page py-8 md:py-12">
        <TechLabel>Side om side</TechLabel>
        <h1 className="mb-2 mt-1.5 text-3xl font-bold tracking-tight md:text-4xl">
          Sammenlign filament
        </h1>
        <p className="mb-8 max-w-2xl text-ink-soft">
          Op til {commerceConfig.maxCompareItems} produkter ad gangen. Værdier, der er ens på tværs,
          tones ned — så er det forskellene, der springer i øjnene.
        </p>

        <ComparePicker handles={handles} />

        {products.length > 0 ? <ComparisonTable products={products} className="mt-8" /> : null}
      </div>
    </>
  );
}
