"use client";

import * as React from "react";
import Link from "next/link";
import type { ProductSummary } from "@nordprint/types";
import { Button, EmptyState, buttonVariants } from "@nordprint/ui";
import { HeartIcon } from "@/components/icons";
import { ProductCard, ProductCardSkeleton } from "@/components/catalog/product-card";
import { usePreferences } from "@/lib/preferences/preferences-provider";

/**
 * The favourites list.
 *
 * The handles come from local storage; the product data is fetched fresh, so
 * prices and stock are current rather than whatever they were when the
 * customer saved them.
 */
export function WishlistView(): React.JSX.Element {
  const { wishlist, ready } = usePreferences();
  const [products, setProducts] = React.useState<ProductSummary[]>([]);
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle");

  const handles = React.useMemo(
    () =>
      wishlist
        .map((entry) => entry.handle)
        .filter(Boolean)
        .join(","),
    [wishlist]
  );

  React.useEffect(() => {
    if (!ready || handles.length === 0) return;

    const controller = new AbortController();

    void (async () => {
      setStatus("loading");
      try {
        const response = await fetch(`/api/favoritter?handles=${encodeURIComponent(handles)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("wishlist failed");
        const body = (await response.json()) as { products: ProductSummary[] };
        setProducts(body.products);
        setStatus("idle");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus("error");
      }
    })();

    return () => controller.abort();
  }, [ready, handles]);

  if (!ready || (status === "loading" && products.length === 0)) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <EmptyState
        title="Favoritterne kunne ikke hentes"
        description="Der var et problem med forbindelsen."
        action={<Button onClick={() => window.location.reload()}>Prøv igen</Button>}
      />
    );
  }

  if (wishlist.length === 0) {
    return (
      <EmptyState
        icon={<HeartIcon className="size-8" />}
        title="Ingen favoritter endnu"
        description="Tryk på hjertet på et produkt, så samler vi det her."
        action={
          <Link href="/filament" className={buttonVariants({})}>
            Find noget at gemme
          </Link>
        }
      />
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {products.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} className="h-full" />
        </li>
      ))}
    </ul>
  );
}
