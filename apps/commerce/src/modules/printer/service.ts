import { MedusaService } from "@medusajs/framework/utils";
import type { PrinterModelWithLineage } from "@nordprint/types";
import { CustomerPrinter, PrinterBrand, PrinterFamily, PrinterModel } from "./models";

/**
 * Printer database service.
 *
 * Everything the storefront needs to render "Shop efter printer" and to
 * resolve "Min printer" — always as fully-resolved lineage, because a model id
 * on its own is useless for both display and compatibility.
 */
class PrinterModuleService extends MedusaService({
  PrinterBrand,
  PrinterFamily,
  PrinterModel,
  CustomerPrinter,
}) {
  /** Resolves models together with their family and brand, ready to render. */
  async listModelsWithLineage(
    filters: Record<string, unknown> = {}
  ): Promise<PrinterModelWithLineage[]> {
    const models = await this.listPrinterModels(
      { active: true, ...filters },
      { relations: ["family", "family.brand"], order: { rank: "ASC", name: "ASC" } }
    );
    return models.map((entry) => toLineageDto(entry));
  }

  async retrieveModelWithLineage(id: string): Promise<PrinterModelWithLineage | null> {
    const [entry] = await this.listModelsWithLineage({ id });
    return entry ?? null;
  }

  async retrieveModelByHandle(handle: string): Promise<PrinterModelWithLineage | null> {
    const [entry] = await this.listModelsWithLineage({ handle });
    return entry ?? null;
  }

  /**
   * The customer's printers, primary first. Used by the account dashboard and
   * by every compatibility badge in the storefront.
   */
  async listCustomerPrintersWithLineage(
    customerId: string
  ): Promise<
    { id: string; nickname: string | null; isPrimary: boolean; model: PrinterModelWithLineage }[]
  > {
    const saved = await this.listCustomerPrinters(
      { customer_id: customerId },
      { order: { is_primary: "DESC", created_at: "ASC" } }
    );
    if (saved.length === 0) return [];

    const models = await this.listModelsWithLineage({
      id: saved.map((entry) => entry.printer_model_id),
    });
    const byId = new Map(models.map((entry) => [entry.id, entry]));

    return saved
      .map((entry) => {
        const printerModel = byId.get(entry.printer_model_id);
        if (!printerModel) return null;
        return {
          id: entry.id,
          nickname: entry.nickname ?? null,
          isPrimary: Boolean(entry.is_primary),
          model: printerModel,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }

  /**
   * Saves a printer for a customer, keeping exactly one primary.
   * Idempotent — re-saving the same printer just promotes it.
   */
  async saveCustomerPrinter(input: {
    customerId: string;
    printerModelId: string;
    nickname?: string | null;
    makePrimary?: boolean;
  }): Promise<void> {
    const existing = await this.listCustomerPrinters({
      customer_id: input.customerId,
      printer_model_id: input.printerModelId,
    });

    const makePrimary = input.makePrimary ?? existing.length === 0;

    if (makePrimary) {
      const others = await this.listCustomerPrinters({ customer_id: input.customerId });
      const demote = others
        .filter((entry) => entry.is_primary && entry.printer_model_id !== input.printerModelId)
        .map((entry) => ({ id: entry.id, is_primary: false }));
      if (demote.length > 0) await this.updateCustomerPrinters(demote as any);
    }

    if (existing[0]) {
      await this.updateCustomerPrinters({
        id: existing[0].id,
        nickname: input.nickname ?? existing[0].nickname,
        is_primary: makePrimary,
      } as any);
      return;
    }

    await this.createCustomerPrinters({
      customer_id: input.customerId,
      printer_model_id: input.printerModelId,
      nickname: input.nickname ?? null,
      is_primary: makePrimary,
    } as any);
  }

  /**
   * Merges a guest's locally stored printers into their account on login.
   * Existing entries win — the account is the source of truth.
   */
  async mergeGuestPrinters(customerId: string, printerModelIds: string[]): Promise<void> {
    if (printerModelIds.length === 0) return;
    const existing = await this.listCustomerPrinters({ customer_id: customerId });
    const known = new Set(existing.map((entry) => entry.printer_model_id));
    const hasPrimary = existing.some((entry) => entry.is_primary);

    const missing = printerModelIds.filter((id) => !known.has(id));
    if (missing.length === 0) return;

    await this.createCustomerPrinters(
      missing.map((printerModelId, index) => ({
        customer_id: customerId,
        printer_model_id: printerModelId,
        is_primary: !hasPrimary && index === 0,
      })) as any
    );
  }
}

export function toLineageDto(entry: any): PrinterModelWithLineage {
  const family = entry.family ?? {};
  const brand = family.brand ?? {};
  const brandName: string = brand.name ?? "";
  return {
    id: entry.id,
    familyId: family.id ?? entry.family_id,
    brandId: brand.id ?? family.brand_id ?? "",
    name: entry.name,
    handle: entry.handle,
    technology: entry.technology,
    releaseYear: entry.release_year ?? null,
    enclosed: Boolean(entry.enclosed),
    heatedBed: Boolean(entry.heated_bed),
    maxNozzleTemperature: entry.max_nozzle_temperature ?? null,
    maxBedTemperature: entry.max_bed_temperature ?? null,
    buildVolumeMm:
      entry.build_volume_x && entry.build_volume_y && entry.build_volume_z
        ? { x: entry.build_volume_x, y: entry.build_volume_y, z: entry.build_volume_z }
        : null,
    defaultNozzleDiameterMm: entry.default_nozzle_diameter_mm ?? null,
    supportsAms: Boolean(entry.supports_ams),
    supportsAmsLite: Boolean(entry.supports_ams_lite),
    hardenedNozzleStock: Boolean(entry.hardened_nozzle_stock),
    imageUrl: entry.image_url ?? null,
    rank: entry.rank ?? 0,
    brand: {
      id: brand.id ?? "",
      name: brandName,
      handle: brand.handle ?? "",
      logoUrl: brand.logo_url ?? null,
      websiteUrl: brand.website_url ?? null,
      rank: brand.rank ?? 0,
    },
    family: {
      id: family.id ?? "",
      brandId: brand.id ?? "",
      name: family.name ?? "",
      handle: family.handle ?? "",
      description: family.description ?? null,
      rank: family.rank ?? 0,
    },
    // "Bambu Lab X1 Carbon". The brand is not repeated when the model name
    // already carries it — including when only the first word overlaps, so
    // "Prusa Research" + "Prusa MK4S" renders as "Prusa MK4S", not
    // "Prusa Research Prusa MK4S".
    displayName: composeDisplayName(brandName, entry.name),
  };
}

/** Joins brand and model without repeating a name the model already carries. */
export function composeDisplayName(brandName: string, modelName: string): string {
  if (brandName.length === 0) return modelName;
  if (modelName.startsWith(brandName)) return modelName;

  const brandFirstWord = brandName.split(" ")[0];
  if (brandFirstWord && modelName.startsWith(`${brandFirstWord} `)) return modelName;

  return `${brandName} ${modelName}`.trim();
}

export default PrinterModuleService;
