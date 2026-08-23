import Link from "next/link";
import type { Brand } from "@nordprint/types";
import { commerceConfig, primaryNavigation } from "@nordprint/config";
import { formatMoney, money } from "@nordprint/commerce";
import { MegaMenu } from "./mega-menu";
import { MobileNav } from "./mobile-nav";
import { HeaderSearch } from "./header-search";
import { HeaderActions } from "./header-actions";
import { PrinterPill } from "@/components/printer/printer-pill";
import type { PrinterTree } from "@/lib/api/catalog";

/**
 * The site header.
 *
 * Server component: the navigation, brands and printer tree are all rendered
 * on the server, and only the three genuinely interactive pieces — search,
 * the cart/account buttons and the mobile drawer — ship JavaScript.
 */
export function SiteHeader({
  brands,
  printerBrands,
}: {
  brands: Brand[];
  printerBrands: PrinterTree["brands"];
}): React.JSX.Element {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      {/* Announcement strip. The threshold is configuration, never a literal. */}
      <div className="border-b border-line bg-surface-inverse text-ink-inverse">
        <div className="container-page flex h-9 items-center justify-center gap-6 text-xs">
          <span>
            Fri fragt over{" "}
            {formatMoney(
              money(commerceConfig.shipping.freeShippingThreshold, commerceConfig.currency)
            )}
          </span>
          <span aria-hidden="true" className="text-white/25">
            ·
          </span>
          <span className="hidden sm:inline">Bestil inden kl. 14 — afsendes samme dag</span>
          <span aria-hidden="true" className="hidden text-white/25 sm:inline">
            ·
          </span>
          <span className="hidden md:inline">Lager i Danmark</span>
        </div>
      </div>

      <div className="container-page">
        <div className="flex h-16 items-center gap-3 lg:h-[4.5rem] lg:gap-6">
          <MobileNav brands={brands} printerBrands={printerBrands} />

          <Link
            href="/"
            className="shrink-0 rounded-md text-lg font-bold tracking-tight text-ink lg:text-xl"
            aria-label="NordPrint — til forsiden"
          >
            NORD<span className="text-accent">PRINT</span>
          </Link>

          <MegaMenu
            entries={primaryNavigation}
            brands={brands}
            printerBrands={printerBrands}
            className="hidden lg:flex"
          />

          <div className="ml-auto flex items-center gap-1 lg:gap-2">
            <HeaderSearch />
            <PrinterPill className="hidden xl:flex" />
            <HeaderActions />
          </div>
        </div>
      </div>
    </header>
  );
}
