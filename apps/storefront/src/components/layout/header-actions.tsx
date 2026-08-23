"use client";

import * as React from "react";
import Link from "next/link";
import { VisuallyHidden, buttonVariants } from "@nordprint/ui";
import { HeartIcon, UserIcon } from "@/components/icons";
import { usePreferences } from "@/lib/preferences/preferences-provider";
import { MiniCart } from "@/components/cart/mini-cart";

/**
 * Favourites, account and the mini-cart trigger.
 *
 * The favourites and cart counts are rendered only after hydration: the server
 * does not know what is in this visitor's local storage, and rendering a
 * guessed number would flash the wrong value on every first paint.
 */
export function HeaderActions(): React.JSX.Element {
  const { wishlist, ready } = usePreferences();

  return (
    <div className="flex items-center gap-0.5">
      <Link
        href="/konto/favoritter"
        className={`${buttonVariants({ variant: "ghost", size: "icon" })} relative hidden sm:inline-flex`}
      >
        <HeartIcon />
        {ready && wishlist.length > 0 ? (
          <span
            aria-hidden="true"
            className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[0.625rem] font-semibold leading-4 text-white"
          >
            {wishlist.length}
          </span>
        ) : null}
        <VisuallyHidden>
          Favoritter{ready && wishlist.length > 0 ? `, ${wishlist.length} gemt` : ""}
        </VisuallyHidden>
      </Link>

      <Link
        href="/konto"
        className={`${buttonVariants({ variant: "ghost", size: "icon" })} hidden sm:inline-flex`}
      >
        <UserIcon />
        <VisuallyHidden>Min konto</VisuallyHidden>
      </Link>

      <MiniCart />
    </div>
  );
}
