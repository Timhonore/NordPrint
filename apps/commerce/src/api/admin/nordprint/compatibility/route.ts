import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { COMPATIBILITY_MODULE } from "../../../../modules/compatibility";
import type CompatibilityModuleService from "../../../../modules/compatibility/service";
import { PRINTER_MODULE } from "../../../../modules/printer";
import type PrinterModuleService from "../../../../modules/printer/service";

/**
 * Compatibility rules for one product.
 *
 * `GET  ?subjectId=prod_…` lists them, `POST` upserts one.
 * A "conditional" rule without a note is rejected — a condition nobody can
 * read is not a condition, it is a guess.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const subjectIds = String(req.query.subjectId ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (subjectIds.length === 0) {
    res.status(400).json({ message: "subjectId mangler" });
    return;
  }

  const service = req.scope.resolve<CompatibilityModuleService>(COMPATIBILITY_MODULE);
  const printerService = req.scope.resolve<PrinterModuleService>(PRINTER_MODULE);

  const rules = await service.listRulesForAdmin(subjectIds);

  // Resolve the target ids to names. Without this the admin shows a list of
  // ULIDs, and nobody can tell which rule is the one for the X1 Carbon.
  const names = await printerService.resolveTargetNames(
    rules.map((rule) => ({ targetType: rule.targetType, targetId: rule.targetId }))
  );

  res.json({
    rules: rules.map((rule) => ({
      ...rule,
      targetName: names.get(`${rule.targetType}:${rule.targetId}`) ?? rule.targetId,
    })),
  });
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const body = (req.body ?? {}) as {
    subjectType?: "product" | "variant";
    subjectId?: string;
    targetType?: "printer_model" | "printer_family" | "printer_brand";
    targetId?: string;
    status?: "compatible" | "incompatible" | "conditional" | "unknown";
    note?: string | null;
  };

  if (!body.subjectId || !body.targetType || !body.targetId || !body.status) {
    res.status(400).json({ message: "subjectId, targetType, targetId og status er påkrævet" });
    return;
  }

  const service = req.scope.resolve<CompatibilityModuleService>(COMPATIBILITY_MODULE);

  try {
    await service.upsertRule({
      subjectType: body.subjectType ?? "product",
      subjectId: body.subjectId,
      targetType: body.targetType,
      targetId: body.targetId,
      status: body.status,
      note: body.note ?? null,
    });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Ugyldig regel" });
    return;
  }

  res.json({ ok: true });
}

export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const id = typeof req.query.id === "string" ? req.query.id : null;
  if (!id) {
    res.status(400).json({ message: "id mangler" });
    return;
  }

  const service = req.scope.resolve<CompatibilityModuleService>(COMPATIBILITY_MODULE);
  await service.deleteCompatibilityRules([id]);
  res.status(204).send("");
}
