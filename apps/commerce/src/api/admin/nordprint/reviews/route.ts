import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { REVIEW_MODULE } from "../../../../modules/review";
import type ReviewModuleService from "../../../../modules/review/service";

/** Review moderation queue. Nothing is published until someone approves it. */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const status = typeof req.query.status === "string" ? req.query.status : "pending";
  const service = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE);

  const reviews = await service.listProductReviews(
    { status },
    { order: { created_at: "DESC" }, take: 100 }
  );

  res.json({ reviews });
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const body = (req.body ?? {}) as {
    id?: string;
    status?: "approved" | "rejected";
    note?: string | null;
  };

  if (!body.id || (body.status !== "approved" && body.status !== "rejected")) {
    res.status(400).json({ message: "id og status (approved/rejected) er påkrævet" });
    return;
  }

  const service = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE);
  await service.moderate(
    body.id,
    body.status,
    req.auth_context?.actor_id ?? "ukendt",
    body.note ?? null
  );

  res.json({ ok: true });
}
