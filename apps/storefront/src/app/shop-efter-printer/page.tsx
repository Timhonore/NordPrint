import type { Metadata } from "next";
import Link from "next/link";
import { brand, siteConfig } from "@nordprint/config";
import { EmptyState, TechLabel } from "@nordprint/ui";
import { fetchPrinters } from "@/lib/api/catalog";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { PrinterShelf } from "@/components/home/printer-shelf";

const TITLE = "Shop efter printer";
const DESCRIPTION =
  "Vælg din maskine, så viser vi filament, dyser, byggeplader og reservedele, vi har registreret som passende — og siger det ligeud, når vi ikke ved det.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/shop-efter-printer" },
  openGraph: {
    title: `${TITLE} | ${brand.name}`,
    description: DESCRIPTION,
    url: `${siteConfig.url}/shop-efter-printer`,
    type: "website",
  },
};

export const revalidate = 600;

export default async function ShopByPrinterPage(): Promise<React.JSX.Element> {
  const printers = await fetchPrinters();

  return (
    <>
      <Breadcrumbs items={[{ label: "Shop efter printer", href: "/shop-efter-printer" }]} />

      <div className="container-page py-10 md:py-14">
        <TechLabel>Kompatibilitet</TechLabel>
        <h1 className="mb-2 mt-1.5 text-3xl font-bold tracking-tight md:text-4xl">{TITLE}</h1>
        <p className="mb-10 max-w-2xl text-lg leading-relaxed text-ink-soft">{DESCRIPTION}</p>

        {printers.brands.length > 0 ? (
          <PrinterShelf brands={printers.brands} />
        ) : (
          <EmptyState
            title="Printerdatabasen kunne ikke hentes"
            description="Prøv igen om et øjeblik."
            action={
              <Link href="/filament" className="font-medium text-accent hover:underline">
                Se alt filament i stedet →
              </Link>
            }
          />
        )}
      </div>
    </>
  );
}
