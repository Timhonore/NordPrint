import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, TechLabel, buttonVariants } from "@nordprint/ui";
import { HeartIcon } from "@/components/icons";
import { ProductCard } from "@/components/catalog/product-card";
import { WishlistView } from "@/components/account/wishlist-view";
import { fetchAccountWishlist } from "@/lib/account/wishlist";
import { getCustomer } from "@/lib/account/session";

export const metadata: Metadata = { title: "Favoritter" };

export default async function FavouritesPage(): Promise<React.JSX.Element> {
  const customer = await getCustomer();

  return (
    <div>
      <TechLabel>Gemt til senere</TechLabel>
      <h2 className="mt-1.5 text-xl font-bold tracking-tight">Favoritter</h2>
      <p className="mb-6 mt-1.5 max-w-2xl text-ink-soft">
        Dine favoritter følger med, når du logger ind — også dem, du gemte, før du oprettede en
        konto.
      </p>

      {/* Signed in: the account is the source of truth, so the list is the
          same on every device. Guests keep theirs in local storage, which only
          the client can read. */}
      {customer ? <AccountWishlist /> : <WishlistView />}
    </div>
  );
}

async function AccountWishlist(): Promise<React.JSX.Element> {
  const result = await fetchAccountWishlist();

  if (!result.ok) {
    return (
      <EmptyState
        title="Favoritterne kunne ikke hentes"
        description="Der var et problem med forbindelsen. Prøv at genindlæse siden."
      />
    );
  }

  if (result.data.length === 0) {
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
      {result.data.map((product) => (
        <li key={product.id}>
          <ProductCard product={product} className="h-full" />
        </li>
      ))}
    </ul>
  );
}
