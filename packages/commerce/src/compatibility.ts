import type {
  CompatibilityRule,
  CompatibilityStatus,
  CompatibilityTargetType,
  CompatibilityVerdict,
  PrinterModelWithLineage,
} from "@nordprint/types";

/**
 * Rule resolution: the most specific rule wins.
 *
 *   printer_model  >  printer_family  >  printer_brand
 *
 * When nothing matches the verdict is "unknown" — NordPrint never implies a
 * fit it has not recorded.
 */
const SPECIFICITY: Record<CompatibilityTargetType, number> = {
  printer_model: 3,
  printer_family: 2,
  printer_brand: 1,
};

export function resolveCompatibility(
  rules: readonly CompatibilityRule[],
  printer: PrinterModelWithLineage | null,
  subjectIds: readonly string[]
): CompatibilityVerdict {
  if (!printer) {
    return {
      status: "unknown",
      note: null,
      matchedOn: null,
      printerModelId: null,
      printerDisplayName: null,
    };
  }

  const subjects = new Set(subjectIds);
  const targetIdFor: Record<CompatibilityTargetType, string> = {
    printer_model: printer.id,
    printer_family: printer.familyId,
    printer_brand: printer.brandId,
  };

  let best: CompatibilityRule | null = null;
  for (const rule of rules) {
    if (!subjects.has(rule.subjectId)) continue;
    if (targetIdFor[rule.targetType] !== rule.targetId) continue;
    if (best === null || SPECIFICITY[rule.targetType] > SPECIFICITY[best.targetType]) {
      best = rule;
    }
  }

  if (!best) {
    return {
      status: "unknown",
      note: null,
      matchedOn: null,
      printerModelId: printer.id,
      printerDisplayName: printer.displayName,
    };
  }

  return {
    status: best.status,
    note: best.note,
    matchedOn: best.targetType,
    printerModelId: printer.id,
    printerDisplayName: printer.displayName,
  };
}

/** Presentation tone. Never rely on colour alone — the label carries meaning. */
export function compatibilityTone(
  status: CompatibilityStatus
): "positive" | "caution" | "negative" | "neutral" {
  switch (status) {
    case "compatible":
      return "positive";
    case "conditional":
      return "caution";
    case "incompatible":
      return "negative";
    case "unknown":
      return "neutral";
  }
}

/**
 * Derives an *implicit* filament verdict from the specification when no
 * explicit rule exists — e.g. an abrasive filament on a printer without a
 * hardened nozzle is "conditional", not "compatible".
 *
 * The result is deliberately never stronger than "conditional": inference is
 * a hint, an explicit rule is a promise.
 */
export function inferFilamentCompatibility(
  spec: {
    abrasive: boolean;
    hardenedNozzleRecommended: boolean;
    enclosureRecommended: boolean;
    nozzleTemperature: { max: number | null };
    bedTemperature: { max: number | null };
  },
  printer: PrinterModelWithLineage
): CompatibilityVerdict {
  const notes: string[] = [];
  let status: CompatibilityStatus = "unknown";

  const nozzleMax = spec.nozzleTemperature.max;
  if (nozzleMax !== null && printer.maxNozzleTemperature !== null) {
    if (nozzleMax > printer.maxNozzleTemperature) {
      return {
        status: "incompatible",
        note: `Kræver ${nozzleMax} °C i dysen — ${printer.displayName} kan maks. ${printer.maxNozzleTemperature} °C.`,
        matchedOn: null,
        printerModelId: printer.id,
        printerDisplayName: printer.displayName,
      };
    }
    status = "compatible";
  }

  const bedMax = spec.bedTemperature.max;
  if (bedMax !== null && printer.maxBedTemperature !== null && bedMax > printer.maxBedTemperature) {
    return {
      status: "incompatible",
      note: `Kræver ${bedMax} °C på printbedet — ${printer.displayName} kan maks. ${printer.maxBedTemperature} °C.`,
      matchedOn: null,
      printerModelId: printer.id,
      printerDisplayName: printer.displayName,
    };
  }

  if ((spec.abrasive || spec.hardenedNozzleRecommended) && !printer.hardenedNozzleStock) {
    notes.push("Kræver hærdet dyse.");
    status = "conditional";
  }

  if (spec.enclosureRecommended && !printer.enclosed) {
    notes.push("Lukket kabinet anbefales for at undgå warping.");
    status = "conditional";
  }

  return {
    status,
    note: notes.length > 0 ? notes.join(" ") : null,
    matchedOn: null,
    printerModelId: printer.id,
    printerDisplayName: printer.displayName,
  };
}
