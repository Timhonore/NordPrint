import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatMoney } from "@nordprint/commerce";
import { buttonVariants } from "@nordprint/ui";
import { fetchCart } from "@/lib/cart/cart";
import { listPaymentMethods, listShippingOptions } from "@/lib/checkout/actions";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { CheckoutSummary } from "@/components/checkout/checkout-summary";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Checkout.
 *
 * Four steps — kontakt, levering, betaling, bekræft — on one page rather than
 * four navigations. Guest checkout is the default; an account is offered
 * afterwards, never required, because forcing registration is the single most
 * effective way to lose an order at the last step.
 */
export default async function CheckoutPage(): Promise<React.JSX.Element> {
  const cart = await fetchCart();

  // Nothing to pay for: send them somewhere useful instead of rendering an
  // empty four-step form.
  if (!cart || cart.lines.length === 0) redirect("/kurv");

  const [shippingOptions, paymentMethods] = await Promise.all([
    listShippingOptions(),
    listPaymentMethods(),
  ]);

  return (
    <div className="min-h-dvh bg-canvas">
      <div className="container-page py-8 md:py-12">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Checkout</h1>
          <Link href="/kurv" className="text-sm text-ink-soft hover:text-ink hover:underline">
            ← Tilbage til kurven
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
          <CheckoutFlow
            cart={cart}
            shippingOptions={shippingOptions}
            paymentMethods={paymentMethods}
          />

          <aside className="lg:sticky lg:top-28">
            <CheckoutSummary cart={cart} />

            <p className="mt-4 px-1 text-xs leading-relaxed text-ink-faint">
              Ved at gennemføre købet accepterer du vores{" "}
              <Link href="/handelsbetingelser" className="underline hover:text-ink">
                handelsbetingelser
              </Link>{" "}
              og{" "}
              <Link href="/privatliv" className="underline hover:text-ink">
                privatlivspolitik
              </Link>
              . Du har 14 dages fortrydelsesret.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}

export { formatMoney, buttonVariants };
