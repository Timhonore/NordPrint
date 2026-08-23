/**
 * Generic product ↔ printer compatibility.
 *
 * Deliberately four-valued. "unknown" is a first-class answer: NordPrint must
 * never claim a fit it cannot back up, and the storefront renders "unknown"
 * as "Kompatibilitet ikke bekræftet" rather than hiding it.
 */

export const COMPATIBILITY_STATUSES = [
  "compatible",
  "incompatible",
  "conditional",
  "unknown",
] as const;
export type CompatibilityStatus = (typeof COMPATIBILITY_STATUSES)[number];

/** What the rule is attached to on the printer side. */
export type CompatibilityTargetType = "printer_model" | "printer_family" | "printer_brand";

/** What the rule is attached to on the product side. */
export type CompatibilitySubjectType = "product" | "variant";

export interface CompatibilityRule {
  readonly id: string;
  readonly subjectType: CompatibilitySubjectType;
  readonly subjectId: string;
  readonly targetType: CompatibilityTargetType;
  readonly targetId: string;
  readonly status: CompatibilityStatus;
  /** Required when status is "conditional", e.g. "Passer hvis AMS Hub anvendes." */
  readonly note: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CompatibilityVerdict {
  readonly status: CompatibilityStatus;
  readonly note: string | null;
  /** Which rule level produced the verdict — model beats family beats brand. */
  readonly matchedOn: CompatibilityTargetType | null;
  readonly printerModelId: string | null;
  readonly printerDisplayName: string | null;
}

export const COMPATIBILITY_LABELS: Record<CompatibilityStatus, string> = {
  compatible: "Passer til din printer",
  incompatible: "Passer ikke til din printer",
  conditional: "Passer med forbehold",
  unknown: "Kompatibilitet ikke bekræftet",
};
