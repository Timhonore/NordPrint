import "server-only";

import type { ProductSummary } from "@nordprint/types";
import { apiFetch, type ApiResult } from "../api/client";
import { withCustomerToken } from "./session";

/**
 * The signed-in customer\'s favourites, from the database.
 *
 * Guests keep theirs in local storage; once there is an account, the account
 * is the source of truth, so favourites saved on a phone show up on a laptop.
 */
export async function fetchAccountWishlist(): Promise<ApiResult<ProductSummary[]>> {
  const result = await withCustomerToken((token) =>
    apiFetch<{ items: { product: ProductSummary }[] }>("/store/nordprint/wishlist", {
      token,
      revalidate: 0,
    })
  );

  if (!result.ok) return result;

  return {
    ok: true,
    data: result.data.items.map((item) => item.product).filter(Boolean),
  };
}
