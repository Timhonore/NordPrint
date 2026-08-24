/**
 * The shop's top-level sections.
 *
 * One registry, used by three things at once: the routes under
 * `/[sektion]`, the metadata on those pages, and the breadcrumbs. Adding a
 * section — say "Resin" as its own department — means one entry here plus a
 * category in the backend; it does not mean a new file in `app/`.
 *
 * `kind` and `categoryHandle` are the two ways a section can be scoped:
 * filament is a *type* of product regardless of category, while spare parts
 * are whatever sits under the "reservedele" category tree. Both end up as a
 * server-side filter — never as a client-side `.filter()` over everything.
 */

export interface ShopSubsection {
  readonly slug: string;
  readonly title: string;
  /** Category handle in the commerce backend. */
  readonly categoryHandle: string;
  readonly description: string;
}

export interface ShopSection {
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly kind?: string;
  readonly categoryHandle?: string;
  readonly subsections: readonly ShopSubsection[];
}

export const shopSections: readonly ShopSection[] = [
  {
    slug: "3d-printere",
    title: "3D-printere",
    description:
      "FDM-printere til værkstedet, kontoret og hjemmet. Vi skriver byggevolumen, dysetemperatur og hvad printeren kan uden opgraderinger.",
    kind: "printer",
    subsections: [],
  },
  {
    slug: "reservedele",
    title: "Reservedele",
    description:
      "Dyser, hotends, build plates og de dele, der slides. Find den rigtige til din printer — vi angiver altid, hvad delen passer til.",
    categoryHandle: "reservedele",
    subsections: [
      {
        slug: "hotends",
        title: "Hotends",
        categoryHandle: "reservedele-hotends",
        description:
          "Komplette hotends og enkeltdele. Vær opmærksom på, om din printer kræver en bestemt længde varmebrud.",
      },
      {
        slug: "dyser",
        title: "Dyser",
        categoryHandle: "reservedele-dyser",
        description:
          "Messing til almindeligt filament, hærdet stål til slibende materialer som kulfiber og glasfyldt nylon.",
      },
      {
        slug: "build-plates",
        title: "Build plates",
        categoryHandle: "reservedele-build-plates",
        description:
          "Teksturerede, glatte og PEI-belagte plader. Overfladen afgør både vedhæftning og hvordan bunden af printet ser ud.",
      },
      {
        slug: "ekstrudere",
        title: "Ekstrudere",
        categoryHandle: "reservedele-ekstrudere",
        description: "Drivhjul, ekstruderarme og komplette ekstrudere til direct drive og bowden.",
      },
      {
        slug: "remme-og-lejer",
        title: "Remme & lejer",
        categoryHandle: "reservedele-remme-og-lejer",
        description:
          "Tandremme, linearlejer og ruller. Slidte remme viser sig som skygger og ringing i printet.",
      },
    ],
  },
  {
    slug: "tilbehoer",
    title: "Tilbehør",
    description:
      "Alt det omkring printeren: tørrere, opbevaring, vedligeholdelse og det, der gør et print færdigt.",
    categoryHandle: "tilbehoer",
    subsections: [
      {
        slug: "filamenttoerrere",
        title: "Filamenttørrere",
        categoryHandle: "tilbehoer-filamenttoerrere",
        description:
          "Fugtigt filament giver knitren, dårlig lagbinding og strenge. En tørrer løser det for PETG, nylon og TPU.",
      },
      {
        slug: "opbevaring",
        title: "Opbevaring",
        categoryHandle: "tilbehoer-opbevaring",
        description:
          "Tørbokse, vakuumposer og tørremiddel — så spolen er lige så tør, næste gang du bruger den.",
      },
      {
        slug: "resin",
        title: "Resin",
        categoryHandle: "tilbehoer-resin",
        description: "Resin og forbrugsstoffer til SLA- og MSLA-print.",
      },
      {
        slug: "vedligeholdelse",
        title: "Vedligeholdelse",
        categoryHandle: "tilbehoer-vedligeholdelse",
        description: "Smøremiddel, rensenåle, isopropanol og det, der holder mekanikken i gang.",
      },
      {
        slug: "adhaesion",
        title: "Lim & adhæsion",
        categoryHandle: "tilbehoer-adhaesion",
        description: "Limstifter, spray og plader til materialer, der ikke vil blive på pladen.",
      },
    ],
  },
  {
    slug: "vaerktoej",
    title: "Værktøj",
    description:
      "Håndværktøj, måleværktøj og efterbehandling. Det meste af arbejdet med et print sker, efter printeren er færdig.",
    categoryHandle: "vaerktoej",
    subsections: [
      {
        slug: "haandvaerktoej",
        title: "Håndværktøj",
        categoryHandle: "vaerktoej-haandvaerktoej",
        description: "Tænger, skalpeller, unbrakonøgler og pincetter.",
      },
      {
        slug: "efterbehandling",
        title: "Efterbehandling",
        categoryHandle: "vaerktoej-efterbehandling",
        description: "Slibning, spartel, primer og alt til en overflade, der ikke ligner et print.",
      },
      {
        slug: "maalevaerktoej",
        title: "Måleværktøj",
        categoryHandle: "vaerktoej-maalevaerktoej",
        description:
          "Skydelære og måleværktøj — uundværligt, når en tolerance skal passe første gang.",
      },
    ],
  },
];

/** Filament materials that get their own page (`/filament/pla`). */
export interface FilamentSection {
  readonly slug: string;
  readonly title: string;
  readonly categoryHandle: string;
  readonly description: string;
}

export const filamentSections: readonly FilamentSection[] = [
  {
    slug: "pla",
    title: "PLA",
    categoryHandle: "filament-pla",
    description:
      "Det nemmeste materiale at printe. Lav krympning, ingen lugt og rene detaljer — men det tåler ikke en varm bil.",
  },
  {
    slug: "petg",
    title: "PETG",
    categoryHandle: "filament-petg",
    description:
      "Sejere end PLA og tåler både vand og udendørs brug. Kræver tørt filament for at printe pænt.",
  },
  {
    slug: "asa-abs",
    title: "ASA & ABS",
    categoryHandle: "filament-asa-abs",
    description:
      "Til dele, der skal kunne tåle sol og varme. Begge kræver et lukket kabinet og god udluftning.",
  },
  {
    slug: "tpu",
    title: "TPU",
    categoryHandle: "filament-tpu",
    description:
      "Fleksibelt filament til pakninger, greb og støddæmpning. Print langsomt — helst med direct drive.",
  },
  {
    slug: "teknisk",
    title: "Teknisk filament",
    categoryHandle: "filament-teknisk",
    description:
      "Nylon, PC og fiberforstærkede materialer til funktionelle dele. Slibende: brug hærdet dyse.",
  },
];

export function findShopSection(slug: string): ShopSection | undefined {
  return shopSections.find((section) => section.slug === slug);
}

export function findFilamentSection(slug: string): FilamentSection | undefined {
  return filamentSections.find((section) => section.slug === slug);
}
