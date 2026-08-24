import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { getSessionToken } from "@/lib/account/session";

/**
 * POST /api/anmeldelser/:productId
 *
 * Proxy for review submission. It exists so the customer's JWT stays in the
 * httpOnly cookie: the browser never holds the token, and the review form
 * therefore cannot send it. The server reads the cookie and forwards it.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
): Promise<NextResponse> {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Log ind for at skrive en anmeldelse." }, { status: 401 });
  }

  const { productId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Ugyldig forespørgsel." }, { status: 400 });
  }

  const result = await apiFetch(`/store/nordprint/reviews/${encodeURIComponent(productId)}`, {
    method: "POST",
    token,
    body,
    revalidate: 0,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        message:
          result.status === 409
            ? "Du har allerede anmeldt denne vare."
            : "Anmeldelsen kunne ikke sendes. Prøv igen.",
      },
      { status: result.status }
    );
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
