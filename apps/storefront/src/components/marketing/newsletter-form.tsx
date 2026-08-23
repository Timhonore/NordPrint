"use client";

import * as React from "react";
import { Button, cn } from "@nordprint/ui";

/**
 * Newsletter sign-up.
 *
 * Consent is explicit and unticked by default — a pre-ticked box is not
 * consent under GDPR, and a Danish shop gets fined for it. The e-mail is only
 * sent once the box is ticked, and the wording says what they are signing up
 * for.
 */
export function NewsletterForm({ className }: { className?: string }): React.JSX.Element {
  const [email, setEmail] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const [status, setStatus] = React.useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = React.useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!consent) {
      setMessage("Sæt flueben i samtykket, før du tilmelder dig.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setMessage(null);

    try {
      const response = await fetch("/api/nyhedsbrev", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, consent }),
      });
      const body = (await response.json()) as { message?: string };

      if (!response.ok) {
        setStatus("error");
        setMessage(body.message ?? "Tilmeldingen kunne ikke gennemføres.");
        return;
      }

      setStatus("done");
      setMessage(body.message ?? "Tak! Tjek din indbakke for at bekræfte.");
      setEmail("");
      setConsent(false);
    } catch {
      setStatus("error");
      setMessage("Der var et problem med forbindelsen. Prøv igen.");
    }
  };

  if (status === "done") {
    return (
      <p className={cn("rounded-lg border border-white/15 bg-white/5 p-4 text-sm", className)}>
        {message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-3", className)} noValidate>
      <div>
        <label htmlFor="nyhedsbrev-email" className="block text-sm font-medium">
          Nyhedsbrev
        </label>
        <p className="mt-1 text-xs text-white/55">
          Nye materialer, guides og tilbud. Cirka én mail om måneden.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          id="nyhedsbrev-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="din@mail.dk"
          aria-describedby={message ? "nyhedsbrev-besked" : undefined}
          aria-invalid={status === "error"}
          className="h-11 min-w-0 flex-1 rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
        />
        <Button
          type="submit"
          disabled={status === "sending"}
          className="bg-white text-ink hover:bg-white/90"
        >
          {status === "sending" ? "Sender …" : "Tilmeld"}
        </Button>
      </div>

      <label className="flex items-start gap-2.5 text-xs text-white/60">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 rounded border-white/25 bg-white/5 accent-[--color-accent]"
        />
        <span>
          Ja tak, jeg vil gerne modtage nyhedsbrevet. Jeg kan afmelde når som helst, og mine
          data behandles efter{" "}
          <a href="/privatliv" className="underline hover:text-white">
            privatlivspolitikken
          </a>
          .
        </span>
      </label>

      {message ? (
        <p
          id="nyhedsbrev-besked"
          role={status === "error" ? "alert" : "status"}
          className={cn("text-xs", status === "error" ? "text-red-300" : "text-white/70")}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
