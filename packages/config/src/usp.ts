import { readEnv } from "./env";

/**
 * USPs shown on the front page, in the cart and in the footer.
 *
 * Configurable through `NORDPRINT_USPS` as JSON, so marketing can change the
 * promises without a code deploy.
 */
export interface Usp {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** Icon name resolved by the storefront's icon registry. */
  readonly icon: "truck" | "warehouse" | "headset" | "shield" | "leaf" | "sparkles";
}

export const defaultUsps: readonly Usp[] = [
  {
    id: "fast-delivery",
    title: "Hurtig levering",
    description: "Bestil inden kl. 14 på hverdage, så pakker vi samme dag.",
    icon: "truck",
  },
  {
    id: "danish-stock",
    title: "Lager i Danmark",
    description: "Alt sendes fra vores eget lager — ingen ventetid fra Kina.",
    icon: "warehouse",
  },
  {
    id: "danish-support",
    title: "Dansk kundeservice",
    description: "Vi printer selv. Spørg os om alt fra flow til førstelagsproblemer.",
    icon: "headset",
  },
  {
    id: "secure-payment",
    title: "Sikker betaling",
    description: "Betal med kort eller MobilePay. 14 dages returret.",
    icon: "shield",
  },
];

function isUsp(value: unknown): value is Usp {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.title === "string" &&
    typeof candidate.description === "string" &&
    typeof candidate.icon === "string"
  );
}

export function loadUsps(): readonly Usp[] {
  const raw = readEnv("NORDPRINT_USPS");
  if (!raw) return defaultUsps;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultUsps;
    const valid = parsed.filter(isUsp);
    return valid.length > 0 ? valid : defaultUsps;
  } catch {
    // A malformed override must never take the front page down.
    return defaultUsps;
  }
}
