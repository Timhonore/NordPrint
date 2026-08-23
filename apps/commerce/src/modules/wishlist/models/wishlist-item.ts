import { model } from "@medusajs/framework/utils";

/**
 * Favourites for logged-in customers.
 *
 * Guests keep their wishlist in local storage; on login the guest list is
 * merged in (see `mergeGuestItems`) so nothing a customer saved is lost when
 * they finally create an account.
 */
export const WishlistItem = model
  .define("wishlist_item", {
    id: model.id({ prefix: "wish" }).primaryKey(),
    customer_id: model.text(),
    product_id: model.text(),
    /** Optional: the exact colour they fell in love with. */
    variant_id: model.text().nullable(),
  })
  .indexes([
    { on: ["customer_id", "product_id", "variant_id"], unique: true },
    { on: ["customer_id"] },
    { on: ["product_id"] },
  ]);
