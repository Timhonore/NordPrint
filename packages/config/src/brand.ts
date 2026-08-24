/**
 * NordPrint brand constants.
 *
 * Design tokens live in CSS (see `apps/storefront/src/app/globals.css`); this
 * file only holds the values that code needs to reason about — names, taglines
 * and the canonical palette used for e-mail templates and OpenGraph images,
 * where CSS custom properties are not available.
 */

export const brand = {
  name: "NordPrint",
  legalName: "NordPrint ApS",
  tagline: "Alt til dit næste print",
  taglineSecondary: "Filament, udstyr & alt til 3D-print",
  description:
    "Filament, reservedele og udstyr til din 3D-printer. Lager i Danmark, hurtig levering og dansk kundeservice.",
  locale: "da-DK",
  language: "da",
  country: "DK",
} as const;

/**
 * Palette mirrors the CSS custom properties in `globals.css`.
 * Keep the two in sync — the CSS is the source of truth for the storefront,
 * this object is the source of truth for e-mail and generated images.
 */
export const palette = {
  ink: "#0d1117",
  ink80: "#2c333d",
  slate: "#5b6672",
  fog: "#e6e9ed",
  paper: "#f7f8fa",
  white: "#ffffff",
  /** Nordic blue — primary action colour. */
  aurora: "#1f6feb",
  auroraDark: "#1a5ac2",
  /** Warm accent used for offers and highlights. */
  amber: "#d97706",
  positive: "#1a7f5a",
  negative: "#c02b2b",
  caution: "#b45309",
} as const;

export type PaletteToken = keyof typeof palette;
