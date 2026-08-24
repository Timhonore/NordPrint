import type { ProductSummary } from "@nordprint/types";
import { ProductCard, ProductCardSkeleton } from "./product-card";
import { TechLabel } from "@nordprint/ui";

/**
 * Horizontal product rail.
 *
 * Scroll-snapping on mobile, a plain grid from `md` up. Uses CSS scroll snap
 * rather than a carousel library: no JavaScript, native momentum scrolling,
 * and keyboard users simply tab through the cards.
 */
export function ProductRail({
  products,
}: {
  readonly products: readonly ProductSummary[];
}): React.JSX.Element {
  return (
    <ul
      className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-4"
      // The rail is a list of links; it does not need to be focusable itself.
      tabIndex={-1}
    >
      {products.map((product, index) => (
        <li key={product.id} className="w-[16rem] shrink-0 snap-start md:w-auto">
          <ProductCard product={product} priority={index < 4} className="h-full" />
        </li>
      ))}
    </ul>
  );
}

export function ProductRailSkeleton({ title }: { readonly title: string }): React.JSX.Element {
  return (
    <section>
      <div className="mb-6">
        <TechLabel>Indlæser</TechLabel>
        <h2 className="mt-1.5 text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}
