"use client";

import * as React from "react";
import { VisuallyHidden, cn } from "@nordprint/ui";
import { HeartIcon } from "@/components/icons";
import { usePreferences } from "@/lib/preferences/preferences-provider";

/**
 * Favourite toggle.
 *
 * Optimistic and local: guests keep favourites in local storage, and the list
 * is merged into the account at login. There is no round trip, so tapping the
 * heart never feels laggy on a slow connection.
 */
export function WishlistButton({
  productId,
  handle,
  title,
  variantId,
  className,
  showLabel = false,
}: {
  readonly productId: string;
  readonly handle: string;
  readonly title: string;
  readonly variantId?: string | null;
  readonly className?: string;
  readonly showLabel?: boolean;
}): React.JSX.Element {
  const { isWishlisted, toggleWishlist, ready } = usePreferences();
  const [announcement, setAnnouncement] = React.useState("");

  const active = ready && isWishlisted(productId);

  return (
    <>
      <button
        type="button"
        aria-pressed={active}
        onClick={() => {
          const added = toggleWishlist({ productId, handle, variantId: variantId ?? null });
          setAnnouncement(
            added ? `${title} er gemt som favorit` : `${title} er fjernet fra favoritter`
          );
        }}
        className={cn(
          // min-h-11: hjertet på et produktkort er et rigtigt tryk-mål, ikke
          // pynt. 34 px er under det, en tommelfinger rammer pålideligt —
          // WCAG 2.2 sætter grænsen ved 44.
          "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface/90 px-2.5 py-2 backdrop-blur transition-colors hover:bg-surface",
          active && "border-negative/30 text-negative",
          showLabel && "px-3",
          className
        )}
      >
        <HeartIcon filled={active} className="size-4" />
        {showLabel ? <span className="text-sm font-medium">{active ? "Gemt" : "Gem"}</span> : null}
        <VisuallyHidden>
          {active ? `Fjern ${title} fra favoritter` : `Gem ${title} som favorit`}
        </VisuallyHidden>
      </button>

      <VisuallyHidden aria-live="polite">{announcement}</VisuallyHidden>
    </>
  );
}
