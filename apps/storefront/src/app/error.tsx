"use client";

import * as React from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@nordprint/ui";
import { AlertIcon } from "@/components/icons";

/**
 * Route-level error boundary.
 *
 * The customer gets a plain explanation and a retry. The digest is shown
 * because it is the one thing support can correlate with the server log —
 * the underlying message never is, since it can leak internals.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): React.JSX.Element {
  React.useEffect(() => {
    // Reported to the error monitor by the global handler; this keeps a trace
    // in the browser console for local debugging.
    console.error("[nordprint] route error", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="container-page flex min-h-[60vh] max-w-lg flex-col items-center justify-center py-16 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-negative/10 text-negative">
        <AlertIcon className="size-6" />
      </span>

      <h1 className="mt-4 text-2xl font-bold tracking-tight">Der gik noget galt</h1>
      <p className="mt-2 text-ink-soft">
        Vi kunne ikke vise siden lige nu. Din kurv er ikke gået tabt.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button onClick={reset}>Prøv igen</Button>
        <Link href="/" className={buttonVariants({ variant: "secondary" })}>
          Til forsiden
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-6 font-mono text-xs text-ink-faint">Fejlreference: {error.digest}</p>
      ) : null}
    </div>
  );
}
