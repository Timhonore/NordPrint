import Image from "next/image";
import type { CartSummary } from "@nordprint/types";
import { formatMoney } from "@nordprint/commerce";
import { FreeShippingMeter } from "@/components/cart/free-shipping-meter";

/** The order summary shown alongside checkout. Read-only by design. */
export function CheckoutSummary({ cart }: { readonly cart: CartSummary }): React.JSX.Element {
  return (
    <div className="rounded-xl border border-line bg-surface">
      <div className="border-b border-line p-4">
        <h2 className="text-base font-semibold">
          Din ordre ({cart.itemCount} {cart.itemCount === 1 ? "vare" : "varer"})
        </h2>
      </div>

      <ul className="max-h-80 divide-y divide-line overflow-y-auto">
        {cart.lines.map((line) => (
          <li key={line.id} className="flex gap-3 p-4">
            <span className="relative size-14 shrink-0 overflow-hidden rounded-md border border-line bg-canvas">
              {line.thumbnail ? (
                <Image src={line.thumbnail} alt="" fill sizes="56px" className="object-cover" />
              ) : (
                <span className="grid-plate block size-full" />
              )}
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-ink text-[0.625rem] font-semibold text-white">
                {line.quantity}
              </span>
            </span>

            <span className="min-w-0 flex-1 text-sm">
              <span className="block truncate font-medium text-ink">{line.title}</span>
              {line.variantTitle ? (
                <span className="block truncate text-xs text-ink-soft">{line.variantTitle}</span>
              ) : null}
            </span>

            <span className="shrink-0 text-sm font-medium tabular-nums">
              {formatMoney(line.total)}
            </span>
          </li>
        ))}
      </ul>

      <div className="border-t border-line p-4">
        <FreeShippingMeter progress={cart.freeShipping} />
      </div>

      <dl className="space-y-2 border-t border-line p-4 text-sm">
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
          <dd className="tabular-nums">
            {cart.shippingTotal === null
              ? "Vælges næste trin"
              : cart.shippingTotal.amount === 0
                ? "Gratis"
                : formatMoney(cart.shippingTotal)}
          </dd>
        </div>

        <div className="flex justify-between border-t border-line pt-2.5 text-lg font-semibold">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatMoney(cart.total)}</dd>
        </div>

        <div className="flex justify-between text-xs text-ink-faint">
          <dt>Heraf moms</dt>
          <dd className="tabular-nums">{formatMoney(cart.taxTotal)}</dd>
        </div>
      </dl>
    </div>
  );
}
