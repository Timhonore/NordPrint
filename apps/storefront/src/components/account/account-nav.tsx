"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@nordprint/ui";

const LINKS = [
  { href: "/konto", label: "Oversigt" },
  { href: "/konto/ordrer", label: "Ordrer" },
  { href: "/konto/printere", label: "Mine printere" },
  { href: "/konto/favoritter", label: "Favoritter" },
  { href: "/konto/adresser", label: "Adresser" },
  { href: "/konto/profil", label: "Profil" },
] as const;

/** Account navigation. Scrolls horizontally on mobile, stacks on desktop. */
export function AccountNav(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <nav aria-label="Kontonavigation">
      <ul className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
        {LINKS.map((link) => {
          const active =
            link.href === "/konto" ? pathname === "/konto" : pathname.startsWith(link.href);
          return (
            <li key={link.href} className="shrink-0 lg:shrink">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-accent-soft font-medium text-accent"
                    : "text-ink-soft hover:bg-surface-muted hover:text-ink"
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
