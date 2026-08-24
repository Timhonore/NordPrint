"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ProductDetail, ProductVariantSummary } from "@nordprint/types";
import { isPurchasable } from "@nordprint/commerce";
import { Button, ColorSwatchPicker, Price, StockIndicator, VisuallyHidden } from "@nordprint/ui";
import { addToCart } from "@/lib/cart/actions";
import { QuantityStepper } from "@/components/cart/quantity-stepper";
import { WishlistButton } from "./wishlist-button";
import { CartIcon, CheckIcon } from "@/components/icons";

/**
 * The buy box.
 *
 * Selecting a colour updates the URL (`?farve=jet-black`), the price, the SKU,
 * the stock line and the gallery — one selection, one source of truth. Using
 * the URL rather than component state means a customer can send a friend a
 * link to *the black one*, and that the browser's back button undoes a colour
 * change the way they expect.
 *
 * Sold-out colours stay selectable so the customer can see the restock date;
 * only the buy button is disabled.
 */
export function ProductPurchasePanel({
  product,
  onVariantChange,
}: {
  readonly product: ProductDetail;
  readonly onVariantChange?: (variantId: string) => void;
}): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const variants = product.variants;
  const colorParam = searchParams.get("farve");

  // Resolve the selected variant from the URL, falling back to the first one
  // that can actually be bought.
  const selected = React.useMemo<ProductVariantSummary | undefined>(() => {
    const fromUrl = colorParam
      ? variants.find(
          (variant) => slug(variant.filament?.colorName ?? variant.title) === colorParam
        )
      : undefined;
    return (
      fromUrl ?? variants.find((variant) => isPurchasable(variant.stock.status)) ?? variants[0]
    );
  }, [colorParam, variants]);

  const [quantity, setQuantity] = React.useState(1);
  const [status, setStatus] = React.useState<"idle" | "adding" | "added" | "error">("idle");
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (selected) onVariantChange?.(selected.id);
  }, [selected, onVariantChange]);

  // The "Lagt i kurv" confirmation is transient; it must not stick around.
  React.useEffect(() => {
    if (status !== "added") return;
    const timer = setTimeout(() => setStatus("idle"), 2600);
    return () => clearTimeout(timer);
  }, [status]);

  const selectColor = (variantId: string): void => {
    const variant = variants.find((entry) => entry.id === variantId);
    if (!variant) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("farve", slug(variant.filament?.colorName ?? variant.title));

    // The full path, not a bare "?…": a relative query-only URL is not
    // resolved reliably by the App Router, and the colour selection silently
    // stops updating the address bar.
    //
    // `scroll: false` keeps the customer looking at the swatches they just
    // clicked instead of jumping to the top of the page.
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setStatus("idle");
    setMessage(null);
  };

  const submit = async (): Promise<void> => {
    if (!selected) return;

    setStatus("adding");
    setMessage(null);

    const result = await addToCart({ variantId: selected.id, quantity });

    if (!result.ok) {
      setStatus("error");
      setMessage(result.message ?? "Varen kunne ikke lægges i kurven.");
      return;
    }

    setStatus("added");
    setQuantity(1);
    window.dispatchEvent(new CustomEvent("nordprint:cart-changed"));
  };

  if (!selected) {
    return <p className="text-sm text-ink-soft">Produktet har ingen varianter til salg.</p>;
  }

  const purchasable = isPurchasable(selected.stock.status);

  return (
    <div className="space-y-6">
      <div>
        <Price
          price={selected.price}
          compareAtPrice={selected.compareAtPrice}
          pricePerKg={selected.pricePerKg}
          size="lg"
        />
        <p className="mt-1 text-xs text-ink-faint">Inkl. moms</p>
      </div>

      {product.swatches.length > 1 ? (
        <ColorSwatchPicker
          swatches={product.swatches}
          selectedVariantId={selected.id}
          onSelect={selectColor}
        />
      ) : null}

      <div className="space-y-1.5">
        <StockIndicator
          status={selected.stock.status}
          quantity={selected.stock.quantity}
          expectedRestockAt={selected.stock.expectedRestockAt}
        />
        {selected.sku ? (
          <p className="font-mono text-xs text-ink-faint">SKU {selected.sku}</p>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <QuantityStepper
            value={quantity}
            onChange={setQuantity}
            label="Antal"
            disabled={!purchasable || status === "adding"}
            className="h-13"
          />

          <Button
            size="lg"
            full
            disabled={!purchasable || status === "adding"}
            onClick={() => void submit()}
          >
            {status === "adding" ? (
              "Lægger i kurv …"
            ) : status === "added" ? (
              <>
                <CheckIcon />
                Lagt i kurv
              </>
            ) : purchasable ? (
              <>
                <CartIcon />
                Læg i kurv
              </>
            ) : (
              "Udsolgt"
            )}
          </Button>
        </div>

        <WishlistButton
          productId={product.id}
          handle={product.handle}
          title={product.title}
          variantId={selected.id}
          showLabel
          className="w-full justify-center"
        />
      </div>

      {/* Errors and confirmations are announced, not just shown. */}
      <div aria-live="polite">
        {message ? (
          <p className="rounded-lg border border-negative/25 bg-negative/5 px-3 py-2.5 text-sm text-negative">
            {message}
          </p>
        ) : status === "added" ? (
          <VisuallyHidden>{product.title} er lagt i kurven</VisuallyHidden>
        ) : null}
      </div>

      {!purchasable && selected.stock.expectedRestockAt ? (
        <p className="text-sm text-ink-soft">
          Vi forventer varen på lager igen — vælg en anden farve, hvis du ikke kan vente.
        </p>
      ) : null}
    </div>
  );
}

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
