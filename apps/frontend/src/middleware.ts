import { defineMiddleware } from "astro:middleware";

/**
 * Per-IP rate limit for form submissions (update / delete).
 *
 * The public demo lets anyone edit data, so this caps how many writes one
 * client can make. Every write goes through a POST to an Astro page, so only
 * POST is counted; reads are never limited.
 *
 * Behind Caddy, `clientAddress` is the visitor's IP only when
 * `security.allowedDomains` is set (see astro.config.mjs). Otherwise it is
 * Caddy's container IP and all visitors would share one counter.
 *
 * The counters live in memory: they reset when the container restarts, and
 * they are per process. That is fine for a single-instance demo.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_WRITES_PER_WINDOW = 30;

type Counter = { count: number; windowStart: number };
const counters = new Map<string, Counter>();

// Drop expired entries so the map does not grow with every IP ever seen
setInterval(() => {
  const now = Date.now();
  for (const [ip, counter] of counters) {
    if (now - counter.windowStart >= WINDOW_MS) counters.delete(ip);
  }
}, WINDOW_MS).unref();

export const onRequest = defineMiddleware((context, next) => {
  if (context.request.method !== "POST") return next();

  const ip = context.clientAddress;
  const now = Date.now();
  const counter = counters.get(ip);

  if (counter === undefined || now - counter.windowStart >= WINDOW_MS) {
    counters.set(ip, { count: 1, windowStart: now });
    return next();
  }

  if (counter.count >= MAX_WRITES_PER_WINDOW) {
    const retryAfterSec = Math.ceil(
      (counter.windowStart + WINDOW_MS - now) / 1000,
    );
    return new Response(
      "Too many changes from your network. This is a shared demo, please try again later.",
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      },
    );
  }

  counter.count += 1;
  return next();
});
