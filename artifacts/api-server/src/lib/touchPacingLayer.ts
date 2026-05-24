import { type Request, type Response, type NextFunction, type RequestHandler } from "express";
import { getIO } from "./socketServer";
import { pushTelemetry } from "./eatCommandState";

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

/** Window within which a repeat tap on the same tableId+itemId is rejected. */
export const DEBOUNCE_WINDOW_MS = 750;

/** How often the expired-entry cleanup sweep runs. */
const CLEANUP_INTERVAL_MS = 5_000;

// ══════════════════════════════════════════════════════════════════════════════
// IDEMPOTENCY CACHE
// ══════════════════════════════════════════════════════════════════════════════

/** Key → epoch ms of last accepted touch event. */
const idempotencyCache = new Map<string, number>();

/** Stats counters (server-lifetime). */
let totalAccepted  = 0;
let totalRejected  = 0;

/** Periodic sweep — purge entries whose window has expired. */
setInterval(() => {
  const cutoff = Date.now() - DEBOUNCE_WINDOW_MS;
  for (const [key, ts] of idempotencyCache) {
    if (ts < cutoff) idempotencyCache.delete(key);
  }
}, CLEANUP_INTERVAL_MS);

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export function buildTouchKey(tableId: string, itemId: string): string {
  return `${tableId}::${itemId}`;
}

/**
 * Atomically check + register a touch event.
 * Returns "duplicate" if the same key appeared within DEBOUNCE_WINDOW_MS.
 */
export function checkAndRegister(key: string): "ok" | "duplicate" {
  const now  = Date.now();
  const last = idempotencyCache.get(key);
  if (last !== undefined && now - last < DEBOUNCE_WINDOW_MS) {
    totalRejected++;
    return "duplicate";
  }
  idempotencyCache.set(key, now);
  totalAccepted++;
  return "ok";
}

// ══════════════════════════════════════════════════════════════════════════════
// OPTIMISTIC SOCKET FRAMES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Emit TOUCH_LOCK immediately — freezes the client-side hit zone during processing.
 * Includes ttlMs so the client can auto-release if TOUCH_UNLOCK never arrives.
 */
export function emitTouchLock(tableId: string, itemId: string): void {
  getIO().emit("TOUCH_LOCK", {
    tableId,
    itemId,
    lockedAt: Date.now(),
    ttlMs: DEBOUNCE_WINDOW_MS,
  });
}

/**
 * Emit TOUCH_UNLOCK to unfreeze the hit zone.
 * status="ok" → normal release; status="error"|"rejected" → visual feedback.
 */
export function emitTouchUnlock(
  tableId: string,
  itemId:  string,
  status:  "ok" | "error" | "rejected",
): void {
  getIO().emit("TOUCH_UNLOCK", {
    tableId,
    itemId,
    unlockedAt: Date.now(),
    status,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPRESS MIDDLEWARE FACTORY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * touchGuard — drop-in middleware for any touch-driven route.
 *
 * Flow:
 *  1. Extract tableId + itemId from the request using the supplied accessors.
 *  2. Immediately emit TOUCH_LOCK to freeze the client hit zone.
 *  3. Check the idempotency cache.
 *     • Duplicate within 750ms → emit TOUCH_UNLOCK(rejected) + return HTTP 429.
 *     • First tap → continue to route handler.
 *
 * Route handlers that use this middleware should call emitTouchUnlock() at
 * their success/error exit points so the UI is released as fast as possible
 * rather than waiting for the 750ms TTL to expire on the client.
 */
export function touchGuard(
  getTableId: (req: Request) => string | undefined,
  getItemId:  (req: Request) => string | undefined,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tableId = getTableId(req);
    const itemId  = getItemId(req);

    // Without both keys we cannot debounce — pass through
    if (!tableId || !itemId) {
      next();
      return;
    }

    // ── Optimistic lock — fires before ANY processing ─────────────────────────
    emitTouchLock(tableId, itemId);

    const result = checkAndRegister(buildTouchKey(tableId, itemId));

    if (result === "duplicate") {
      emitTouchUnlock(tableId, itemId, "rejected");
      pushTelemetry({
        timestamp: Date.now(),
        system:    "EAT_ENGINE",
        level:     "WARN",
        message:   `Double-tap rejected: ${tableId}::${itemId}`,
        payload:   { tableId, itemId, windowMs: DEBOUNCE_WINDOW_MS },
      });
      res.status(429).json({
        ok:           false,
        error:        "double_tap_rejected",
        retryAfterMs: DEBOUNCE_WINDOW_MS,
        tableId,
        itemId,
      });
      return;
    }

    // Expose touch context to downstream handlers
    res.locals.touchTableId = tableId;
    res.locals.touchItemId  = itemId;

    next();
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// TELEMETRY SNAPSHOT
// ══════════════════════════════════════════════════════════════════════════════

export function getTouchCacheStats() {
  return {
    activeLocks:   idempotencyCache.size,
    activeKeys:    [...idempotencyCache.keys()],
    totalAccepted,
    totalRejected,
    debounceWindowMs: DEBOUNCE_WINDOW_MS,
  };
}
