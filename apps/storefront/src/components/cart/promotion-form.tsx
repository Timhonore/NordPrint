"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, cn } from "@nordprint/ui";
import { XIcon } from "@/components/icons";
import { applyPromotionCode, removePromotionCode } from "@/lib/cart/actions";

/**
 * Rabatkode.
 *
 * Codes are validated by the backend — the storefront never decides whether a
 * discount applies, it only shows the answer.
 */
export function PromotionForm({ codes }: { readonly codes: readonly string[] }): React.JSX.Element {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [status, setStatus] = React.useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = React.useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setStatus("sending");
    setMessage(null);

    const result = await applyPromotionCode({ code });

    if (!result.ok) {
      setStatus("error");
      setMessage(result.message ?? "Rabatkoden kunne ikke bruges.");
      return;
    }

    setStatus("idle");
    setCode("");
    router.refresh();
  };

  return (
    <div>
      <h2 className="text-base font-semibold">Rabatkode</h2>

      {codes.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {codes.map((entry) => (
            <li
              key={entry}
              className="flex items-center justify-between gap-2 rounded-lg bg-positive/8 px-3 py-2 text-sm"
            >
              <span className="font-mono font-medium text-positive">{entry}</span>
              <button
                type="button"
                onClick={async () => {
                  await removePromotionCode({ code: entry });
                  router.refresh();
                }}
                className="text-ink-faint hover:text-negative"
              >
                <XIcon className="size-4" />
                <span className="sr-only">Fjern rabatkoden {entry}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={submit} className="mt-3 flex gap-2">
        <label htmlFor="rabatkode" className="sr-only">
          Rabatkode
        </label>
        <input
          id="rabatkode"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="Indtast kode"
          autoComplete="off"
          aria-invalid={status === "error"}
          aria-describedby={message ? "rabatkode-besked" : undefined}
          className={cn(
            "h-11 min-w-0 flex-1 rounded-lg border bg-surface px-3 font-mono text-sm uppercase placeholder:font-sans placeholder:normal-case placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/30",
            status === "error" ? "border-negative" : "border-line focus:border-accent"
          )}
        />
        <Button
          type="submit"
          variant="secondary"
          disabled={status === "sending" || code.length === 0}
        >
          {status === "sending" ? "…" : "Anvend"}
        </Button>
      </form>

      {message ? (
        <p id="rabatkode-besked" role="alert" className="mt-2 text-sm text-negative">
          {message}
        </p>
      ) : null}
    </div>
  );
}
