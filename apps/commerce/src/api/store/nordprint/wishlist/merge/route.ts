import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { WISHLIST_MODULE } from "../../../../../modules/wishlist";
import type WishlistModuleService from "../../../../../modules/wishlist/service";

/**
 * POST /store/nordprint/wishlist/merge
 *
 * Called once, right after login, with whatever the guest had in local
 * storage. Existing account entries win; duplicates are ignored.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    res.status(401).json({ message: "Log ind først" });
    return;
  }

  const body = (req.body ?? {}) as {
    items?: { productId?: string; variantId?: string | null }[];
  };

  const items = (body.items ?? [])
    .filter(
      (item): item is { productId: string; variantId?: string | null } =>
        typeof item?.productId === "string"
    )
    // A corrupted local-storage payload must not become an unbounded insert.
    .slice(0, 200);

  const wishlistService = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE);
  const merged = await wishlistService.mergeGuestItems(customerId, items);

  res.json({ merged });
}
