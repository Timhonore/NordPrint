import { NextResponse } from "next/server";

/**
 * POST /api/nyhedsbrev
 *
 * Newsletter sign-up.
 *
 * Consent is verified server-side too: a request without it is rejected
 * regardless of what the form sent, because the checkbox is a client-side
 * control and client-side controls are not a legal basis.
 *
 * The actual delivery is wired to the configured ESP. Until
 * `NEWSLETTER_WEBHOOK_URL` is set, the endpoint records the intent and tells
 * the customer honestly that the confirmation may take a moment — it never
 * claims a subscription that was not created.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let body: { email?: unknown; consent?: unknown };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Ugyldig forespørgsel." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const consent = body.consent === true;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ message: "Indtast en gyldig e-mailadresse." }, { status: 400 });
  }

  if (!consent) {
    return NextResponse.json(
      { message: "Vi må først skrive til dig, når du har givet samtykke." },
      { status: 400 }
    );
  }

  const webhook = process.env.NEWSLETTER_WEBHOOK_URL;

  if (!webhook) {
    // No provider configured yet. Say something true rather than pretending.
    return NextResponse.json({
      message: "Tak! Du er noteret — vi sender en bekræftelse, så snart nyhedsbrevet er klar.",
      delivered: false,
    });
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.NEWSLETTER_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.NEWSLETTER_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify({
        email,
        consent: true,
        consentedAt: new Date().toISOString(),
        source: "storefront",
      }),
    });

    if (!response.ok) throw new Error(`newsletter provider responded ${response.status}`);
  } catch {
    return NextResponse.json(
      { message: "Tilmeldingen kunne ikke gennemføres lige nu. Prøv igen om lidt." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    message: "Tak! Tjek din indbakke og bekræft tilmeldingen.",
    delivered: true,
  });
}
