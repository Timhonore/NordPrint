import Link from "next/link";
import type { ProductQuery, ProductSearchResult } from "@nordprint/types";
import type { ShopSection } from "@nordprint/config";
import { CatalogView } from "./catalog-view";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

/** A top-level shop section with its subcategory chips above the catalogue. */
export function SectionView({
  section,
  result,
  query,
}: {
  readonly section: ShopSection;
  readonly result: ProductSearchResult;
  readonly query: ProductQuery;
}): React.JSX.Element {
  return (
    <>
      <Breadcrumbs items={[{ label: section.title, href: `/${section.slug}` }]} />

      {section.subsections.length > 0 ? (
        <nav aria-label={`Underkategorier i ${section.title}`} className="container-page pt-6">
          <ul className="flex flex-wrap gap-2">
            {section.subsections.map((subsection) => (
              <li key={subsection.slug}>
                <Link
                  href={`/${section.slug}/${subsection.slug}`}
                  className="inline-flex h-9 items-center rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent"
                >
                  {subsection.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <CatalogView
        result={result}
        query={query}
        basePath={`/${section.slug}`}
        title={section.title}
        description={section.description}
      />
    </>
  );
}
