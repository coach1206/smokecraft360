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

/* Voice TTS layer: 15/min/IP — every call is a paid ElevenLabs character
 * burn, so we cap aggressively. A kiosk speaking the commentary once per
 * recommend (and occasionally on persona swap) stays well under this. */
export const voiceLimiter = rateLimit({
  ...shared,
  limit:   15,
  message: { error: "Too many voice requests — please wait a moment" },
});

// OS layer: 120/min — admin tooling polls live event feed every 8s and may
// burst on filter changes; tighter than open APIs but not punishing.
export const osLimiter = rateLimit({
  ...shared,
  limit:   120,
  message: { error: "OS rate limit exceeded — slow down admin polling" },
});

/* NDA demo-sign limiter — public unauthenticated write, must be tight to
 * prevent automated DB amplification of the legal-evidence table. A real
 * human signs once per session; 5/min/IP gives slack for accidental
 * double-tap and one retry while choking off bots. (Architect HIGH fix.) */
export const ndaSignLimiter = rateLimit({
  ...shared,
  limit:   5,
  message: { error: "Too many signature attempts — please wait a moment and try again" },
});

/* Notification-write limiter — authed inbox writes (PATCH/POST/DELETE on
 * /api/notifications). The inbox page might fire several read-marks in quick
 * succession (e.g. "mark all as I scroll"), so 60/min/IP leaves slack while
 * blocking a hostile client from churning the table. GET stays off this
 * limiter — the inbox can poll cheaply. (Same shape as memoryWriteLimiter.) */
export const notificationWriteLimiter = rateLimit({
  ...shared,
  limit:   60,
  message: { error: "Too many notification updates — please slow down" },
});

/* Voice-queue enqueue limiter — public write that any kiosk (incl. anonymous)
 * can hit to drop a transcript onto the queue. A misbehaving kiosk or hostile
 * client could try to flood the queue to crowd out legitimate commands; the
 * per-venue 200-pending cap is the hard backstop, but per-IP throttling stops
 * the noise long before it gets there. 15/min/IP — a kiosk speaking once
 * every 4 seconds is already a chatty session. */
export const voiceQueueEnqueueLimiter = rateLimit({
  ...shared,
  limit:   15,
  message: { error: "Too many voice commands queued — please wait a moment" },
});

/* Memory-write limiter — authed writes (POST/PATCH/DELETE on /api/memories).
 * A legitimate user might bulk-set ~50 memories during onboarding, so 60/min/IP
 * leaves slack while still choking off a runaway client cycling keys to thrash
 * the DB. Reads (GET /) deliberately stay off this limiter — they're cheap and
 * are polled by future UI surfaces. (Architect MEDIUM fix.) */
export const memoryWriteLimiter = rateLimit({
  ...shared,
  limit:   60,
  message: { error: "Too many memory updates — please slow down" },
});

/* Session-join limiter — authed write that scans the 6-char A-Z0-9 code
 * namespace (~36^6 ≈ 2.2B), but a brute-force enumerator could still
 * attempt thousands of codes per minute to crash an active party. 30/min
 * per IP gives a real human plenty of room to fat-finger a code and retry
 * while making automated enumeration economically pointless. */
export const sessionJoinLimiter = rateLimit({
  ...shared,
  limit:   30,
  message: { error: "Too many session-join attempts — please wait a moment" },
});

/* Offline-queue sync limiter — public write that drains a kiosk's buffered
 * actions. Kiosks naturally batch (up to 100 items per call), so callers
 * should rarely make more than a handful of /sync requests per minute.
 * 20/min/IP gives kiosks enough rope for staggered drains while keeping
 * unauthenticated DB write throughput bounded. (Architect HIGH fix.) */
export const offlineSyncLimiter = rateLimit({
  ...shared,
  limit:   20,
  message: { error: "Too many sync attempts — please wait a moment and try again" },
});
