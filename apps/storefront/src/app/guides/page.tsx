import type { Metadata } from "next";
import { brand, siteConfig } from "@nordprint/config";
import { EmptyState, TechLabel } from "@nordprint/ui";
import { fetchGuides } from "@/lib/api/catalog";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { GuideRail } from "@/components/home/guide-rail";

const TITLE = "Guides";
const DESCRIPTION =
  "Vi printer selv. Her samler vi det, vi har lært om materialer, tørring, kompatibilitet og alt det, der går galt undervejs.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guides" },
  openGraph: {
    title: `${TITLE} | ${brand.name}`,
    description: DESCRIPTION,
    url: `${siteConfig.url}/guides`,
    type: "website",
  },
};

export const revalidate = 300;

export default async function GuidesPage(): Promise<React.JSX.Element> {
  const guides = await fetchGuides(48);

  return (
    <>
      <Breadcrumbs items={[{ label: "Guides", href: "/guides" }]} />

      <div className="container-page py-10 md:py-14">
        <TechLabel>Vidensbank</TechLabel>
        <h1 className="mb-2 mt-1.5 text-3xl font-bold tracking-tight md:text-4xl">{TITLE}</h1>
        <p className="mb-10 max-w-2xl text-lg leading-relaxed text-ink-soft">{DESCRIPTION}</p>

        {guides.length > 0 ? (
          <GuideRail guides={guides} />
        ) : (
          <EmptyState
            title="Ingen guides endnu"
            description="Vi er i gang med at skrive dem. Kig forbi igen om lidt."
          />
        )}
      </div>
    </>
  );
}
