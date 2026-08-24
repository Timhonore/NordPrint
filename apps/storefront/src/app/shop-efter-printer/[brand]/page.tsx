import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { brand as brandConfig, siteConfig } from "@nordprint/config";
import { Card, CardBody, TechLabel, buttonVariants } from "@nordprint/ui";
import { fetchPrinters } from "@/lib/api/catalog";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export const revalidate = 600;

interface PageProps {
  params: Promise<{ brand: string }>;
}

export async function generateStaticParams(): Promise<{ brand: string }[]> {
  const printers = await fetchPrinters();
  return printers.brands.map((entry) => ({ brand: entry.handle }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brand: handle } = await params;
  const printers = await fetchPrinters();
  const printerBrand = printers.brands.find((entry) => entry.handle === handle);

  if (!printerBrand) {
    return { title: "Producenten findes ikke", robots: { index: false, follow: false } };
  }

  const title = `Tilbehør til ${printerBrand.name}`;
  const description = `Filament, dyser, byggeplader og reservedele til ${printerBrand.name}-printere hos ${brandConfig.name}.`;

  return {
    title,
    description,
    alternates: { canonical: `/shop-efter-printer/${printerBrand.handle}` },
    openGraph: {
      title,
      description,
      url: `${siteConfig.url}/shop-efter-printer/${printerBrand.handle}`,
      type: "website",
    },
  };
}

export default async function PrinterBrandPage({ params }: PageProps): Promise<React.JSX.Element> {
  const { brand: handle } = await params;
  const printers = await fetchPrinters();
  const printerBrand = printers.brands.find((entry) => entry.handle === handle);

  if (!printerBrand) notFound();

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Shop efter printer", href: "/shop-efter-printer" },
          { label: printerBrand.name, href: `/shop-efter-printer/${printerBrand.handle}` },
        ]}
      />

      <div className="container-page py-10 md:py-14">
        <TechLabel>Producent</TechLabel>
        <h1 className="mb-2 mt-1.5 text-3xl font-bold tracking-tight md:text-4xl">
          Tilbehør til {printerBrand.name}
        </h1>
        <p className="mb-10 max-w-2xl text-ink-soft">
          Vælg din model, så filtrerer vi sortimentet efter, hvad vi har registreret som passende
          til netop den.
        </p>

        <div className="space-y-8">
          {printerBrand.families.map((family) => (
            <section key={family.id}>
              <h2 className="mb-3 text-lg font-semibold">{family.name}</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {family.models.map((model) => (
                  <li key={model.id}>
                    <Card className="h-full">
                      <CardBody>
                        <h3 className="font-semibold text-ink">{model.displayName}</h3>

                        <dl className="mt-3 space-y-1 text-sm text-ink-soft">
                          <Row label="Kabinet" value={model.enclosed ? "Lukket" : "Åbent"} />
                          {model.buildVolumeMm ? (
                            <Row
                              label="Byggevolumen"
                              value={`${model.buildVolumeMm.x} × ${model.buildVolumeMm.y} × ${model.buildVolumeMm.z} mm`}
                            />
                          ) : null}
                          {model.maxNozzleTemperature !== null ? (
                            <Row label="Maks. dyse" value={`${model.maxNozzleTemperature} °C`} />
                          ) : null}
                          <Row
                            label="Materialesystem"
                            value={
                              model.supportsAms
                                ? "AMS"
                                : model.supportsAmsLite
                                  ? "AMS Lite"
                                  : "Ingen"
                            }
                          />
                          <Row
                            label="Hærdet dyse"
                            value={model.hardenedNozzleStock ? "Fra fabrikken" : "Tilkøb"}
                          />
                        </dl>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            href={`/filament?printer=${model.id}`}
                            className={buttonVariants({ size: "sm" })}
                          >
                            Filament
                          </Link>
                          <Link
                            href={`/produkter?printer=${model.id}`}
                            className={buttonVariants({ size: "sm", variant: "secondary" })}
                          >
                            Alt tilbehør
                          </Link>
                        </div>
                      </CardBody>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-faint">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
