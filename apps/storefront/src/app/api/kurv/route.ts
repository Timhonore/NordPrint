import { NextResponse } from "next/server";
import { fetchCart } from "@/lib/cart/cart";

/**
 * GET /api/kurv
 *
 * The mini cart's data source. Reads the cart id from the httpOnly cookie, so
 * the browser never has to hold it and cannot forge it.
 */
export async function GET(): Promise<NextResponse> {
  const cart = await fetchCart();
  return NextResponse.json({ cart }, { headers: { "Cache-Control": "no-store, private" } });
}
