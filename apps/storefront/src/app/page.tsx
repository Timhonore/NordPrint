import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { brand } from "@nordprint/config";
import { LinkButton, TechLabel } from "@nordprint/ui";
import { fetchBrands, fetchCatalog, fetchGuides, fetchPrinters } from "@/lib/api/catalog";
import { ProductRail, ProductRailSkeleton } from "@/components/catalog/product-rail";
import { CategoryGrid } from "@/components/home/category-grid";
import { MaterialGrid } from "@/components/home/material-grid";
import { PrinterShelf } from "@/components/home/printer-shelf";
import { BrandStrip } from "@/components/home/brand-strip";
import { UspSection } from "@/components/home/usp-section";
import { GuideRail } from "@/components/home/guide-rail";
import { FindFilamentTeaser } from "@/components/home/find-filament-teaser";
import { NewsletterSection } from "@/components/marketing/newsletter-section";

export const metadata: Metadata = {
  title: `${brand.name} — ${brand.tagline}`,
  description: brand.description,
  alternates: { canonical: "/" },
};

/**
 * The front page.
 *
 * Server-rendered throughout. Each catalogue rail streams in its own Suspense
 * boundary, so the hero and the navigation paint immediately even if one query
 * is slow — the largest contentful paint never waits on "populære filamenter".
 */
export const revalidate = 300;

export default function HomePage(): React.JSX.Element {
  return (
    <>
      <Hero />

      <div className="container-page space-y-20 py-16 md:space-y-24 md:py-20">
        <Section
          eyebrow="Kategorier"
          title="Populære kategorier"
          description="Det, vores kunder køber mest af."
        >
          <CategoryGrid />
        </Section>

        <Suspense fallback={<ProductRailSkeleton title="Populære filamenter" />}>
          <PopularFilaments />
        </Suspense>

        <Suspense fallback={<ProductRailSkeleton title="Nyheder" />}>
          <NewArrivals />
        </Suspense>

        <Suspense fallback={<ProductRailSkeleton title="Tilbud" />}>
          <Offers />
        </Suspense>

        <Section
          eyebrow="Materiale"
          title="Shop efter materiale"
          description="Hvert materiale løser sin opgave. Her er den korte version."
        >
          <MaterialGrid />
        </Section>

        <Suspense fallback={null}>
          <ShopByPrinter />
        </Suspense>

        <Suspense fallback={null}>
          <Brands />
        </Suspense>

        <FindFilamentTeaser />

        <Suspense fallback={null}>
          <Guides />
        </Suspense>
      </div>

      <UspSection />
      <NewsletterSection />
    </>
  );
}

/* ------------------------------------------------------------------ hero */

function Hero(): React.JSX.Element {
  return (
    <section className="relative overflow-hidden border-b border-line bg-surface-inverse text-ink-inverse">
      <div className="grid-plate-inverse absolute inset-0" aria-hidden="true" />
      <div
        className="layer-lines absolute inset-0 opacity-70"
        aria-hidden="true"
      />

      {/* A soft aurora behind the headline: the only glow in the design, and it
          sits behind text rather than under a button. */}
      <div
        aria-hidden="true"
        className="absolute -right-40 -top-40 size-[34rem] rounded-full bg-accent/25 blur-[120px]"
      />

      <div className="container-page relative py-20 md:py-28 lg:py-32">
        <div className="max-w-2xl">
          <TechLabel className="text-white/50">Filament · Udstyr · Reservedele</TechLabel>

          <h1 className="mt-4 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            {brand.tagline}
          </h1>

          <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/70">
            Filament, reservedele og udstyr til din 3D-printer.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="/filament" size="lg" className="bg-white text-ink hover:bg-white/90">
              Shop filament
            </LinkButton>
            <LinkButton
              href="/find-filament"
              size="lg"
              variant="secondary"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
            >
              Find filament til min printer
            </LinkButton>
          </div>

          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-white/10 pt-6">
            {[
              { value: "1-2", label: "hverdages levering" },
              { value: "300+", label: "varer på lager i DK" },
              { value: "14", label: "dages returret" },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="text-2xl font-semibold tabular-nums">{stat.value}</dt>
                <dd className="mt-0.5 text-xs text-white/55">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- sections */

function Section({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <section>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          {eyebrow ? <TechLabel>{eyebrow}</TechLabel> : null}
          <h2 className="mt-1.5 text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
          {description ? <p className="mt-1.5 text-ink-soft">{description}</p> : null}
        </div>
        {action ? (
          <Link
            href={action.href}
            className="shrink-0 text-sm font-medium text-accent hover:underline"
          >
            {action.label} →
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

async function PopularFilaments(): Promise<React.JSX.Element | null> {
  const result = await fetchCatalog({ sort: "popular", limit: 8, material: [] }, { kind: "filament" });
  if (!result.ok || result.data.items.length === 0) return null;

  return (
    <Section
      eyebrow="Bestsellere"
      title="Populære filamenter"
      description="Det, der oftest ryger i kurven."
      action={{ label: "Se alt filament", href: "/filament" }}
    >
      <ProductRail products={result.data.items} />
    </Section>
  );
}

async function NewArrivals(): Promise<React.JSX.Element | null> {
  const result = await fetchCatalog({ sort: "newest", limit: 8 });
  if (!result.ok || result.data.items.length === 0) return null;

  return (
    <Section
      eyebrow="Nyt på lager"
      title="Nyheder"
      description="Senest tilføjet til sortimentet."
      action={{ label: "Se alle produkter", href: "/produkter" }}
    >
      <ProductRail products={result.data.items} />
    </Section>
  );
}

async function Offers(): Promise<React.JSX.Element | null> {
  const result = await fetchCatalog({ onSale: true, limit: 8 });
  // No offers running is a normal state, not an error — render nothing.
  if (!result.ok || result.data.items.length === 0) return null;

  return (
    <Section
      eyebrow="Nedsat"
      title="Tilbud"
      description="Med rigtig førpris — ikke en opskrevet vejledende pris."
      action={{ label: "Se alle tilbud", href: "/tilbud" }}
    >
      <ProductRail products={result.data.items} />
    </Section>
  );
}

async function ShopByPrinter(): Promise<React.JSX.Element | null> {
  const printers = await fetchPrinters();
  if (printers.brands.length === 0) return null;

  return (
    <Section
      eyebrow="Kompatibilitet"
      title="Shop efter printer"
      description="Vælg din maskine, så viser vi kun det, der passer."
      action={{ label: "Alle printere", href: "/shop-efter-printer" }}
    >
      <PrinterShelf brands={printers.brands} />
    </Section>
  );
}

async function Brands(): Promise<React.JSX.Element | null> {
  const brands = await fetchBrands(true);
  if (brands.length === 0) return null;

  return (
    <Section eyebrow="Mærker" title="Populære brands">
      <BrandStrip brands={brands} />
    </Section>
  );
}

async function Guides(): Promise<React.JSX.Element | null> {
  const guides = await fetchGuides(3);
  if (guides.length === 0) return null;

  return (
    <Section
      eyebrow="Vidensbank"
      title="Guides"
      description="Vi printer selv. Her er det, vi har lært."
      action={{ label: "Alle guides", href: "/guides" }}
    >
      <GuideRail guides={guides} />
    </Section>
  );
}
