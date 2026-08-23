import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";

/**
 * POST /api/anbefalinger
 *
 * Proxy for the guided selector. The rule engine runs in the commerce backend
 * so the same recommendations are available to any future channel — an app, a
 * chatbot, an e-mail — not just this wizard.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Ugyldig forespørgsel." }, { status: 400 });
  }

  const result = await apiFetch<unknown>("/store/nordprint/recommendations", {
    method: "POST",
    body,
    revalidate: 0,
  });

  if (!result.ok) {
    return NextResponse.json({ message: result.message }, { status: result.status });
  }

  return NextResponse.json(result.data, {
    headers: { "Cache-Control": "no-store" },
  });
}
