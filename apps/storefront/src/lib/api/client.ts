import { siteConfig } from "@nordprint/config";

/**
 * Server-side API client for the Medusa backend.
 *
 * Two rules this file exists to enforce:
 *
 *  1. **Never throw a page down.** Every helper returns a typed result and
 *     lets the caller render an error state. A catalogue page that 500s
 *     because the reviews query timed out is a worse outcome than a page
 *     without star ratings.
 *
 *  2. **Never leak secrets to the browser.** The publishable key is public by
 *     design, but this module runs on the server so even it stays out of the
 *     client bundle unless a component explicitly asks.
 */

const BACKEND_URL = siteConfig.apiUrl;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? "";

export interface FetchOptions {
  /** Seconds. `0` disables caching for this request. */
  revalidate?: number;
  tags?: string[];
  method?: "GET" | "POST" | "DELETE";
  body?: unknown;
  /** Forwarded cookie header, for authenticated customer requests. */
  cookie?: string;
  signal?: AbortSignal;
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

/** Requests that take longer than this are a failure, not a slow success. */
const TIMEOUT_MS = 8000;

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<ApiResult<T>> {
  const url = `${BACKEND_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (PUBLISHABLE_KEY) headers["x-publishable-api-key"] = PUBLISHABLE_KEY;
  if (options.cookie) headers.cookie = options.cookie;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      signal: options.signal ?? controller.signal,
      ...(options.revalidate === 0
        ? { cache: "no-store" as const }
        : { next: { revalidate: options.revalidate ?? 60, tags: options.tags } }),
    });

    if (!response.ok) {
      const message = await readErrorMessage(response);
      return { ok: false, status: response.status, message };
    }

    // 204 No Content is a success with nothing to parse.
    if (response.status === 204) return { ok: true, data: undefined as T };

    return { ok: true, data: (await response.json()) as T };
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      status: aborted ? 504 : 503,
      message: aborted
        ? "Forbindelsen til NordPrint tog for lang tid."
        : "Vi kunne ikke få forbindelse til NordPrint lige nu.",
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string };
    if (typeof body.message === "string") return body.message;
  } catch {
    // A non-JSON error body is not worth surfacing to a customer.
  }
  return response.status === 404 ? "Siden blev ikke fundet." : "Der opstod en fejl.";
}

/**
 * Unwraps a result or returns a fallback.
 *
 * Use this for supporting data (reviews, related guides) — anything the page
 * can render without. Use the raw result when the data *is* the page, so the
 * route can render a proper error state instead of an empty one.
 */
export function orFallback<T>(result: ApiResult<T>, fallback: T): T {
  return result.ok ? result.data : fallback;
}
