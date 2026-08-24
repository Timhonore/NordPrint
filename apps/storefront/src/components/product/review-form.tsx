"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, TextField } from "@nordprint/ui";

/**
 * Write a review.
 *
 * Only for signed-in customers — an anonymous review is unverifiable, and
 * "Verificeret køb" is derived server-side from a real order rather than
 * claimed here.
 *
 * The form says plainly that nothing appears immediately. A customer who
 * writes a review and then cannot find it assumes it was lost.
 */
export function ReviewForm({
  productId,
  signedIn,
  productHandle,
}: {
  readonly productId: string;
  readonly signedIn: boolean;
  readonly productHandle: string;
}): React.JSX.Element {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState(5);
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!signedIn) {
    return (
      <p className="mt-4 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink-soft">
        <a
          href={`/konto/log-ind?retur=${encodeURIComponent(`/produkt/${productHandle}`)}`}
          className="font-medium text-accent underline-offset-2 hover:underline"
        >
          Log ind
        </a>{" "}
        for at skrive en anmeldelse. Så kan vi se, at købet er ægte.
      </p>
    );
  }

  if (done) {
    return (
      <p className="mt-4 rounded-lg border border-positive/25 bg-positive/5 px-4 py-3 text-sm text-positive">
        Tak. Din anmeldelse er sendt til gennemlæsning og vises, når den er godkendt.
      </p>
    );
  }

  if (!open) {
    return (
      <Button variant="secondary" className="mt-4" onClick={() => setOpen(true)}>
        Skriv en anmeldelse
      </Button>
    );
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    const data = new FormData(event.currentTarget);
    const body = String(data.get("body") ?? "").trim();

    if (body.length < 10) {
      setError("Skriv lidt mere — mindst 10 tegn.");
      return;
    }

    setPending(true);

    const response = await fetch(`/api/anmeldelser/${encodeURIComponent(productId)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating,
        title: String(data.get("title") ?? "").trim() || undefined,
        body,
      }),
    });

    setPending(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { message?: string } | null;
      setError(payload?.message ?? "Anmeldelsen kunne ikke sendes. Prøv igen.");
      return;
    }

    setDone(true);
    router.refresh();
  };

  return (
    <form
      onSubmit={(event) => void submit(event)}
      className="mt-4 space-y-4 rounded-xl border border-line bg-surface p-5"
    >
      <fieldset>
        <legend className="text-sm font-medium text-ink">Din bedømmelse</legend>
        {/* Radios rather than clickable stars: keyboard-operable, announced
            correctly, and the value is never ambiguous. */}
        <div className="mt-2 flex gap-1.5">
          {[1, 2, 3, 4, 5].map((value) => (
            <label
              key={value}
              className={`flex size-10 cursor-pointer items-center justify-center rounded-lg border text-sm font-medium transition-colors ${
                rating === value
                  ? "border-accent bg-accent text-white"
                  : "border-line text-ink-soft hover:border-accent"
              }`}
            >
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                className="sr-only"
              />
              {value}
              <span className="sr-only"> ud af 5</span>
            </label>
          ))}
        </div>
      </fieldset>

      <TextField name="title" label="Overskrift (valgfri)" maxLength={120} />

      <div>
        <label htmlFor="review-body" className="block text-sm font-medium text-ink">
          Hvordan gik det?
        </label>
        <textarea
          id="review-body"
          name="body"
          rows={5}
          required
          maxLength={4000}
          placeholder="Hvad printede du, på hvilken printer, og hvordan gik det?"
          className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div aria-live="polite">
        {error ? (
          <p className="rounded-lg border border-negative/25 bg-negative/5 px-3 py-2.5 text-sm text-negative">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Sender …" : "Send anmeldelse"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Fortryd
        </Button>
      </div>

      <p className="text-xs text-ink-faint">
        Anmeldelser gennemlæses, før de vises. Vi retter ikke i dem — vi afviser kun det, der er
        spam eller upassende.
      </p>
    </form>
  );
}
