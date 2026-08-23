import Link from "next/link";
import { brand, footerNavigation, siteConfig } from "@nordprint/config";
import { NewsletterForm } from "@/components/marketing/newsletter-form";

/** Site footer, including the newsletter sign-up and the legal identification. */
export function SiteFooter(): React.JSX.Element {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-line bg-surface-inverse text-ink-inverse">
      <div className="grid-plate-inverse">
        <div className="container-page py-14">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
            <div>
              <p className="text-xl font-bold tracking-tight">
                NORD<span className="text-accent">PRINT</span>
              </p>
              <p className="mt-2 max-w-xs text-sm text-white/65">{brand.taglineSecondary}</p>

              <div className="mt-6 max-w-sm">
                <NewsletterForm />
              </div>
            </div>

            {footerNavigation.map((column) => (
              <nav key={column.title} aria-label={column.title}>
                <p className="mb-3 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-white/45">
                  {column.title}
                </p>
                <ul className="space-y-2">
                  {column.links?.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-white/70 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {year} {brand.legalName} · CVR {siteConfig.cvr} · {siteConfig.address.street},{" "}
              {siteConfig.address.postalCode} {siteConfig.address.city}
            </p>
            <p className="flex items-center gap-4">
              <a href={`mailto:${siteConfig.supportEmail}`} className="hover:text-white">
                {siteConfig.supportEmail}
              </a>
              <Link href="/cookies" className="hover:text-white">
                Cookieindstillinger
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
