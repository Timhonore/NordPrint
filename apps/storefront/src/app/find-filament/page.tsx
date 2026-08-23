import type { Metadata } from "next";
import { brand, siteConfig } from "@nordprint/config";
import { TechLabel } from "@nordprint/ui";
import { fetchPrinters } from "@/lib/api/catalog";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { FilamentWizard } from "@/components/find-filament/filament-wizard";

const TITLE = "Find dit filament";
const DESCRIPTION =
  "Fire spørgsmål om din printer, hvad du skal printe, og hvad der er vigtigst — så foreslår vi det filament, der passer, og fortæller hvorfor.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/find-filament" },
  openGraph: {
    title: `${TITLE} | ${brand.name}`,
    description: DESCRIPTION,
    url: `${siteConfig.url}/find-filament`,
    type: "website",
  },
};

export const revalidate = 600;

export default async function FindFilamentPage(): Promise<React.JSX.Element> {
  const printers = await fetchPrinters();

  return (
    <>
      <Breadcrumbs items={[{ label: "Find filament", href: "/find-filament" }]} />

      <div className="border-b border-line bg-surface">
        <div className="container-page py-10 md:py-14">
          <TechLabel>Guidet valg</TechLabel>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">
            {TITLE}
          </h1>
          <p className="mt-3 max-w-xl text-lg leading-relaxed text-ink-soft">
            Svar på fire spørgsmål. Vi anbefaler ud fra materialets egenskaber, din printer
            og hvad der rent faktisk er på lager — og vi skriver altid hvorfor.
          </p>
        </div>
      </div>

      <div className="container-page py-10 md:py-14">
        <FilamentWizard printerBrands={printers.brands} />
      </div>
    </>
  );
}
