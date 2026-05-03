/**
 * Rate limiting middleware.
 *
 * Applied per-prefix in app.ts:
 *   authLimiter      → /api/auth/*      (prevents brute-force login attempts)
 *   recommendLimiter → /api/recommend   (protects the scoring engine in demos)
 *
 * Limit: 50 requests per IP per 60-second window.
 * Response: 429 JSON (never HTML) when exceeded.
 */

import rateLimit from "express-rate-limit";

const WINDOW_MS = 60 * 1_000; // 1 minute
const MAX       = 50;          // requests per window

const shared = {
  windowMs:        WINDOW_MS,
  limit:           MAX,
  standardHeaders: "draft-7" as const,
  legacyHeaders:   false,
  message:         { error: "Too many requests — please wait a moment and try again" },
} as const;

export const authLimiter      = rateLimit(shared);
export const recommendLimiter = rateLimit(shared);

// OS layer: 120/min — admin tooling polls live event feed every 8s and may
// burst on filter changes; tighter than open APIs but not punishing.
export const osLimiter = rateLimit({
  ...shared,
  limit:   120,
  message: { error: "OS rate limit exceeded — slow down admin polling" },
});
