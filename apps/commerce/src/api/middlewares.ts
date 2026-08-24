import { defineMiddlewares } from "@medusajs/framework/http";
import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * Rate limiting for endpoints that are cheap to call and expensive to abuse:
 * search autocomplete, review submission, wishlist writes and the customer
 * auth endpoints.
 *
 * The store is fronted by Caddy in production, which also rate-limits at the
 * edge; this is defence in depth for anything that reaches the app — including
 * traffic from inside the Docker network.
 *
 * The window is kept in memory on purpose: it is per-instance, resets on
 * deploy and needs no coordination. For a two-container deployment that is the
 * right trade-off. If NordPrint ever scales horizontally past that, back it
 * with the Redis instance the app already has.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
/** Stops the map growing without bound on a long-running process. */
const MAX_TRACKED_CLIENTS = 10_000;

function rateLimit(options: { windowMs: number; max: number; message?: string }) {
  return (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction): void => {
    const key = `${req.path}:${clientIp(req)}`;
    const now = Date.now();

    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (buckets.size > MAX_TRACKED_CLIENTS) buckets.clear();
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    bucket.count += 1;

    if (bucket.count > options.max) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        message: options.message ?? "For mange forsøg. Prøv igen om lidt.",
        retryAfter,
      });
      return;
    }

    next();
  };
}

/**
 * Behind Caddy the socket address is the proxy's. `X-Forwarded-For` is only
 * trusted because Caddy sets it — the app is never exposed directly.
 */
function clientIp(req: MedusaRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]!.trim();
  if (Array.isArray(forwarded) && forwarded[0]) return forwarded[0].split(",")[0]!.trim();
  return req.socket?.remoteAddress ?? "unknown";
}

/** Headers that cost nothing and close off whole classes of attack. */
function securityHeaders(_req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  next();
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/store/*",
      middlewares: [securityHeaders],
    },
    {
      matcher: "/admin/*",
      middlewares: [securityHeaders],
    },
    {
      // Autocomplete fires on every keystroke; generous, but bounded.
      matcher: "/store/nordprint/search",
      middlewares: [rateLimit({ windowMs: 60_000, max: 120 })],
    },
    {
      matcher: "/store/nordprint/recommendations",
      middlewares: [rateLimit({ windowMs: 60_000, max: 60 })],
    },
    {
      matcher: "/store/nordprint/reviews/*",
      method: ["POST"],
      middlewares: [
        rateLimit({
          windowMs: 60 * 60_000,
          max: 5,
          message: "Du har sendt flere anmeldelser for nylig. Prøv igen om lidt.",
        }),
      ],
    },
    {
      matcher: "/store/nordprint/wishlist*",
      method: ["POST", "DELETE"],
      middlewares: [rateLimit({ windowMs: 60_000, max: 60 })],
    },
    {
      // Credential endpoints: the classic brute-force target.
      matcher: "/auth/customer/*",
      method: ["POST"],
      middlewares: [
        rateLimit({
          windowMs: 15 * 60_000,
          max: 20,
          message: "For mange loginforsøg. Prøv igen om 15 minutter.",
        }),
      ],
    },
    {
      matcher: "/admin/nordprint/imports/*",
      method: ["POST"],
      middlewares: [rateLimit({ windowMs: 60_000, max: 10 })],
    },
  ],
});
