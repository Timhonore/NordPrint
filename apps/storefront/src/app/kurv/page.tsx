import type { Metadata } from "next";
import Link from "next/link";
import { formatMoney } from "@nordprint/commerce";
import { EmptyState, buttonVariants } from "@nordprint/ui";
import { fetchCart } from "@/lib/cart/cart";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CartLines } from "@/components/cart/cart-lines";
import { PromotionForm } from "@/components/cart/promotion-form";
import { FreeShippingMeter } from "@/components/cart/free-shipping-meter";
import { CartIcon } from "@/components/icons";
import { UspSection } from "@/components/home/usp-section";

export const metadata: Metadata = {
  title: "Kurv",
  description: "Se og rediger indholdet af din kurv.",
  // A cart is personal; there is nothing here for a crawler.
  robots: { index: false, follow: false },
};

/** The cart is per-visitor, so it can never be cached or prerendered. */
export const dynamic = "force-dynamic";

export default async function CartPage(): Promise<React.JSX.Element> {
  const cart = await fetchCart();
  const empty = !cart || cart.lines.length === 0;

  return (
    <>
      <Breadcrumbs items={[{ label: "Kurv", href: "/kurv" }]} />

      <div className="container-page py-8 md:py-12">
        <h1 className="mb-6 text-3xl font-bold tracking-tight md:text-4xl">Din kurv</h1>

        {empty ? (
          <EmptyState
            icon={<CartIcon className="size-8" />}
            title="Kurven er tom"
            description="Du har ikke lagt noget i kurven endnu. Start med filamentet — resten finder vi undervejs."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Link href="/filament" className={buttonVariants({})}>
                  Shop filament
                </Link>
                <Link href="/find-filament" className={buttonVariants({ variant: "secondary" })}>
                  Find filament til min printer
                </Link>
              </div>
            }
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
            <div>
              <div className="mb-5 rounded-xl border border-line bg-surface p-4">
                <FreeShippingMeter progress={cart.freeShipping} />
              </div>
              <CartLines cart={cart} />
            </div>

            <aside className="space-y-4 lg:sticky lg:top-28">
              <div className="rounded-xl border border-line bg-surface p-5">
                <h2 className="text-base font-semibold">Ordreoversigt</h2>

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-ink-soft">
                      Subtotal ({cart.itemCount} {cart.itemCount === 1 ? "vare" : "varer"})
                    </dt>
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

                  <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold">
                    <dt>Total</dt>
                    <dd className="tabular-nums">{formatMoney(cart.total)}</dd>
                  </div>

                  <div className="flex justify-between text-xs text-ink-faint">
                    <dt>Heraf moms</dt>
                    <dd className="tabular-nums">{formatMoney(cart.taxTotal)}</dd>
                  </div>
                </dl>

                <Link
                  href="/checkout"
                  className={`${buttonVariants({ size: "lg", full: true })} mt-5`}
                >
                  Gå til betaling
                </Link>

                <Link
                  href="/filament"
                  className="mt-3 block text-center text-sm text-ink-soft hover:text-ink hover:underline"
                >
                  Fortsæt med at handle
                </Link>
              </div>

              <div className="rounded-xl border border-line bg-surface p-5">
                <PromotionForm codes={cart.promotionCodes} />
              </div>
            </aside>
          </div>
        )}
      </div>

      <UspSection />
    </>
  );
}
