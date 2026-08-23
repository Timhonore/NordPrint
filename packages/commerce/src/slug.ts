/**
 * Danish-aware slugification. `Grøn` → `groen`, not `gr-n`.
 */
const TRANSLITERATIONS: Record<string, string> = {
  æ: "ae",
  ø: "oe",
  å: "aa",
  Æ: "ae",
  Ø: "oe",
  Å: "aa",
  ä: "ae",
  ö: "oe",
  ü: "ue",
  é: "e",
  è: "e",
  ê: "e",
  á: "a",
  à: "a",
  ß: "ss",
};

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[æøåÆØÅäöüéèêáàß]/g, (char) => TRANSLITERATIONS[char] ?? char)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/** Normalises a colour value to lowercase `#rrggbb`, or null when unusable. */
export function normalizeHex(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [r, g, b] = trimmed.toLowerCase();
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) return `#${trimmed.toLowerCase()}`;
  return null;
}

/**
 * Relative luminance per WCAG 2.1, used to pick a readable outline/checkmark
 * on top of a colour swatch. Accessibility is not optional on the colour
 * picker — a near-white swatch needs a visible border.
 */
export function relativeLuminance(hex: string): number {
  const normalized = normalizeHex(hex);
  if (!normalized) return 0;
  const channels = [1, 3, 5].map((offset) => {
    const value = parseInt(normalized.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export const isLightColor = (hex: string): boolean => relativeLuminance(hex) > 0.6;

/** Contrast ratio between two colours, per WCAG 2.1. */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}
