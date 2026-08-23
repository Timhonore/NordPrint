/**
 * Printer database: Brand → Family → Model.
 *
 * The hierarchy is data, not code. Adding Prusa, Creality, Elegoo, Voron or
 * anything else is a seed/admin operation — no storefront change required.
 */

export interface PrinterBrand {
  readonly id: string;
  readonly name: string;
  readonly handle: string;
  readonly logoUrl: string | null;
  readonly websiteUrl: string | null;
  readonly rank: number;
}

export interface PrinterFamily {
  readonly id: string;
  readonly brandId: string;
  readonly name: string;
  readonly handle: string;
  readonly description: string | null;
  readonly rank: number;
}

export type PrinterTechnology = "fdm" | "resin";

export interface PrinterModel {
  readonly id: string;
  readonly familyId: string;
  readonly brandId: string;
  readonly name: string;
  readonly handle: string;
  readonly technology: PrinterTechnology;
  readonly releaseYear: number | null;
  readonly enclosed: boolean;
  readonly heatedBed: boolean;
  readonly maxNozzleTemperature: number | null;
  readonly maxBedTemperature: number | null;
  readonly buildVolumeMm: BuildVolume | null;
  readonly defaultNozzleDiameterMm: number | null;
  readonly supportsAms: boolean;
  readonly supportsAmsLite: boolean;
  readonly hardenedNozzleStock: boolean;
  readonly imageUrl: string | null;
  readonly rank: number;
}

export interface BuildVolume {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Fully resolved model, as returned by the storefront API. */
export interface PrinterModelWithLineage extends PrinterModel {
  readonly brand: PrinterBrand;
  readonly family: PrinterFamily;
  /** "Bambu Lab X1 Carbon" */
  readonly displayName: string;
}

/** The customer's saved printer — local storage for guests, DB when logged in. */
export interface SavedPrinter {
  readonly modelId: string;
  readonly displayName: string;
  readonly handle: string;
  readonly nickname?: string | null;
  readonly savedAt: string;
}
