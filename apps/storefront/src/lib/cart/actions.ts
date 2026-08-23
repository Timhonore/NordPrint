"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "../api/client";
import { clearCartId, ensureCart, getCartId } from "./cart";

/**
 * Cart mutations as server actions.
 *
 * Every one of them returns a discriminated result rather than throwing, so
 * the UI can show "Produktet blev udsolgt" in place instead of navigating the
 * customer to an error page mid-purchase.
 */

export interface ActionResult {
  readonly ok: boolean;
  readonly message?: string;
}

const GENERIC_ERROR = "Noget gik galt. Prøv igen.";

export async function addToCart(input: {
  variantId: string;
  quantity?: number;
}): Promise<ActionResult> {
  const cart = await ensureCart();
  if (!cart.ok) return { ok: false, message: cart.message };

  const result = await apiFetch(`/store/carts/${cart.data}/line-items`, {
    method: "POST",
    body: { variant_id: input.variantId, quantity: input.quantity ?? 1 },
    revalidate: 0,
  });

  if (!result.ok) {
    return {
      ok: false,
      // Medusa's inventory error is unhelpfully phrased for a customer.
      message: /inventory|stock|quantity/i.test(result.message)
        ? "Der er desværre ikke nok på lager."
        : (result.message ?? GENERIC_ERROR),
    };
  }

  revalidatePath("/kurv");
  return { ok: true };
}

export async function updateCartLine(input: {
  lineId: string;
  quantity: number;
}): Promise<ActionResult> {
  const cartId = await getCartId();
  if (!cartId) return { ok: false, message: "Kurven blev ikke fundet." };

  if (input.quantity <= 0) return removeCartLine({ lineId: input.lineId });

  const result = await apiFetch(`/store/carts/${cartId}/line-items/${input.lineId}`, {
    method: "POST",
    body: { quantity: input.quantity },
    revalidate: 0,
  });

  if (!result.ok) {
    return {
      ok: false,
      message: /inventory|stock|quantity/i.test(result.message)
        ? "Vi har ikke flere på lager lige nu."
        : (result.message ?? GENERIC_ERROR),
    };
  }

  revalidatePath("/kurv");
  return { ok: true };
}

export async function removeCartLine(input: { lineId: string }): Promise<ActionResult> {
  const cartId = await getCartId();
  if (!cartId) return { ok: false, message: "Kurven blev ikke fundet." };

  const result = await apiFetch(`/store/carts/${cartId}/line-items/${input.lineId}`, {
    method: "DELETE",
    revalidate: 0,
  });

  if (!result.ok) return { ok: false, message: result.message ?? GENERIC_ERROR };

  revalidatePath("/kurv");
  return { ok: true };
}

export async function applyPromotionCode(input: { code: string }): Promise<ActionResult> {
  const cartId = await getCartId();
  if (!cartId) return { ok: false, message: "Kurven blev ikke fundet." };

  const code = input.code.trim().toUpperCase();
  if (code.length === 0) return { ok: false, message: "Indtast en rabatkode." };

  const result = await apiFetch(`/store/carts/${cartId}/promotions`, {
    method: "POST",
    body: { promo_codes: [code] },
    revalidate: 0,
  });

  if (!result.ok) {
    return { ok: false, message: "Rabatkoden kunne ikke bruges. Tjek koden, og prøv igen." };
  }

  revalidatePath("/kurv");
  revalidatePath("/checkout");
  return { ok: true };
}

export async function removePromotionCode(input: { code: string }): Promise<ActionResult> {
  const cartId = await getCartId();
  if (!cartId) return { ok: false, message: "Kurven blev ikke fundet." };

  const result = await apiFetch(
    `/store/carts/${cartId}/promotions?promo_codes[]=${encodeURIComponent(input.code)}`,
    { method: "DELETE", revalidate: 0 }
  );

  if (!result.ok) return { ok: false, message: result.message ?? GENERIC_ERROR };

  revalidatePath("/kurv");
  revalidatePath("/checkout");
  return { ok: true };
}

/** Used after a completed order, and when a cart id turns out to be stale. */
export async function resetCart(): Promise<void> {
  await clearCartId();
  revalidatePath("/kurv");
}
