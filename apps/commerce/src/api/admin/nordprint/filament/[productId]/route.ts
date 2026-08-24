import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import type { ILinkModule } from "@medusajs/framework/types";
import { FILAMENT_MODULE } from "../../../../../modules/filament";
import type FilamentModuleService from "../../../../../modules/filament/service";

/**
 * Filament specification for one product.
 *
 * Medusa Admin's generic product form cannot express a filament datasheet, so
 * NordPrint ships its own widget (see src/admin/widgets) which talks to this
 * route.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const filamentService = req.scope.resolve<FilamentModuleService>(FILAMENT_MODULE);

  const [spec, definitions] = await Promise.all([
    filamentService.retrieveSpecByProduct(req.params.productId),
    filamentService.listFilamentAttributeDefinitions({}, { order: { rank: "ASC" } }),
  ]);

  res.json({ spec, definitions });
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const productId = req.params.productId;
  const body = (req.body ?? {}) as Record<string, unknown> & {
    attributes?: { key: string; value: string | number | boolean | null }[];
  };

  const filamentService = req.scope.resolve<FilamentModuleService>(FILAMENT_MODULE);
  const link = req.scope.resolve<ILinkModule>(ContainerRegistrationKeys.LINK);

  const { attributes, ...specFields } = body;

  const existing = await filamentService.listFilamentSpecs({ product_id: productId });
  let specId: string;

  if (existing[0]) {
    specId = existing[0].id;
    await filamentService.updateFilamentSpecs({ id: specId, ...specFields } as never);
  } else {
    const created = await filamentService.createFilamentSpecs({
      product_id: productId,
      ...specFields,
    } as never);
    specId = Array.isArray(created) ? created[0]!.id : (created as { id: string }).id;

    // Link the spec to the product so a single Query call can fetch both.
    await link.create([
      {
        [Modules.PRODUCT]: { product_id: productId },
        [FILAMENT_MODULE]: { filament_spec_id: specId },
      },
    ] as never);
  }

  if (Array.isArray(attributes)) {
    try {
      await filamentService.setAttributes(specId, attributes);
    } catch (error) {
      res
        .status(400)
        .json({ message: error instanceof Error ? error.message : "Ugyldige egenskaber" });
      return;
    }
  }

  res.json({ spec: await filamentService.retrieveSpecByProduct(productId) });
}
