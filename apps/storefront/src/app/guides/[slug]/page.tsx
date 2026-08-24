import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { brand, siteConfig } from "@nordprint/config";
import { TechLabel } from "@nordprint/ui";
import { fetchGuide, fetchGuides } from "@/lib/api/catalog";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Markdown } from "@/components/content/markdown";
import { JsonLd } from "@/lib/seo/json-ld";

export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = await fetchGuide(slug);

  if (!guide) return { title: "Guiden findes ikke", robots: { index: false, follow: false } };

  const description = guide.seoDescription ?? guide.intro.slice(0, 155);

  return {
    title: guide.seoTitle ?? guide.title,
    description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      type: "article",
      title: guide.seoTitle ?? guide.title,
      description,
      url: `${siteConfig.url}/guides/${guide.slug}`,
      publishedTime: guide.publishedAt ?? undefined,
      modifiedTime: guide.updatedAt,
      ...(guide.heroImageUrl ? { images: [{ url: guide.heroImageUrl }] } : {}),
    },
  };
}

export default async function GuidePage({ params }: PageProps): Promise<React.JSX.Element> {
  const { slug } = await params;
  const guide = await fetchGuide(slug);
  if (!guide) notFound();

  const related = (await fetchGuides(12)).filter(
    (entry) => guide.relatedGuideSlugs.includes(entry.slug) && entry.slug !== guide.slug
  );

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.seoDescription ?? guide.intro,
    inLanguage: "da-DK",
    datePublished: guide.publishedAt ?? undefined,
    dateModified: guide.updatedAt,
    author: { "@type": "Organization", name: guide.author ?? brand.name },
    publisher: { "@id": `${siteConfig.url}/#organization` },
    mainEntityOfPage: `${siteConfig.url}/guides/${guide.slug}`,
    ...(guide.heroImageUrl ? { image: [guide.heroImageUrl] } : {}),
  };

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Guides", href: "/guides" },
          { label: guide.title, href: `/guides/${guide.slug}` },
        ]}
      />

      <article className="container-page max-w-3xl py-10 md:py-14">
        <header>
          <TechLabel>
            {guide.readingMinutes} min læsning
            {guide.publishedAt
              ? ` · ${new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", year: "numeric" }).format(new Date(guide.publishedAt))}`
              : ""}
          </TechLabel>

          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
            {guide.title}
          </h1>

          <p className="mt-4 text-lg leading-relaxed text-ink-soft">{guide.intro}</p>
        </header>

        {guide.heroImageUrl ? (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-xl border border-line bg-canvas">
            <Image
              src={guide.heroImageUrl}
              alt={guide.heroImageAlt ?? ""}
              fill
              sizes="(min-width: 768px) 48rem, 100vw"
              priority
              className="object-cover"
            />
          </div>
        ) : null}

        <Markdown content={guide.content} className="mt-10" />

        {guide.tags.length > 0 ? (
          <ul className="mt-10 flex flex-wrap gap-2 border-t border-line pt-6">
            {guide.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        {related.length > 0 ? (
          <aside className="mt-10 border-t border-line pt-6">
            <TechLabel>Læs også</TechLabel>
            <ul className="mt-3 space-y-2">
              {related.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/guides/${entry.slug}`}
                    className="font-medium text-accent hover:underline"
                  >
                    {entry.title}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </article>

      <JsonLd schema={schema} />
    </>
  );
}
