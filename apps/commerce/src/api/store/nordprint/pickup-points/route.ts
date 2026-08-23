import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { CARRIERS, carrierById, resolveAdapter } from "../../../../modules/fulfillment-danish-carriers/carriers";

/**
 * GET /store/nordprint/pickup-points?postal_code=8000&carrier=gls
 *
 * Pakkeshops near a postcode. Until carrier credentials exist the development
 * adapter answers — every point it returns is prefixed "[TEST]" so nobody
 * mistakes it for a real shop, and the response says so explicitly.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const postalCode = String(req.query.postal_code ?? "").trim();
  const carrierId = typeof req.query.carrier === "string" ? req.query.carrier : null;
  const limit = Math.min(20, Number(req.query.limit ?? 8) || 8);

  if (!/^\d{4}$/.test(postalCode)) {
    res.status(400).json({ message: "Angiv et gyldigt dansk postnummer" });
    return;
  }

  const carriers = carrierId
    ? [carrierById(carrierId)].filter((carrier): carrier is NonNullable<typeof carrier> =>
        Boolean(carrier)
      )
    : CARRIERS;

  if (carriers.length === 0) {
    res.status(400).json({ message: "Ukendt fragtfirma" });
    return;
  }

  const results = await Promise.all(
    carriers.map(async (carrier) => {
      const adapter = resolveAdapter(carrier);
      return {
        carrierId: carrier.id,
        carrierName: carrier.name,
        isDevelopmentStub: adapter.isDevelopmentStub,
        points: await adapter.pickupPoints(postalCode, limit),
      };
    })
  );

  res.json({ carriers: results });
}

export const AUTHENTICATE = false;
