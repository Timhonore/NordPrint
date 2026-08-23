import type { Metadata } from "next";
import { TechLabel } from "@nordprint/ui";
import { WishlistView } from "@/components/account/wishlist-view";

export const metadata: Metadata = { title: "Favoritter" };

export default function FavouritesPage(): React.JSX.Element {
  return (
    <div>
      <TechLabel>Gemt til senere</TechLabel>
      <h2 className="mt-1.5 text-xl font-bold tracking-tight">Favoritter</h2>
      <p className="mb-6 mt-1.5 max-w-2xl text-ink-soft">
        Dine favoritter følger med, når du logger ind — også dem, du gemte, før du oprettede
        en konto.
      </p>

      <WishlistView />
    </div>
  );
}
