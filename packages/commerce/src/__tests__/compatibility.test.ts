import { describe, expect, it } from "vitest";
import type { CompatibilityRule, PrinterModelWithLineage } from "@nordprint/types";
import { inferFilamentCompatibility, resolveCompatibility } from "../compatibility";

const x1c: PrinterModelWithLineage = {
  id: "pm_x1c",
  familyId: "pf_x1",
  brandId: "pb_bambu",
  name: "X1 Carbon",
  handle: "bambu-lab-x1-carbon",
  technology: "fdm",
  releaseYear: 2022,
  enclosed: true,
  heatedBed: true,
  maxNozzleTemperature: 300,
  maxBedTemperature: 110,
  buildVolumeMm: { x: 256, y: 256, z: 256 },
  defaultNozzleDiameterMm: 0.4,
  supportsAms: true,
  supportsAmsLite: false,
  hardenedNozzleStock: true,
  imageUrl: null,
  rank: 1,
  displayName: "Bambu Lab X1 Carbon",
  brand: {
    id: "pb_bambu",
    name: "Bambu Lab",
    handle: "bambu-lab",
    logoUrl: null,
    websiteUrl: null,
    rank: 1,
  },
  family: {
    id: "pf_x1",
    brandId: "pb_bambu",
    name: "X1",
    handle: "x1",
    description: null,
    rank: 1,
  },
};

const a1: PrinterModelWithLineage = {
  ...x1c,
  id: "pm_a1",
  familyId: "pf_a1",
  name: "A1",
  handle: "bambu-lab-a1",
  enclosed: false,
  maxNozzleTemperature: 300,
  maxBedTemperature: 100,
  supportsAms: false,
  supportsAmsLite: true,
  hardenedNozzleStock: false,
  displayName: "Bambu Lab A1",
  family: {
    id: "pf_a1",
    brandId: "pb_bambu",
    name: "A1",
    handle: "a1",
    description: null,
    rank: 2,
  },
};

function rule(partial: Partial<CompatibilityRule>): CompatibilityRule {
  return {
    id: "cr_1",
    subjectType: "product",
    subjectId: "prod_nozzle",
    targetType: "printer_model",
    targetId: "pm_x1c",
    status: "compatible",
    note: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("resolveCompatibility", () => {
  it("is 'unknown' when no printer is selected", () => {
    expect(resolveCompatibility([], null, ["prod_nozzle"]).status).toBe("unknown");
  });

  it("is 'unknown' when nothing matches — never an implied fit", () => {
    const verdict = resolveCompatibility([], x1c, ["prod_nozzle"]);
    expect(verdict.status).toBe("unknown");
    expect(verdict.printerDisplayName).toBe("Bambu Lab X1 Carbon");
  });

  it("matches an exact model rule", () => {
    const verdict = resolveCompatibility([rule({})], x1c, ["prod_nozzle"]);
    expect(verdict.status).toBe("compatible");
    expect(verdict.matchedOn).toBe("printer_model");
  });

  it("falls back to family and brand rules", () => {
    const brandRule = rule({ targetType: "printer_brand", targetId: "pb_bambu" });
    expect(resolveCompatibility([brandRule], a1, ["prod_nozzle"]).matchedOn).toBe("printer_brand");
  });

  it("lets the most specific rule win", () => {
    const rules = [
      rule({
        id: "cr_brand",
        targetType: "printer_brand",
        targetId: "pb_bambu",
        status: "compatible",
      }),
      rule({
        id: "cr_model",
        targetType: "printer_model",
        targetId: "pm_x1c",
        status: "incompatible",
      }),
    ];
    const verdict = resolveCompatibility(rules, x1c, ["prod_nozzle"]);
    expect(verdict.status).toBe("incompatible");
    expect(verdict.matchedOn).toBe("printer_model");
  });

  it("carries the note for conditional fits", () => {
    const conditional = rule({ status: "conditional", note: "Passer hvis AMS Hub anvendes." });
    const verdict = resolveCompatibility([conditional], x1c, ["prod_nozzle"]);
    expect(verdict.status).toBe("conditional");
    expect(verdict.note).toBe("Passer hvis AMS Hub anvendes.");
  });

  it("ignores rules for other products", () => {
    expect(resolveCompatibility([rule({})], x1c, ["prod_other"]).status).toBe("unknown");
  });
});

describe("inferFilamentCompatibility", () => {
  const abrasive = {
    abrasive: true,
    hardenedNozzleRecommended: true,
    enclosureRecommended: false,
    nozzleTemperature: { max: 260 },
    bedTemperature: { max: 60 },
  };

  it("is compatible on a printer that ships a hardened nozzle", () => {
    expect(inferFilamentCompatibility(abrasive, x1c).status).toBe("compatible");
  });

  it("is conditional — with a reason — on a printer without one", () => {
    const verdict = inferFilamentCompatibility(abrasive, a1);
    expect(verdict.status).toBe("conditional");
    expect(verdict.note).toContain("hærdet dyse");
  });

  it("is incompatible when the printer cannot reach the temperature", () => {
    const peek = {
      abrasive: false,
      hardenedNozzleRecommended: false,
      enclosureRecommended: true,
      nozzleTemperature: { max: 400 },
      bedTemperature: { max: 120 },
    };
    const verdict = inferFilamentCompatibility(peek, x1c);
    expect(verdict.status).toBe("incompatible");
    expect(verdict.note).toContain("300");
  });

  it("flags a missing enclosure as conditional, not incompatible", () => {
    const asa = {
      abrasive: false,
      hardenedNozzleRecommended: false,
      enclosureRecommended: true,
      nozzleTemperature: { max: 260 },
      bedTemperature: { max: 90 },
    };
    expect(inferFilamentCompatibility(asa, a1).status).toBe("conditional");
    expect(inferFilamentCompatibility(asa, x1c).status).toBe("compatible");
  });
});
