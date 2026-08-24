import type { SavedPrinter } from "@nordprint/types";

/**
 * The guest preference store.
 *
 * Backed by `localStorage` and exposed as an external store, so React can read
 * it with `useSyncExternalStore` instead of hydrating through an effect. That
 * matters for more than lint cleanliness:
 *
 *  - No double render on every page load.
 *  - No flash of the wrong state between hydration and the effect.
 *  - Other tabs stay in sync for free, because the `storage` event feeds the
 *    same subscription.
 *
 * Every read and write is wrapped: private browsing, blocked site data and a
 * full quota all throw, and none of them should take the shop down.
 */

export interface WishlistEntry {
  readonly productId: string;
  readonly handle: string;
  readonly variantId?: string | null;
}

export interface PreferencesSnapshot {
  readonly printers: readonly SavedPrinter[];
  readonly primaryPrinterId: string | null;
  readonly wishlist: readonly WishlistEntry[];
  readonly compare: readonly string[];
}

const KEYS = {
  printers: "nordprint.printers.v1",
  primaryPrinter: "nordprint.printer.primary.v1",
  wishlist: "nordprint.wishlist.v1",
  compare: "nordprint.compare.v1",
} as const;

const STORAGE_KEYS = new Set<string>(Object.values(KEYS));

/** The snapshot the server renders, and the one used when storage is absent. */
export const EMPTY_SNAPSHOT: PreferencesSnapshot = {
  printers: [],
  primaryPrinterId: null,
  wishlist: [],
  compare: [],
};

/**
 * `useSyncExternalStore` compares snapshots by reference, so the cached one is
 * returned until something actually changes.
 */
let snapshot: PreferencesSnapshot = EMPTY_SNAPSHOT;
let hydrated = false;

const listeners = new Set<() => void>();

function read<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or storage disabled — the in-memory snapshot still
    // serves this session.
  }
}

function loadFromStorage(): PreferencesSnapshot {
  return {
    printers: read<SavedPrinter[]>(KEYS.printers, []),
    primaryPrinterId: read<string | null>(KEYS.primaryPrinter, null),
    wishlist: read<WishlistEntry[]>(KEYS.wishlist, []),
    compare: read<string[]>(KEYS.compare, []),
  };
}

function emit(next: PreferencesSnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    snapshot = loadFromStorage();
  }

  listeners.add(listener);

  const onStorage = (event: StorageEvent): void => {
    if (event.key !== null && !STORAGE_KEYS.has(event.key)) return;
    emit(loadFromStorage());
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getSnapshot(): PreferencesSnapshot {
  return snapshot;
}

/** The server has no storage, so it always renders the empty snapshot. */
export function getServerSnapshot(): PreferencesSnapshot {
  return EMPTY_SNAPSHOT;
}

/* ------------------------------------------------------------- mutations */

const MAX_SAVED_PRINTERS = 10;

export function savePrinter(printer: SavedPrinter): void {
  const printers = [
    printer,
    ...snapshot.printers.filter((entry) => entry.modelId !== printer.modelId),
  ].slice(0, MAX_SAVED_PRINTERS);

  write(KEYS.printers, printers);
  write(KEYS.primaryPrinter, printer.modelId);
  emit({ ...snapshot, printers, primaryPrinterId: printer.modelId });
}

export function removePrinter(modelId: string): void {
  const printers = snapshot.printers.filter((entry) => entry.modelId !== modelId);
  const primaryPrinterId =
    snapshot.primaryPrinterId === modelId
      ? (printers[0]?.modelId ?? null)
      : snapshot.primaryPrinterId;

  write(KEYS.printers, printers);
  write(KEYS.primaryPrinter, primaryPrinterId);
  emit({ ...snapshot, printers, primaryPrinterId });
}

export function setPrimaryPrinter(modelId: string | null): void {
  write(KEYS.primaryPrinter, modelId);
  emit({ ...snapshot, primaryPrinterId: modelId });
}

/** Returns true when the product was added, false when it was removed. */
export function toggleWishlist(entry: WishlistEntry): boolean {
  const exists = snapshot.wishlist.some((item) => item.productId === entry.productId);
  const wishlist = exists
    ? snapshot.wishlist.filter((item) => item.productId !== entry.productId)
    : [entry, ...snapshot.wishlist];

  write(KEYS.wishlist, wishlist);
  emit({ ...snapshot, wishlist });
  return !exists;
}

export function toggleCompare(handle: string, maxCompare: number): boolean {
  const exists = snapshot.compare.includes(handle);
  // Silently dropping the oldest is friendlier than refusing with a dialog.
  const compare = exists
    ? snapshot.compare.filter((entry) => entry !== handle)
    : [...snapshot.compare, handle].slice(-maxCompare);

  write(KEYS.compare, compare);
  emit({ ...snapshot, compare });
  return !exists;
}

export function clearCompare(): void {
  write(KEYS.compare, []);
  emit({ ...snapshot, compare: [] });
}

/**
 * Payload sent to the backend right after login, so a guest's printers and
 * favourites are merged into their account rather than lost.
 */
export function readGuestStateForMerge(): {
  printerModelIds: string[];
  wishlist: { productId: string; variantId: string | null }[];
} {
  const current = typeof window === "undefined" ? EMPTY_SNAPSHOT : loadFromStorage();
  return {
    printerModelIds: current.printers.map((entry) => entry.modelId),
    wishlist: current.wishlist.map((entry) => ({
      productId: entry.productId,
      variantId: entry.variantId ?? null,
    })),
  };
}
