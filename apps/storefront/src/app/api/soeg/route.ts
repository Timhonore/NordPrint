import { NextResponse } from "next/server";
import { fetchSuggestions } from "@/lib/api/catalog";

/**
 * GET /api/soeg?q=…
 *
 * Proxy for the header autocomplete.
 *
 * It exists so the publishable API key stays on the server: the browser talks
 * to its own origin, and this route adds the credentials. It also means the
 * commerce backend does not need to be reachable from the public internet at
 * all if a deployment chooses not to expose it.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const term = new URL(request.url).searchParams.get("q") ?? "";

  if (term.trim().length < 2) {
    return NextResponse.json({ products: [], categories: [], guides: [], query: term });
  }

  const result = await fetchSuggestions(term);

  return NextResponse.json(result, {
    headers: { "Cache-Control": "private, max-age=15" },
  });
}
