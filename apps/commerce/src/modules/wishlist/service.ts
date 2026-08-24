import { MedusaService } from "@medusajs/framework/utils";
import { WishlistItem } from "./models";

class WishlistModuleService extends MedusaService({ WishlistItem }) {
  async listForCustomer(customerId: string) {
    return this.listWishlistItems({ customer_id: customerId }, { order: { created_at: "DESC" } });
  }

  /** Adds an item, ignoring duplicates. Returns true when something was added. */
  async add(customerId: string, productId: string, variantId?: string | null): Promise<boolean> {
    const existing = await this.listWishlistItems({
      customer_id: customerId,
      product_id: productId,
      variant_id: variantId ?? null,
    });
    if (existing.length > 0) return false;

    await this.createWishlistItems({
      customer_id: customerId,
      product_id: productId,
      variant_id: variantId ?? null,
    } as any);
    return true;
  }

  async remove(customerId: string, productId: string, variantId?: string | null): Promise<void> {
    const existing = await this.listWishlistItems({
      customer_id: customerId,
      product_id: productId,
      ...(variantId === undefined ? {} : { variant_id: variantId }),
    });
    if (existing.length === 0) return;
    await this.deleteWishlistItems(existing.map((entry) => entry.id));
  }

  /**
   * Merges a guest wishlist into the customer's account at login.
   * Returns how many items were actually new.
   */
  async mergeGuestItems(
    customerId: string,
    items: { productId: string; variantId?: string | null }[]
  ): Promise<number> {
    if (items.length === 0) return 0;

    const existing = await this.listWishlistItems({ customer_id: customerId });
    const key = (productId: string, variantId?: string | null) => `${productId}:${variantId ?? ""}`;
    const known = new Set(existing.map((entry) => key(entry.product_id, entry.variant_id)));

    const toCreate = items
      .filter((item) => !known.has(key(item.productId, item.variantId)))
      // Guard against a corrupted local-storage payload containing duplicates.
      .filter((item, index, all) => {
        const first = all.findIndex(
          (other) => key(other.productId, other.variantId) === key(item.productId, item.variantId)
        );
        return first === index;
      })
      .map((item) => ({
        customer_id: customerId,
        product_id: item.productId,
        variant_id: item.variantId ?? null,
      }));

    if (toCreate.length === 0) return 0;
    await this.createWishlistItems(toCreate as any);
    return toCreate.length;
  }
}

export default WishlistModuleService;
