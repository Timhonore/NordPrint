import { NextResponse } from "next/server";
import { fetchProductsByHandle } from "@/lib/api/catalog";

/**
 * GET /api/favoritter?handles=a,b,c
 *
 * Resolves a guest's locally stored favourites to current product data —
 * prices and stock as they are now, not as they were when the customer saved
 * them.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const raw = new URL(request.url).searchParams.get("handles") ?? "";

  const handles = raw
    .split(",")
    .map((handle) => handle.trim())
    .filter(Boolean)
    // A corrupted local-storage payload must not turn into an unbounded query.
    .slice(0, 48);

  if (handles.length === 0) return NextResponse.json({ products: [] });

  const products = await fetchProductsByHandle(handles);

  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "private, max-age=30" } }
  );
}
