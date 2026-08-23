"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import type { CartSummary } from "@nordprint/types";
import { formatMoney } from "@nordprint/commerce";
import { Button, EmptyState, VisuallyHidden, buttonVariants, cn } from "@nordprint/ui";
import { CartIcon, XIcon } from "@/components/icons";
import { removeCartLine, updateCartLine } from "@/lib/cart/actions";
import { FreeShippingMeter } from "./free-shipping-meter";
import { QuantityStepper } from "./quantity-stepper";

/**
 * Mini cart.
 *
 * A drawer on every breakpoint — on desktop because it keeps the customer on
 * the page they were browsing, on mobile because a dropdown that size is
 * unusable. `/kurv` renders the same lines in a full page for anyone who wants
 * the overview.
 *
 * The cart itself is fetched from the server on open, so the numbers shown are
 * the ones the backend will charge.
 */
export function MiniCart(): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const [cart, setCart] = React.useState<CartSummary | null>(null);
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");
  const [pendingLine, setPendingLine] = React.useState<string | null>(null);

  const panelRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const load = React.useCallback(async (): Promise<void> => {
    try {
      const response = await fetch("/api/kurv", { cache: "no-store" });
      if (!response.ok) throw new Error("cart failed");
      const body = (await response.json()) as { cart: CartSummary | null };
      setCart(body.cart);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, []);

  // Keep the badge current: load once on mount, and again whenever another
  // component reports that the cart changed.
  React.useEffect(() => {
    void (async () => {
      setStatus("loading");
      await load();
    })();
    const onChanged = (): void => void load();
    window.addEventListener("nordprint:cart-changed", onChanged);
    return () => window.removeEventListener("nordprint:cart-changed", onChanged);
  }, [load]);

  React.useEffect(() => {
    if (!open) return;
    void (async () => {
      setStatus("loading");
      await load();
    })();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);

    panelRef.current?.querySelector<HTMLElement>("button, a")?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, load]);

  const mutate = async (
    lineId: string,
    action: () => Promise<{ ok: boolean; message?: string }>
  ): Promise<void> => {
    setPendingLine(lineId);
    const result = await action();
    setPendingLine(null);
    if (!result.ok) {
      setStatus("error");
      return;
    }
    await load();
    window.dispatchEvent(new CustomEvent("nordprint:cart-changed"));
  };

  const itemCount = cart?.itemCount ?? 0;

  return (
    <>
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        className="relative"
        aria-expanded={open}
        aria-controls="mini-kurv"
        onClick={() => setOpen(true)}
      >
        <CartIcon />
        {itemCount > 0 ? (
          <span
            aria-hidden="true"
            className="absolute right-1 top-1.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.625rem] font-semibold leading-4 text-white"
          >
            {itemCount}
          </span>
        ) : null}
        <VisuallyHidden>
          Kurv{itemCount > 0 ? `, ${itemCount} varer` : ", tom"}
        </VisuallyHidden>
      </Button>

      {open ? (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            aria-label="Luk kurv"
            className="absolute inset-0 animate-fade bg-ink/40"
            onClick={() => setOpen(false)}
          />

          <div
            ref={panelRef}
            id="mini-kurv"
            role="dialog"
            aria-modal="true"
            aria-label="Din kurv"
            className="absolute inset-y-0 right-0 flex w-[min(26rem,100vw)] animate-slide-in flex-col bg-surface"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
              <h2 className="text-base font-semibold">
                Din kurv{itemCount > 0 ? ` (${itemCount})` : ""}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <XIcon />
                <VisuallyHidden>Luk</VisuallyHidden>
              </Button>
            </div>

            {status === "error" ? (
              <div className="flex-1 p-4">
                <EmptyState
                  title="Kurven kunne ikke hentes"
                  description="Der var et problem med forbindelsen."
                  action={
                    <Button onClick={() => void load()} variant="secondary">
                      Prøv igen
                    </Button>
                  }
                />
              </div>
            ) : status === "loading" && !cart ? (
              <div className="flex-1 space-y-3 p-4">
                {[0, 1, 2].map((index) => (
                  <div key={index} className="flex gap-3">
                    <div className="size-16 shrink-0 animate-pulse rounded-md bg-surface-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-surface-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !cart || cart.lines.length === 0 ? (
              <div className="flex-1 p-4">
                <EmptyState
                  icon={<CartIcon className="size-8" />}
                  title="Kurven er tom"
                  description="Find filament, reservedele eller udstyr — så samler vi det her."
                  action={
                    <Link href="/filament" className={buttonVariants({})} onClick={() => setOpen(false)}>
                      Shop filament
                    </Link>
                  }
                />
              </div>
            ) : (
              <>
                <div className="border-b border-line px-4 py-3">
                  <FreeShippingMeter progress={cart.freeShipping} />
                </div>

                <ul className="flex-1 divide-y divide-line overflow-y-auto overscroll-contain">
                  {cart.lines.map((line) => (
                    <li
                      key={line.id}
                      className={cn(
                        "flex gap-3 p-4 transition-opacity",
                        pendingLine === line.id && "opacity-50"
                      )}
                    >
                      <Link
                        href={`/produkt/${line.productHandle}`}
                        onClick={() => setOpen(false)}
                        className="size-16 shrink-0 overflow-hidden rounded-md border border-line bg-canvas"
                      >
                        {line.thumbnail ? (
                          <Image
                            src={line.thumbnail}
                            alt=""
                            width={64}
                            height={64}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="grid-plate block size-full" />
                        )}
                      </Link>

                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/produkt/${line.productHandle}`}
                          onClick={() => setOpen(false)}
                          className="block text-sm font-medium text-ink hover:underline"
                        >
                          {line.title}
                        </Link>
                        {line.variantTitle ? (
                          <p className="mt-0.5 text-xs text-ink-soft">{line.variantTitle}</p>
                        ) : null}
                        {line.sku ? (
                          <p className="mt-0.5 font-mono text-[0.6875rem] text-ink-faint">
                            {line.sku}
                          </p>
                        ) : null}

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <QuantityStepper
                            value={line.quantity}
                            disabled={pendingLine === line.id}
                            label={`Antal af ${line.title}`}
                            onChange={(quantity) =>
                              void mutate(line.id, () =>
                                updateCartLine({ lineId: line.id, quantity })
                              )
                            }
                          />
                          <span className="text-sm font-semibold tabular-nums">
                            {formatMoney(line.total)}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={pendingLine === line.id}
                          onClick={() =>
                            void mutate(line.id, () => removeCartLine({ lineId: line.id }))
                          }
                          className="mt-1.5 text-xs text-ink-faint underline-offset-2 hover:text-negative hover:underline"
                        >
                          Fjern
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="shrink-0 space-y-3 border-t border-line p-4">
                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-ink-soft">Subtotal</dt>
                      <dd className="tabular-nums">{formatMoney(cart.subtotal)}</dd>
                    </div>
                    {cart.discountTotal.amount > 0 ? (
                      <div className="flex justify-between text-positive">
                        <dt>Rabat</dt>
                        <dd className="tabular-nums">− {formatMoney(cart.discountTotal)}</dd>
                      </div>
                    ) : null}
                    <div className="flex justify-between">
                      <dt className="text-ink-soft">Fragt</dt>
                      <dd className="tabular-nums text-ink-soft">
                        {cart.freeShipping.qualified ? "Gratis" : "Beregnes ved checkout"}
                      </dd>
                    </div>
                    <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
                      <dt>Total</dt>
                      <dd className="tabular-nums">{formatMoney(cart.total)}</dd>
                    </div>
                  </dl>

                  <Link
                    href="/checkout"
                    className={buttonVariants({ size: "lg", full: true })}
                    onClick={() => setOpen(false)}
                  >
                    Gå til betaling
                  </Link>
                  <Link
                    href="/kurv"
                    className={buttonVariants({ variant: "secondary", full: true })}
                    onClick={() => setOpen(false)}
                  >
                    Se kurven
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
