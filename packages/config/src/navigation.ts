/**
 * Static navigation skeleton.
 *
 * Only the *structure* lives here — the leaf entries that depend on catalogue
 * data (brands, materials, printers) are resolved at request time from the
 * commerce backend. Nothing brand-specific may be hardcoded in the storefront.
 */

export interface NavLink {
  readonly label: string;
  readonly href: string;
  readonly description?: string;
}

export interface NavColumn {
  readonly title: string;
  /** When set, the column is populated from the backend at request time. */
  readonly source?: "materials" | "finishes" | "brands" | "printer-brands" | "categories";
  readonly links?: readonly NavLink[];
  readonly viewAll?: NavLink;
}

export interface NavEntry {
  readonly label: string;
  readonly href: string;
  readonly columns?: readonly NavColumn[];
  readonly highlight?: boolean;
}

export const primaryNavigation: readonly NavEntry[] = [
  {
    label: "Filament",
    href: "/filament",
    columns: [
      {
        title: "Efter materiale",
        source: "materials",
        viewAll: { label: "Alt filament", href: "/filament" },
      },
      { title: "Efter finish", source: "finishes" },
      { title: "Efter brand", source: "brands" },
    ],
  },
  {
    label: "3D-printere",
    href: "/3d-printere",
    columns: [
      { title: "Efter producent", source: "printer-brands" },
      {
        title: "Genveje",
        links: [
          { label: "Alle printere", href: "/3d-printere" },
          { label: "Shop efter printer", href: "/shop-efter-printer" },
          { label: "Min printer", href: "/konto/printere" },
        ],
      },
    ],
  },
  {
    label: "Reservedele",
    href: "/reservedele",
    columns: [
      {
        title: "Kategorier",
        links: [
          { label: "Hotends", href: "/reservedele/hotends" },
          { label: "Dyser", href: "/reservedele/dyser" },
          { label: "Build plates", href: "/reservedele/build-plates" },
          { label: "Ekstrudere", href: "/reservedele/ekstrudere" },
          { label: "Remme & lejer", href: "/reservedele/remme-og-lejer" },
        ],
      },
      {
        title: "Efter printer",
        source: "printer-brands",
      },
    ],
  },
  {
    label: "Tilbehør",
    href: "/tilbehoer",
    columns: [
      {
        title: "Kategorier",
        links: [
          { label: "Filamenttørrere", href: "/tilbehoer/filamenttoerrere" },
          { label: "Opbevaring", href: "/tilbehoer/opbevaring" },
          { label: "Resin", href: "/tilbehoer/resin" },
          { label: "Vedligeholdelse", href: "/tilbehoer/vedligeholdelse" },
          { label: "Lim & adhæsion", href: "/tilbehoer/adhaesion" },
        ],
      },
    ],
  },
  {
    label: "Værktøj",
    href: "/vaerktoej",
    columns: [
      {
        title: "Kategorier",
        links: [
          { label: "Håndværktøj", href: "/vaerktoej/haandvaerktoej" },
          { label: "Efterbehandling", href: "/vaerktoej/efterbehandling" },
          { label: "Måleværktøj", href: "/vaerktoej/maalevaerktoej" },
        ],
      },
    ],
  },
  { label: "Tilbud", href: "/tilbud", highlight: true },
  { label: "Guides", href: "/guides" },
];

export const footerNavigation: readonly NavColumn[] = [
  {
    title: "Shop",
    links: [
      { label: "Alle produkter", href: "/produkter" },
      { label: "Filament", href: "/filament" },
      { label: "3D-printere", href: "/3d-printere" },
      { label: "Reservedele", href: "/reservedele" },
      { label: "Tilbud", href: "/tilbud" },
    ],
  },
  {
    title: "Hjælp",
    links: [
      { label: "Find filament", href: "/find-filament" },
      { label: "Sammenlign", href: "/sammenlign" },
      { label: "Guides", href: "/guides" },
      { label: "Kontakt", href: "/kontakt" },
      { label: "Levering", href: "/levering" },
      { label: "Returnering", href: "/returnering" },
    ],
  },
  {
    title: "NordPrint",
    links: [
      { label: "Om os", href: "/om-nordprint" },
      { label: "Handelsbetingelser", href: "/handelsbetingelser" },
      { label: "Privatlivspolitik", href: "/privatliv" },
      { label: "Cookies", href: "/cookies" },
    ],
  },
];
