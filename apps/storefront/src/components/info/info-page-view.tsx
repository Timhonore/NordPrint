import { TechLabel } from "@nordprint/ui";
import type { InfoPage } from "@/lib/content/info-pages";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ReopenConsentButton } from "@/components/consent/cookie-consent";

/**
 * Renders one of the information pages (kontakt, levering, privatliv, …).
 *
 * A narrow measure and generous leading: these are pages people read, not
 * scan, and a 90-character line of legal text is where readers give up.
 */
export function InfoPageView({ page }: { readonly page: InfoPage }): React.JSX.Element {
  return (
    <>
      <Breadcrumbs items={[{ label: page.title, href: `/${page.slug}` }]} />

      <article className="container-page py-10 md:py-14">
        <div className="max-w-2xl">
          <TechLabel>{page.label}</TechLabel>
          <h1 className="mb-4 mt-1.5 text-3xl font-bold tracking-tight md:text-4xl">
            {page.title}
          </h1>
          <p className="text-lg leading-relaxed text-ink-soft">{page.lead}</p>

          <div className="mt-10 space-y-9">
            {page.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="mb-3 text-xl font-semibold tracking-tight">{section.heading}</h2>
                <div className="space-y-2.5">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="leading-relaxed text-ink-soft">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* The cookie page is the one place a visitor expects to be able to
              act, not just read. */}
          {page.slug === "cookies" ? (
            <div className="mt-8 rounded-xl border border-line bg-surface p-5">
              <p className="mb-3 text-sm text-ink-soft">
                Du kan til enhver tid ændre eller trække dit samtykke tilbage.
              </p>
              <ReopenConsentButton />
            </div>
          ) : null}

          <p className="mt-12 border-t border-line pt-5 text-sm text-ink-faint">{page.updated}</p>
        </div>
      </article>
    </>
  );
}
