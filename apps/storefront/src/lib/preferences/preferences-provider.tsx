"use client";

import * as React from "react";
import type { SavedPrinter } from "@nordprint/types";
import { commerceConfig } from "@nordprint/config";
import * as store from "./preferences-store";
import type { PreferencesSnapshot, WishlistEntry } from "./preferences-store";

/**
 * Guest preferences: the customer's printer, favourites and comparison list.
 *
 * State lives in `preferences-store` and is read with `useSyncExternalStore`,
 * so there is no hydration effect and no flash of the wrong value.
 *
 * Nothing here is authoritative. Prices, stock and compatibility are always
 * resolved server-side — this is a convenience layer, not a security boundary.
 */
interface PreferencesApi extends PreferencesSnapshot {
  /** False during the server render and the very first client render. */
  readonly ready: boolean;
  readonly primaryPrinter: SavedPrinter | null;
  savePrinter(printer: SavedPrinter): void;
  removePrinter(modelId: string): void;
  setPrimaryPrinter(modelId: string | null): void;
  toggleWishlist(entry: WishlistEntry): boolean;
  isWishlisted(productId: string): boolean;
  toggleCompare(handle: string): boolean;
  isComparing(handle: string): boolean;
  clearCompare(): void;
}

const PreferencesContext = React.createContext<PreferencesApi | null>(null);

export function PreferencesProvider({
  children,
  maxCompare = commerceConfig.maxCompareItems,
}: {
  children: React.ReactNode;
  maxCompare?: number;
}): React.JSX.Element {
  const snapshot = React.useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  // `ready` distinguishes "nothing saved" from "not read yet", so the header
  // does not render a badge of 0 before storage has been consulted.
  const ready = React.useSyncExternalStore(
    store.subscribe,
    () => true,
    () => false
  );

  const api = React.useMemo<PreferencesApi>(
    () => ({
      ...snapshot,
      ready,
      primaryPrinter:
        snapshot.printers.find((entry) => entry.modelId === snapshot.primaryPrinterId) ?? null,
      savePrinter: store.savePrinter,
      removePrinter: store.removePrinter,
      setPrimaryPrinter: store.setPrimaryPrinter,
      toggleWishlist: store.toggleWishlist,
      isWishlisted: (productId) => snapshot.wishlist.some((entry) => entry.productId === productId),
      toggleCompare: (handle) => store.toggleCompare(handle, maxCompare),
      isComparing: (handle) => snapshot.compare.includes(handle),
      clearCompare: store.clearCompare,
    }),
    [snapshot, ready, maxCompare]
  );

  return <PreferencesContext.Provider value={api}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesApi {
  const context = React.useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferences skal bruges inden i <PreferencesProvider>");
  }
  return context;
}

export { readGuestStateForMerge } from "./preferences-store";
export type { WishlistEntry } from "./preferences-store";
