import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { PRINTER_MODULE } from "../../../../modules/printer";
import type PrinterModuleService from "../../../../modules/printer/service";

/**
 * GET /admin/nordprint/printers
 *
 * Every target a compatibility rule can point at, flattened and labelled for
 * a picker: a single model, a whole family, or an entire manufacturer.
 *
 * The storefront's `/store/nordprint/printers` returns the same data as a
 * tree, but it requires a publishable key the admin does not carry — and the
 * admin needs a flat, selectable list rather than a navigable tree anyway.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const printerService = req.scope.resolve<PrinterModuleService>(PRINTER_MODULE);

  const [models, families, brands] = await Promise.all([
    printerService.listModelsWithLineage(),
    printerService.listPrinterFamilies({}, { relations: ["brand"], order: { name: "ASC" } }),
    printerService.listPrinterBrands({}, { order: { name: "ASC" } }),
  ]);

  const brandNameById = new Map(brands.map((brand) => [brand.id, brand.name]));

  res.json({
    targets: [
      // Broadest first: a rule that covers a whole manufacturer is the one an
      // operator reaches for most often ("alt vores PLA passer i alle Bambu").
      ...brands.map((brand) => ({
        targetType: "printer_brand" as const,
        targetId: brand.id,
        label: `${brand.name} — alle printere`,
        group: brand.name,
      })),
      ...families.map((family) => {
        const brandName =
          (family as { brand?: { name?: string } }).brand?.name ??
          brandNameById.get((family as { brand_id?: string }).brand_id ?? "") ??
          "";
        return {
          targetType: "printer_family" as const,
          targetId: family.id,
          label: `${brandName} ${family.name} — hele serien`.trim(),
          group: brandName,
        };
      }),
      ...models.map((model) => ({
        targetType: "printer_model" as const,
        targetId: model.id,
        label: model.displayName ?? model.name,
        group: model.brand.name,
      })),
    ],
  });
}
