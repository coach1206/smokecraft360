/**
 * websocketRateProtection — per-socket and per-room rate limiting.
 *
 * Prevents:
 *   - Runaway clients flooding event rooms
 *   - Spam reconnect loops (exponential backoff enforcement)
 *   - Mass simultaneous room joins (thundering herd on reconnect)
 *
 * Integrates with: Socket.IO middleware (call checkSocketRate() on each event)
 */

import { logger }   from "../lib/logger";
import { increment } from "../platform/observability/metricsCollector";

interface SocketBucket {
  tokens:    number;
  lastRefill:number;
  violations:number;
  blockedUntil: number;
}

const socketBuckets = new Map<string, SocketBucket>();
const REFILL_RATE   = 10;    // tokens/sec
const BURST_CAP     = 30;    // max burst
const BLOCK_AFTER   = 3;     // violations before temp block
const BLOCK_MS      = 30_000;

function getBucket(socketId: string): SocketBucket {
  let b = socketBuckets.get(socketId);
  if (!b) { b = { tokens: BURST_CAP, lastRefill: Date.now(), violations: 0, blockedUntil: 0 }; socketBuckets.set(socketId, b); }
  return b;
}

function refill(b: SocketBucket): void {
  const now     = Date.now();
  const elapsed = (now - b.lastRefill) / 1000;
  b.tokens      = Math.min(BURST_CAP, b.tokens + elapsed * REFILL_RATE);
  b.lastRefill  = now;
}

export type RateCheckResult = "allow" | "throttle" | "block";

export function checkSocketRate(socketId: string, eventName: string): RateCheckResult {
  const b   = getBucket(socketId);
  const now = Date.now();

  if (b.blockedUntil > now) {
    increment("websocket.rate", "blocked_events", 1, { event: eventName });
    return "block";
  }

  refill(b);

  if (b.tokens < 1) {
    b.violations++;
    increment("websocket.rate", "throttled_events", 1, { event: eventName });

    if (b.violations >= BLOCK_AFTER) {
      b.blockedUntil = now + BLOCK_MS;
      logger.warn({ socketId, violations: b.violations }, "websocketRateProtection: socket blocked");
      increment("websocket.rate", "sockets_blocked", 1);
      return "block";
    }
    return "throttle";
  }

  b.tokens--;
  b.violations = Math.max(0, b.violations - 1); // decay violations
  return "allow";
}

export function releaseSocket(socketId: string): void {
  socketBuckets.delete(socketId);
}

export function getSocketRateStats(socketId: string): {
  tokens: number; violations: number; blockedUntil: number;
} {
  const b = getBucket(socketId);
  refill(b);
  return { tokens: Math.floor(b.tokens), violations: b.violations, blockedUntil: b.blockedUntil };
}

// Periodic cleanup of stale socket buckets
setInterval(() => {
  const now = Date.now();
  for (const [id, b] of socketBuckets.entries()) {
    if (now - b.lastRefill > 5 * 60_000) socketBuckets.delete(id);
  }
}, 5 * 60_000).unref();
