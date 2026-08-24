/**
 * Fetch helper for the NordPrint admin screens.
 *
 * `credentials: "include"` on every call — the admin session is a cookie, and
 * a screen that silently renders empty because the cookie was not sent is the
 * kind of bug that gets diagnosed as "the data is gone".
 *
 * Returns a result instead of throwing so each screen can render its own
 * error state. Nothing here formats money: that belongs to
 * `@nordprint/commerce`, and a second implementation would eventually
 * disagree with the storefront.
 */

export type AdminResult<T> = { ok: true; data: T } | { ok: false; message: string };

const GENERIC = "Noget gik galt. Prøv igen.";

export async function adminFetch<T>(
  path: string,
  init: { method?: "GET" | "POST" | "DELETE"; body?: unknown } = {}
): Promise<AdminResult<T>> {
  try {
    const response = await fetch(path, {
      method: init.method ?? "GET",
      credentials: "include",
      headers: init.body === undefined ? {} : { "Content-Type": "application/json" },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    });

    if (response.status === 204) return { ok: true, data: undefined as T };

    // 207 means "some rows failed" on the import endpoint — a real answer,
    // not an error, and the caller needs the body to say which rows.
    const body = (await response.json().catch(() => null)) as (T & { message?: string }) | null;

    if (!response.ok && response.status !== 207) {
      return { ok: false, message: body?.message ?? `${GENERIC} (${response.status})` };
    }

    return { ok: true, data: body as T };
  } catch {
    return { ok: false, message: "Ingen forbindelse til serveren." };
  }
}
