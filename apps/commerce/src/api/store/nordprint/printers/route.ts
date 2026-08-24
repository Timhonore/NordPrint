import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { PRINTER_MODULE } from "../../../../modules/printer";
import type PrinterModuleService from "../../../../modules/printer/service";

/**
 * GET /store/nordprint/printers
 *
 * The full Brand → Familie → Model tree that powers "Shop efter printer" and
 * the "Min printer" selector. Adding Prusa or Creality is a data change; this
 * endpoint needs no modification.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const printerService = req.scope.resolve<PrinterModuleService>(PRINTER_MODULE);
  const models = await printerService.listModelsWithLineage();

  const brands = new Map<
    string,
    {
      id: string;
      name: string;
      handle: string;
      logoUrl: string | null;
      rank: number;
      families: Map<
        string,
        { id: string; name: string; handle: string; rank: number; models: unknown[] }
      >;
    }
  >();

  for (const model of models) {
    const brand = brands.get(model.brand.id) ?? {
      id: model.brand.id,
      name: model.brand.name,
      handle: model.brand.handle,
      logoUrl: model.brand.logoUrl,
      rank: model.brand.rank,
      families: new Map(),
    };

    const family = brand.families.get(model.family.id) ?? {
      id: model.family.id,
      name: model.family.name,
      handle: model.family.handle,
      rank: model.family.rank,
      models: [],
    };

    family.models.push({
      id: model.id,
      name: model.name,
      handle: model.handle,
      displayName: model.displayName,
      technology: model.technology,
      enclosed: model.enclosed,
      supportsAms: model.supportsAms,
      supportsAmsLite: model.supportsAmsLite,
      hardenedNozzleStock: model.hardenedNozzleStock,
      maxNozzleTemperature: model.maxNozzleTemperature,
      maxBedTemperature: model.maxBedTemperature,
      buildVolumeMm: model.buildVolumeMm,
      imageUrl: model.imageUrl,
    });

    brand.families.set(model.family.id, family);
    brands.set(model.brand.id, brand);
  }

  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=1800");
  res.json({
    brands: [...brands.values()]
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "da-DK"))
      .map((brand) => ({
        ...brand,
        families: [...brand.families.values()].sort((a, b) => a.rank - b.rank),
      })),
    models,
  });
}

export const AUTHENTICATE = false;
