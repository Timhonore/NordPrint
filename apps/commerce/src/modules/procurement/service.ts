import { MedusaService } from "@medusajs/framework/utils";
import { VariantCost } from "./models";

class ProcurementModuleService extends MedusaService({ VariantCost }) {
  async getCostMap(variantIds: string[]): Promise<Map<string, number>> {
    if (variantIds.length === 0) return new Map();
    const costs = await this.listVariantCosts({ variant_id: variantIds });
    return new Map(costs.map((cost) => [cost.variant_id, cost.cost_price]));
  }

  /** Upsert by variant — CSV imports call this thousands of times. */
  async setCost(input: {
    variantId: string;
    costPrice: number;
    currencyCode?: string;
    supplierName?: string | null;
    supplierSku?: string | null;
    note?: string | null;
  }): Promise<void> {
    if (!Number.isFinite(input.costPrice) || input.costPrice < 0) {
      throw new Error("Indkøbsprisen skal være et positivt beløb");
    }

    const [existing] = await this.listVariantCosts({ variant_id: input.variantId });
    const payload = {
      cost_price: Math.round(input.costPrice),
      currency_code: input.currencyCode ?? "dkk",
      supplier_name: input.supplierName ?? null,
      supplier_sku: input.supplierSku ?? null,
      note: input.note ?? null,
      last_purchased_at: new Date(),
    };

    if (existing) {
      await this.updateVariantCosts({ id: existing.id, ...payload } as any);
      return;
    }
    await this.createVariantCosts({ variant_id: input.variantId, ...payload } as any);
  }
}

export default ProcurementModuleService;
