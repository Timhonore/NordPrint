import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { WISHLIST_MODULE } from "../../../../modules/wishlist";
import type WishlistModuleService from "../../../../modules/wishlist/service";
import { loadProductDetail } from "../../../../lib/catalog/product-detail";

/**
 * Favourites for logged-in customers.
 *
 * Guests keep their wishlist in local storage. On login the storefront POSTs
 * the guest list to `/wishlist/merge`, so nothing a customer saved before
 * signing up is lost.
 *
 * The customer id always comes from the authenticated session — never from
 * the request body. Client-side authorisation is not authorisation.
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    res.status(401).json({ message: "Log ind for at se dine favoritter" });
    return;
  }

  const wishlistService = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE);
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);

  const items = await wishlistService.listForCustomer(customerId);
  if (items.length === 0) {
    res.json({ items: [] });
    return;
  }

  const handleRows = await knex.raw(
    `SELECT id, handle FROM product WHERE id = ANY(:ids) AND deleted_at IS NULL`,
    { ids: items.map((item) => item.product_id) }
  );
  const handleById = new Map<string, string>(
    (handleRows.rows ?? []).map((row: any) => [row.id, row.handle])
  );

  const products = await Promise.all(
    [...new Set(items.map((item) => handleById.get(item.product_id)))]
      .filter((handle): handle is string => Boolean(handle))
      .map((handle) => loadProductDetail(knex, handle))
  );

  res.json({
    items: items
      .map((item) => {
        const handle = handleById.get(item.product_id);
        const product = products.find((entry) => entry?.handle === handle);
        if (!product) return null;
        return { id: item.id, variantId: item.variant_id ?? null, product };
      })
      .filter(Boolean),
  });
}

export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    res.status(401).json({ message: "Log ind for at gemme favoritter" });
    return;
  }

  const body = (req.body ?? {}) as { productId?: string; variantId?: string | null };
  if (!body.productId) {
    res.status(400).json({ message: "productId mangler" });
    return;
  }

  const wishlistService = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE);
  const added = await wishlistService.add(customerId, body.productId, body.variantId ?? null);

  res.status(added ? 201 : 200).json({ added });
}

export async function DELETE(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const customerId = req.auth_context?.actor_id;
  if (!customerId) {
    res.status(401).json({ message: "Log ind for at ændre dine favoritter" });
    return;
  }

  const productId = typeof req.query.productId === "string" ? req.query.productId : null;
  if (!productId) {
    res.status(400).json({ message: "productId mangler" });
    return;
  }

  const wishlistService = req.scope.resolve<WishlistModuleService>(WISHLIST_MODULE);
  await wishlistService.remove(
    customerId,
    productId,
    typeof req.query.variantId === "string" ? req.query.variantId : undefined
  );

  res.status(204).send("");
}
