"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { CartSummary } from "@nordprint/types";
import { formatMoney } from "@nordprint/commerce";
import { VisuallyHidden, cn } from "@nordprint/ui";
import { removeCartLine, updateCartLine } from "@/lib/cart/actions";
import { QuantityStepper } from "./quantity-stepper";

/**
 * The cart's line items.
 *
 * Mutations go through server actions, and the page is refreshed from the
 * server afterwards rather than patched optimistically: the customer is about
 * to pay, and the totals they see must be the ones the backend calculated.
 */
export function CartLines({ cart }: { readonly cart: CartSummary }): React.JSX.Element {
  const router = useRouter();
  const [pending, setPending] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const mutate = async (
    lineId: string,
    action: () => Promise<{ ok: boolean; message?: string }>
  ): Promise<void> => {
    setPending(lineId);
    setError(null);

    const result = await action();

    setPending(null);
    if (!result.ok) {
      setError(result.message ?? "Ændringen kunne ikke gennemføres.");
      return;
    }

    router.refresh();
    window.dispatchEvent(new CustomEvent("nordprint:cart-changed"));
  };

  return (
    <>
      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-negative/25 bg-negative/5 px-3 py-2.5 text-sm text-negative"
        >
          {error}
        </p>
      ) : null}

      <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
        {cart.lines.map((line) => (
          <li
            key={line.id}
            className={cn(
              "flex gap-4 p-4 transition-opacity sm:p-5",
              pending === line.id && "opacity-50"
            )}
          >
            <Link
              href={`/produkt/${line.productHandle}`}
              className="size-20 shrink-0 overflow-hidden rounded-lg border border-line bg-canvas sm:size-24"
            >
              {line.thumbnail ? (
                <Image
                  src={line.thumbnail}
                  alt=""
                  width={96}
                  height={96}
                  className="size-full object-cover"
                />
              ) : (
                <span className="grid-plate block size-full" />
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <Link
                    href={`/produkt/${line.productHandle}`}
                    className="font-medium text-ink hover:underline"
                  >
                    {line.title}
                  </Link>
                  {line.variantTitle ? (
                    <p className="mt-0.5 text-sm text-ink-soft">{line.variantTitle}</p>
                  ) : null}
                  {line.sku ? (
                    <p className="mt-0.5 font-mono text-xs text-ink-faint">{line.sku}</p>
                  ) : null}
                </div>

                <div className="text-right">
                  <p className="font-semibold tabular-nums">{formatMoney(line.total)}</p>
                  {line.quantity > 1 ? (
                    <p className="text-xs text-ink-faint tabular-nums">
                      {formatMoney(line.unitPrice)} pr. stk.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <QuantityStepper
                  value={line.quantity}
                  disabled={pending === line.id}
                  label={`Antal af ${line.title}`}
                  onChange={(quantity) =>
                    void mutate(line.id, () => updateCartLine({ lineId: line.id, quantity }))
                  }
                />

                <button
                  type="button"
                  disabled={pending === line.id}
                  onClick={() => void mutate(line.id, () => removeCartLine({ lineId: line.id }))}
                  className="text-sm text-ink-faint underline-offset-2 hover:text-negative hover:underline disabled:opacity-50"
                >
                  Fjern
                  <VisuallyHidden> {line.title} fra kurven</VisuallyHidden>
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
