import { NextResponse } from "next/server";
import { fetchPrinters } from "@/lib/api/catalog";

/**
 * GET /api/printere
 *
 * The printer tree for the "Min printer" dialog. Proxied through our own
 * origin so the publishable key stays server-side; cached hard, because the
 * printer database changes a few times a year.
 */
export async function GET(): Promise<NextResponse> {
  const tree = await fetchPrinters();
  return NextResponse.json(tree, {
    headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" },
  });
}
