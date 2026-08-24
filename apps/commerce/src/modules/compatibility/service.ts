import { MedusaService } from "@medusajs/framework/utils";
import type {
  CompatibilityRule as CompatibilityRuleDTO,
  CompatibilityVerdict,
  PrinterModelWithLineage,
} from "@nordprint/types";
import { resolveCompatibility } from "@nordprint/commerce";
import { CompatibilityRule } from "./models";

/**
 * Compatibility module.
 *
 * The *resolution* logic lives in `@nordprint/commerce` so that the storefront
 * can apply exactly the same precedence rules client-side when it already
 * holds the rules — the backend and the UI can never disagree about whether
 * something fits.
 */
class CompatibilityModuleService extends MedusaService({
  CompatibilityRule,
}) {
  /**
   * Verdict for one product (optionally including its variants) against the
   * customer's printer. Returns "unknown" — never an optimistic "compatible" —
   * when nothing has been recorded.
   */
  async resolveForSubjects(
    subjectIds: string[],
    printer: PrinterModelWithLineage | null
  ): Promise<CompatibilityVerdict> {
    if (!printer || subjectIds.length === 0) {
      return {
        status: "unknown",
        note: null,
        matchedOn: null,
        printerModelId: printer?.id ?? null,
        printerDisplayName: printer?.displayName ?? null,
      };
    }

    const rules = await this.listRulesForSubjects(subjectIds, printer);
    return resolveCompatibility(rules, printer, subjectIds);
  }

  /**
   * Batch verdicts for a product listing. One query for the whole page —
   * the compatibility badge must not cost 24 round trips.
   */
  async resolveForManySubjects(
    subjectIds: string[],
    printer: PrinterModelWithLineage | null
  ): Promise<Map<string, CompatibilityVerdict>> {
    const result = new Map<string, CompatibilityVerdict>();
    if (!printer || subjectIds.length === 0) return result;

    const rules = await this.listRulesForSubjects(subjectIds, printer);
    const bySubject = new Map<string, CompatibilityRuleDTO[]>();
    for (const rule of rules) {
      const list = bySubject.get(rule.subjectId) ?? [];
      list.push(rule);
      bySubject.set(rule.subjectId, list);
    }

    for (const subjectId of subjectIds) {
      result.set(
        subjectId,
        resolveCompatibility(bySubject.get(subjectId) ?? [], printer, [subjectId])
      );
    }
    return result;
  }

  /** All rules that could possibly apply to these subjects and this printer. */
  private async listRulesForSubjects(
    subjectIds: string[],
    printer: PrinterModelWithLineage
  ): Promise<CompatibilityRuleDTO[]> {
    const rows = await this.listCompatibilityRules({
      subject_id: subjectIds,
      target_id: [printer.id, printer.familyId, printer.brandId].filter(Boolean),
    });
    return rows.map(toRuleDto);
  }

  /** Which printers a product is explicitly known to fit. */
  async listCompatiblePrinterTargets(
    subjectIds: string[]
  ): Promise<{ targetType: string; targetId: string; status: string; note: string | null }[]> {
    if (subjectIds.length === 0) return [];
    const rows = await this.listCompatibilityRules({ subject_id: subjectIds });
    return rows.map((row) => ({
      targetType: row.target_type,
      targetId: row.target_id,
      status: row.status,
      note: row.note ?? null,
    }));
  }

  /** Idempotent upsert — re-importing a compatibility sheet must not duplicate. */
  async upsertRule(input: {
    subjectType?: "product" | "variant";
    subjectId: string;
    targetType: "printer_model" | "printer_family" | "printer_brand";
    targetId: string;
    status: "compatible" | "incompatible" | "conditional" | "unknown";
    note?: string | null;
  }): Promise<void> {
    if (input.status === "conditional" && !input.note) {
      throw new Error(
        'En betinget kompatibilitet skal have en note, fx "Passer hvis AMS Hub anvendes."'
      );
    }

    const subjectType = input.subjectType ?? "product";
    const [existing] = await this.listCompatibilityRules({
      subject_type: subjectType,
      subject_id: input.subjectId,
      target_type: input.targetType,
      target_id: input.targetId,
    });

    if (existing) {
      await this.updateCompatibilityRules({
        id: existing.id,
        status: input.status,
        note: input.note ?? null,
      } as any);
      return;
    }

    await this.createCompatibilityRules({
      subject_type: subjectType,
      subject_id: input.subjectId,
      target_type: input.targetType,
      target_id: input.targetId,
      status: input.status,
      note: input.note ?? null,
    } as any);
  }
}

function toRuleDto(row: any): CompatibilityRuleDTO {
  return {
    id: row.id,
    subjectType: row.subject_type,
    subjectId: row.subject_id,
    targetType: row.target_type,
    targetId: row.target_id,
    status: row.status,
    note: row.note ?? null,
    createdAt: row.created_at?.toISOString?.() ?? String(row.created_at ?? ""),
    updatedAt: row.updated_at?.toISOString?.() ?? String(row.updated_at ?? ""),
  };
}

export default CompatibilityModuleService;
