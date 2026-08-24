import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { GUIDE_MODULE } from "../../../../../modules/guide";
import type GuideModuleService from "../../../../../modules/guide/service";

/** GET /store/nordprint/guides/:slug — one published guide. */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const guideService = req.scope.resolve<GuideModuleService>(GUIDE_MODULE);
  const guide = await guideService.retrieveBySlug(req.params.slug);

  if (!guide) {
    res.status(404).json({ message: "Guiden findes ikke" });
    return;
  }

  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=300, stale-while-revalidate=1800");
  res.json({ guide });
}

export const AUTHENTICATE = false;
