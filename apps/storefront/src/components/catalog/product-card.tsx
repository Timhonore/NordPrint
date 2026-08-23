import Link from "next/link";
import Image from "next/image";
import type { ProductSummary } from "@nordprint/types";
import { MATERIAL_LABELS } from "@nordprint/types";
import {
  Badge,
  ColorSwatchRow,
  Price,
  Skeleton,
  StarRating,
  StockIndicator,
  cn,
} from "@nordprint/ui";
import { WishlistButton } from "@/components/product/wishlist-button";
import { CompareToggle } from "@/components/product/compare-toggle";

/**
 * Product card.
 *
 * A server component with two small client islands (favourite and compare), so
 * a 24-card catalogue page ships almost no JavaScript for the grid itself.
 *
 * The whole card is one link with the title as its accessible name; the
 * secondary controls sit outside that link so they are separately reachable
 * and do not turn into nested interactive elements.
 */
export function ProductCard({
  product,
  priority = false,
  className,
}: {
  readonly product: ProductSummary;
  /** Set on the first row so the LCP image is not lazy-loaded. */
  readonly priority?: boolean;
  readonly className?: string;
}): React.JSX.Element {
  const soldOut = product.stock === "out_of_stock";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface transition-shadow hover:shadow-[0_12px_28px_-20px_rgb(13_17_23/0.5)]",
        className
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-canvas">
        <Link href={`/produkt/${product.handle}`} className="block size-full" tabIndex={-1}>
          {product.thumbnail ? (
            <Image
              src={product.thumbnail}
              alt=""
              fill
              sizes="(min-width: 1280px) 22vw, (min-width: 768px) 30vw, 45vw"
              priority={priority}
              className={cn(
                "object-cover transition-transform duration-300 group-hover:scale-[1.03]",
                soldOut && "opacity-60"
              )}
            />
          ) : (
            // No photo yet: the grid motif is a deliberate placeholder rather
            // than a broken-image icon or an empty grey box.
            <div className="grid-plate grid size-full place-items-center">
              <span className="font-mono text-[0.625rem] uppercase tracking-[0.14em] text-ink-faint">
                {product.material ? MATERIAL_LABELS[product.material] : "NordPrint"}
              </span>
            </div>
          )}
        </Link>

        <div className="pointer-events-none absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {product.onSale ? <Badge tone="offer">Tilbud</Badge> : null}
            {product.isNew && !product.onSale ? <Badge tone="accent">Nyhed</Badge> : null}
            {soldOut ? <Badge tone="neutral">Udsolgt</Badge> : null}
          </div>
          <div className="pointer-events-auto">
            <WishlistButton productId={product.id} handle={product.handle} title={product.title} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {product.brand ? (
          <p className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-ink-faint">
            {product.brand.name}
          </p>
        ) : null}

        <h3 className="text-sm font-semibold leading-snug text-ink">
          <Link
            href={`/produkt/${product.handle}`}
            // Stretched link: the whole card is clickable, without wrapping
            // the favourite button inside an anchor.
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-accent focus-visible:after:ring-offset-2"
          >
            {product.title}
          </Link>
        </h3>

        {product.averageRating !== null ? (
          <StarRating value={product.averageRating} count={product.reviewCount} />
        ) : null}

        {product.swatches.length > 0 ? (
          <ColorSwatchRow swatches={product.swatches} className="mt-0.5" />
        ) : null}

        <div className="mt-auto space-y-2 pt-2">
          <Price
            price={product.priceFrom}
            compareAtPrice={product.compareAtPriceFrom}
            pricePerKg={product.pricePerKgFrom}
            from={product.variantCount > 1}
            size="md"
          />
          <div className="flex items-center justify-between gap-2">
            <StockIndicator status={product.stock} className="text-xs" />
            <div className="pointer-events-auto relative z-10">
              <CompareToggle handle={product.handle} title={product.title} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton(): React.JSX.Element {
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <Skeleton className="aspect-square rounded-none" />
      <div className="space-y-2.5 p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-28" />
      </div>
    </div>
  );
}
