import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { GUIDE_MODULE } from "../../../../modules/guide";
import type GuideModuleService from "../../../../modules/guide/service";

/** GET /store/nordprint/guides — published guides, newest first. */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const guideService = req.scope.resolve<GuideModuleService>(GUIDE_MODULE);
  const limit = Math.min(50, Number(req.query.limit ?? 24) || 24);
  const offset = Math.max(0, Number(req.query.offset ?? 0) || 0);

  const guides = await guideService.listPublished(limit, offset);

  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=1800");
  res.json({ guides });
}

export const AUTHENTICATE = false;
