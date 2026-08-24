import Link from "next/link";
import { siteConfig } from "@nordprint/config";
import { ChevronRightIcon } from "@/components/icons";
import { JsonLd } from "@/lib/seo/json-ld";

export interface Crumb {
  readonly label: string;
  readonly href: string;
}

/**
 * Breadcrumbs, with matching `BreadcrumbList` structured data.
 *
 * Both come from the same array, so the markup a customer sees and the trail
 * Google indexes cannot drift apart.
 */
export function Breadcrumbs({ items }: { readonly items: readonly Crumb[] }): React.JSX.Element {
  const trail: Crumb[] = [{ label: "Forside", href: "/" }, ...items];

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.label,
      item: `${siteConfig.url}${crumb.href}`,
    })),
  };

  return (
    <nav aria-label="Brødkrumme" className="border-b border-line bg-surface">
      <div className="container-page">
        <ol className="flex flex-wrap items-center gap-1 py-3 text-sm">
          {trail.map((crumb, index) => {
            const last = index === trail.length - 1;
            return (
              <li key={crumb.href} className="flex items-center gap-1">
                {index > 0 ? (
                  <ChevronRightIcon
                    className="size-3.5 shrink-0 text-ink-faint"
                    aria-hidden="true"
                  />
                ) : null}
                {last ? (
                  <span aria-current="page" className="text-ink-soft">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="text-ink-soft hover:text-ink hover:underline">
                    {crumb.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <JsonLd schema={schema} />
    </nav>
  );
}
