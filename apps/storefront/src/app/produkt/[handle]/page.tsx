import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import type { ProductDetail } from "@nordprint/types";
import { MATERIAL_LABELS } from "@nordprint/types";
import { formatMoney } from "@nordprint/commerce";
import { brand, siteConfig } from "@nordprint/config";
import { StarRating, TechLabel } from "@nordprint/ui";
import { fetchProduct } from "@/lib/api/catalog";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPurchasePanel } from "@/components/product/product-purchase-panel";
import { FilamentSpecs } from "@/components/product/filament-specs";
import { ProductReviews } from "@/components/product/product-reviews";
import { RelatedProducts } from "@/components/product/related-products";
import { JsonLd } from "@/lib/seo/json-ld";

/**
 * Product detail page.
 *
 * Server-rendered: the gallery, specifications, description and structured
 * data are all HTML by the time the browser sees them. Only the buy box is a
 * client component, because only the buy box is interactive.
 */
export const revalidate = 60;

interface PageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const product = await fetchProduct(handle);

  if (!product) {
    return { title: "Produktet findes ikke", robots: { index: false, follow: false } };
  }

  const description =
    product.description?.slice(0, 155).replace(/\s+\S*$/, "") ??
    `${product.title} fra ${brand.name}. ${product.subtitle ?? ""}`.trim();

  return {
    title: product.title,
    description,
    // Colour variants share one canonical URL. Indexing eight near-identical
    // colour pages would split the ranking signal between them for no gain.
    alternates: { canonical: `/produkt/${product.handle}` },
    openGraph: {
      type: "website",
      title: product.title,
      description,
      url: `${siteConfig.url}/produkt/${product.handle}`,
      ...(product.thumbnail ? { images: [{ url: product.thumbnail }] } : {}),
    },
  };
}

export default async function ProductPage({
  params,
  searchParams,
}: PageProps): Promise<React.JSX.Element> {
  const { handle } = await params;
  await searchParams;

  // "Min printer" for logged-in customers is set as a cookie by the account
  // area; guests pass it through the compatibility endpoint client-side.
  const cookieStore = await cookies();
  const printerModelId = cookieStore.get("nordprint_printer")?.value ?? null;

  const product = await fetchProduct(handle, printerModelId);
  if (!product) notFound();

  const category = product.categories[0];

  return (
    <>
      <Breadcrumbs
        items={[
          ...(product.kind === "filament"
            ? [{ label: "Filament", href: "/filament" }]
            : [{ label: "Produkter", href: "/produkter" }]),
          ...(category
            ? [{ label: category.name, href: `/produkter?kategori=${category.handle}` }]
            : []),
          { label: product.title, href: `/produkt/${product.handle}` },
        ]}
      />

      <div className="container-page py-8 md:py-12">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <ProductGallery product={product} />

          <div>
            {product.brand ? (
              <Link
                href={`/filament?brand=${product.brand.handle}`}
                className="font-mono text-xs uppercase tracking-[0.14em] text-ink-faint hover:text-accent"
              >
                {product.brand.name}
              </Link>
            ) : null}

            <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              {product.title}
            </h1>

            {product.subtitle ? (
              <p className="mt-2 text-lg text-ink-soft">{product.subtitle}</p>
            ) : null}

            {product.averageRating !== null ? (
              <div className="mt-3">
                <StarRating value={product.averageRating} count={product.reviewCount} />
              </div>
            ) : null}

            <div className="mt-7">
              <ProductPurchasePanel product={product} />
            </div>

            {product.material ? (
              <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line pt-6 text-sm sm:grid-cols-3">
                <Fact label="Materiale" value={MATERIAL_LABELS[product.material]} />
                {product.filament ? (
                  <>
                    <Fact
                      label="Diameter"
                      value={`${String(product.filament.diameterMm).replace(".", ",")} mm`}
                    />
                    <Fact
                      label="Vægt"
                      value={
                        product.filament.netFilamentWeightG % 1000 === 0
                          ? `${product.filament.netFilamentWeightG / 1000} kg`
                          : `${product.filament.netFilamentWeightG} g`
                      }
                    />
                  </>
                ) : null}
              </dl>
            ) : null}
          </div>
        </div>

        {product.description ? (
          <section className="mt-14 max-w-2xl">
            <TechLabel>Om produktet</TechLabel>
            <div className="mt-3 space-y-4 text-[0.9375rem] leading-relaxed text-ink-soft">
              {product.description.split(/\n\n+/).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </section>
        ) : null}

        {product.filament ? (
          <section className="mt-14">
            <h2 className="mb-5 text-xl font-bold tracking-tight">Specifikationer</h2>
            <FilamentSpecs spec={product.filament} compatibility={product.compatibility} />
          </section>
        ) : null}

        <ProductReviews productId={product.id} productHandle={product.handle} className="mt-14" />

        <RelatedProducts product={product} className="mt-16" />
      </div>

      <ProductSchema product={product} />
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div>
      <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}

/**
 * Product + Offer structured data.
 *
 * Variants are emitted as an `AggregateOffer` with a low/high price rather
 * than one `Product` per colour: eight colours of the same spool are one
 * product to a shopper, and Google treats duplicate product entities as
 * competing rather than complementary.
 */
function ProductSchema({ product }: { product: ProductDetail }): React.JSX.Element {
  const prices = product.variants
    .map((variant) => variant.price?.amount)
    .filter((amount): amount is number => typeof amount === "number");

  const currency = product.priceFrom?.currencyCode ?? "DKK";
  const available = product.variants.some((variant) => variant.stock.status !== "out_of_stock");

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${siteConfig.url}/produkt/${product.handle}#product`,
    name: product.title,
    description: product.description ?? product.subtitle ?? undefined,
    sku: product.variants[0]?.sku ?? undefined,
    ...(product.thumbnail ? { image: [product.thumbnail] } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand.name } } : {}),
    ...(product.material ? { material: MATERIAL_LABELS[product.material] } : {}),
    ...(product.averageRating !== null && product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.averageRating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
    ...(prices.length > 0
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: currency,
            lowPrice: (Math.min(...prices) / 100).toFixed(2),
            highPrice: (Math.max(...prices) / 100).toFixed(2),
            offerCount: product.variants.length,
            availability: available
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            url: `${siteConfig.url}/produkt/${product.handle}`,
            seller: { "@type": "Organization", name: brand.name },
          },
        }
      : {}),
  };

  return <JsonLd schema={schema} />;
}

export { formatMoney };
