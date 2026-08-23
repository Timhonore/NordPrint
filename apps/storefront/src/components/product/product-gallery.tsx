"use client";

import * as React from "react";
import Image from "next/image";
import type { ProductDetail } from "@nordprint/types";
import { MATERIAL_LABELS } from "@nordprint/types";
import { VisuallyHidden, cn } from "@nordprint/ui";

/**
 * Product gallery.
 *
 * Thumbnails are buttons in a tablist, so arrow keys move between images.
 * When a product has no photography yet the build-plate grid stands in — a
 * deliberate placeholder rather than a broken-image icon.
 */
export function ProductGallery({
  product,
}: {
  readonly product: ProductDetail;
}): React.JSX.Element {
  const images = product.images.length > 0 ? product.images : [];
  const [activeIndex, setActiveIndex] = React.useState(0);
  const active = images[activeIndex];

  return (
    <div className="lg:sticky lg:top-28 lg:self-start">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-surface">
        {active ? (
          <Image
            src={active.url}
            alt={active.alt ?? product.title}
            fill
            sizes="(min-width: 1024px) 45vw, 100vw"
            priority
            className="object-cover"
          />
        ) : (
          <div className="grid-plate grid size-full place-items-center">
            <div className="text-center">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
                {product.material ? MATERIAL_LABELS[product.material] : "NordPrint"}
              </p>
              <p className="mt-1 text-sm text-ink-faint">Foto på vej</p>
            </div>
          </div>
        )}
      </div>

      {images.length > 1 ? (
        <div
          role="tablist"
          aria-label="Produktbilleder"
          className="mt-3 flex gap-2 overflow-x-auto pb-1"
          onKeyDown={(event) => {
            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
            event.preventDefault();
            const delta = event.key === "ArrowRight" ? 1 : -1;
            setActiveIndex((current) => (current + delta + images.length) % images.length);
          }}
        >
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative size-16 shrink-0 overflow-hidden rounded-lg border transition-colors",
                index === activeIndex ? "border-accent" : "border-line hover:border-line-strong"
              )}
            >
              <Image src={image.url} alt="" fill sizes="64px" className="object-cover" />
              <VisuallyHidden>Billede {index + 1}</VisuallyHidden>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
