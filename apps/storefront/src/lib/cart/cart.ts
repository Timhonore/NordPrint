import "server-only";

import { cookies } from "next/headers";
import type { CartLine, CartSummary, Money } from "@nordprint/types";
import {
  calculateFreeShippingProgress,
  money,
  resolveStockStatus,
} from "@nordprint/commerce";
import { commerceConfig } from "@nordprint/config";
import { apiFetch, type ApiResult } from "../api/client";

/**
 * Cart access.
 *
 * The cart lives in Medusa; the browser only ever holds its id, in an
 * httpOnly cookie. Nothing about prices, discounts or availability is
 * computed client-side, because a customer who edits localStorage must not be
 * able to change what they are charged.
 */

const CART_COOKIE = "nordprint_cart_id";
const REGION_COOKIE = "nordprint_region_id";
/** A cart is a shopping session, not a login: 30 days is generous but finite. */
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function getCartId(): Promise<string | null> {
  const store = await cookies();
  return store.get(CART_COOKIE)?.value ?? null;
}

export async function setCartId(cartId: string): Promise<void> {
  const store = await cookies();
  store.set(CART_COOKIE, cartId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: CART_COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function clearCartId(): Promise<void> {
  const store = await cookies();
  store.delete(CART_COOKIE);
}

interface MedusaRegion {
  id: string;
  currency_code: string;
  countries: { iso_2: string }[];
}

/** The Danish region. Cached in a cookie so we do not look it up per request. */
export async function getRegionId(): Promise<string | null> {
  const store = await cookies();
  const cached = store.get(REGION_COOKIE)?.value;
  if (cached) return cached;

  const result = await apiFetch<{ regions: MedusaRegion[] }>("/store/regions", {
    revalidate: 3600,
  });
  if (!result.ok) return null;

  const region =
    result.data.regions.find((entry) =>
      entry.countries.some((country) => country.iso_2 === commerceConfig.defaultCountry)
    ) ?? result.data.regions[0];

  return region?.id ?? null;
}

interface MedusaLineItem {
  id: string;
  title: string;
  subtitle: string | null;
  thumbnail: string | null;
  quantity: number;
  unit_price: number;
  original_total: number;
  total: number;
  variant_id: string;
  product_id: string;
  product_handle: string | null;
  variant_title: string | null;
  variant_sku: string | null;
  variant?: { id: string; sku: string | null; manage_inventory: boolean; weight: number | null };
}

interface MedusaCart {
  id: string;
  email: string | null;
  currency_code: string;
  items: MedusaLineItem[];
  subtotal: number;
  discount_total: number;
  shipping_total: number;
  tax_total: number;
  total: number;
  promotions?: { code: string }[];
}

export async function fetchCart(): Promise<CartSummary | null> {
  const cartId = await getCartId();
  if (!cartId) return null;

  const result = await apiFetch<{ cart: MedusaCart }>(
    `/store/carts/${cartId}?fields=*items,*items.variant,*promotions`,
    { revalidate: 0 }
  );

  // A stale cart id (completed, or wiped by a reseed) must not brick the site.
  if (!result.ok) return null;

  return toCartSummary(result.data.cart);
}

/** Creates a cart on demand; returns its id. */
export async function ensureCart(): Promise<ApiResult<string>> {
  const existing = await getCartId();
  if (existing) {
    const check = await apiFetch<{ cart: MedusaCart }>(`/store/carts/${existing}`, {
      revalidate: 0,
    });
    if (check.ok) return { ok: true, data: existing };
    await clearCartId();
  }

  const regionId = await getRegionId();
  const created = await apiFetch<{ cart: MedusaCart }>("/store/carts", {
    method: "POST",
    body: regionId ? { region_id: regionId } : {},
    revalidate: 0,
  });

  if (!created.ok) return created;

  await setCartId(created.data.cart.id);
  return { ok: true, data: created.data.cart.id };
}

/**
 * Maps a Medusa cart to the storefront's `CartSummary`.
 *
 * Medusa reports money in the major unit; NordPrint works in minor units
 * everywhere. The conversion happens here, once.
 */
export function toCartSummary(cart: MedusaCart): CartSummary {
  const currencyCode = cart.currency_code.toUpperCase();
  const toMinor = (amount: number | null | undefined): number => Math.round((amount ?? 0) * 100);
  const asMoney = (amount: number | null | undefined): Money =>
    money(toMinor(amount), currencyCode);

  const lines: CartLine[] = (cart.items ?? []).map((item) => {
    const unitPrice = asMoney(item.unit_price);
    const total = asMoney(item.total);
    const originalTotal = toMinor(item.original_total);

    return {
      id: item.id,
      productId: item.product_id,
      productHandle: item.product_handle ?? "",
      variantId: item.variant_id,
      title: item.title,
      variantTitle: item.variant_title,
      // The colour is the first half of our variant titles ("Jet Black / 1 kg").
      colorName: item.variant_title?.split(" / ")[0] ?? null,
      colorHex: null,
      sku: item.variant_sku ?? item.variant?.sku ?? null,
      thumbnail: item.thumbnail,
      quantity: item.quantity,
      unitPrice,
      originalUnitPrice:
        originalTotal > total.amount && item.quantity > 0
          ? money(Math.round(originalTotal / item.quantity), currencyCode)
          : null,
      total,
      // Availability is re-checked at checkout; this is the display hint.
      stock: resolveStockStatus(item.quantity, { manageInventory: false }),
      maxQuantity: null,
    };
  });

  const subtotal = asMoney(cart.subtotal);

  return {
    id: cart.id,
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal,
    discountTotal: asMoney(cart.discount_total),
    shippingTotal: cart.shipping_total === null ? null : asMoney(cart.shipping_total),
    taxTotal: asMoney(cart.tax_total),
    total: asMoney(cart.total),
    currencyCode,
    freeShipping: calculateFreeShippingProgress(subtotal),
    promotionCodes: (cart.promotions ?? []).map((promotion) => promotion.code),
    totalWeightG: (cart.items ?? []).reduce(
      (sum, item) => sum + (item.variant?.weight ?? 0) * item.quantity,
      0
    ),
  };
}

export const CART_COOKIE_NAME = CART_COOKIE;
