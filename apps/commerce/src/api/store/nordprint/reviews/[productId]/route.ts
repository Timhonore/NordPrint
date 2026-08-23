import type { AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { REVIEW_MODULE } from "../../../../../modules/review";
import type ReviewModuleService from "../../../../../modules/review/service";

/** GET /store/nordprint/reviews/:productId — approved reviews only. */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE);
  const productId = req.params.productId;

  const limit = Math.min(50, Number(req.query.limit ?? 20) || 20);
  const offset = Math.max(0, Number(req.query.offset ?? 0) || 0);

  const [reviews, summaries] = await Promise.all([
    reviewService.listPublished(productId, limit, offset),
    reviewService.summarize([productId]),
  ]);

  res.json({
    summary: summaries.get(productId) ?? {
      average: null,
      count: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    },
    reviews: reviews.map((review) => ({
      id: review.id,
      authorName: review.author_name,
      rating: review.rating,
      title: review.title ?? null,
      body: review.body,
      verifiedPurchase: Boolean(review.verified_purchase),
      createdAt: new Date(review.created_at).toISOString(),
    })),
  });
}

/**
 * POST /store/nordprint/reviews/:productId
 *
 * Reviews always land in moderation — nothing is published automatically.
 * "Verificeret køb" is derived here from a real, completed order belonging to
 * the authenticated customer; it can never be set by the client.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    res.status(401).json({ message: "Log ind for at skrive en anmeldelse" });
    return;
  }

  const productId = req.params.productId;
  const body = (req.body ?? {}) as {
    rating?: number;
    title?: string;
    body?: string;
    authorName?: string;
  };

  if (typeof body.rating !== "number" || typeof body.body !== "string") {
    res.status(400).json({ message: "Bedømmelse og tekst er påkrævet" });
    return;
  }

  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);

  // Look for a completed order from this customer containing this product.
  const purchase = await knex.raw(
    `SELECT o.id
     FROM "order" o
     JOIN order_item oi ON oi.order_id = o.id AND oi.deleted_at IS NULL
     JOIN order_line_item oli ON oli.id = oi.item_id AND oli.deleted_at IS NULL
     WHERE o.customer_id = :customerId
       AND o.deleted_at IS NULL
       AND o.status <> 'canceled'
       AND oli.product_id = :productId
     LIMIT 1`,
    { customerId, productId }
  );
  const orderId: string | null = purchase.rows?.[0]?.id ?? null;

  const reviewService = req.scope.resolve<ReviewModuleService>(REVIEW_MODULE);

  try {
    await reviewService.submit({
      productId,
      customerId,
      orderId,
      authorName: body.authorName?.trim() || "NordPrint-kunde",
      rating: body.rating,
      title: body.title ?? null,
      body: body.body,
    });
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : "Ugyldig anmeldelse" });
    return;
  }

  res.status(202).json({
    message: "Tak! Din anmeldelse bliver gennemlæst, før den vises.",
    verifiedPurchase: Boolean(orderId),
  });
}
