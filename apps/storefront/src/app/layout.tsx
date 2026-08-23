import type { Metadata, Viewport } from "next";
import { brand, siteConfig } from "@nordprint/config";
import { PreferencesProvider } from "@/lib/preferences/preferences-provider";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CookieConsent } from "@/components/consent/cookie-consent";
import { fetchBrands, fetchPrinters } from "@/lib/api/catalog";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s | ${brand.name}`,
  },
  description: brand.description,
  applicationName: brand.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "da_DK",
    siteName: brand.name,
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.description,
    url: siteConfig.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} — ${brand.tagline}`,
    description: brand.description,
  },
  robots: {
    // Staging and preview deployments must never be indexed.
    index: process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true",
    follow: process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0d1117",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.JSX.Element> {
  // The mega-menu's brand and printer columns come from the backend — nothing
  // brand-specific is hardcoded in the storefront.
  const [brands, printers] = await Promise.all([fetchBrands(), fetchPrinters()]);

  return (
    <html lang="da">
      <body className="min-h-dvh antialiased">
        <a href="#indhold" className="skip-link">
          Spring til indhold
        </a>

        <PreferencesProvider>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader brands={brands} printerBrands={printers.brands} />
            <main id="indhold" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </div>
          <CookieConsent />
        </PreferencesProvider>

        <OrganizationSchema />
      </body>
    </html>
  );
}

/**
 * Organization + WebSite structured data.
 *
 * Rendered once in the layout so every page carries it, and includes the
 * search action so Google can offer a sitelinks search box.
 */
function OrganizationSchema(): React.JSX.Element {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#organization`,
        name: brand.name,
        legalName: brand.legalName,
        url: siteConfig.url,
        description: brand.description,
        email: siteConfig.supportEmail,
        telephone: siteConfig.supportPhone,
        vatID: `DK${siteConfig.cvr}`,
        address: {
          "@type": "PostalAddress",
          streetAddress: siteConfig.address.street,
          postalCode: siteConfig.address.postalCode,
          addressLocality: siteConfig.address.city,
          addressCountry: siteConfig.address.country.toUpperCase(),
        },
        ...(siteConfig.social.length > 0 ? { sameAs: siteConfig.social } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        url: siteConfig.url,
        name: brand.name,
        inLanguage: "da-DK",
        publisher: { "@id": `${siteConfig.url}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${siteConfig.url}/soeg?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // Values come from our own configuration, never from user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
