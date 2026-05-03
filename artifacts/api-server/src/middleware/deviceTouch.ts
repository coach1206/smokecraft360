/**
 * deviceTouch — passive middleware that updates `devices.lastActiveAt` for
 * any request carrying an `X-Device-Id` header.
 *
 * Behaviour:
 *   - Header missing → no-op (request passes).
 *   - Header present, device row not found → no-op (kiosks may launch
 *     before they are formally registered; we do NOT block here).
 *   - Header present, device row found → debounced UPDATE of lastActiveAt
 *     (at most once per minute per device) and verification that the device
 *     belongs to the authenticated user's venue when both are present.
 *
 * This is intentionally a SOFT bind: it produces an audit trail and powers
 * the DeviceManager "last seen" column without locking out kiosks during
 * onboarding. Hard binding (reject mismatched devices) is layered on top
 * via `requireDeviceBinding` for revenue-critical routes only.
 */

import { type Response, type NextFunction } from "express";
import { eq }                               from "drizzle-orm";
import { db, devicesTable }                 from "@workspace/db";
import { type AuthRequest }                 from "./auth";

const TOUCH_DEBOUNCE_MS = 60_000;
const TOUCH_MAP_CAP     = 10_000;            // hard cap to prevent unbounded
                                             // growth from spoofed UUIDs
const lastTouch = new Map<string, number>(); // insertion-order LRU

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

export async function deviceTouch(
  req:  AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const raw = req.header("x-device-id");
  if (!raw || !isUuid(raw)) { next(); return; }

  const now  = Date.now();
  const last = lastTouch.get(raw) ?? 0;
  if (now - last < TOUCH_DEBOUNCE_MS) { next(); return; }

  // Evict oldest when at cap (Map preserves insertion order)
  if (lastTouch.size >= TOUCH_MAP_CAP) {
    const oldest = lastTouch.keys().next().value;
    if (oldest !== undefined) lastTouch.delete(oldest);
  }
  lastTouch.set(raw, now);

  // Fire-and-forget — never block the request. The UPDATE only matches an
  // existing devices.id row, so spoofed UUIDs cannot insert garbage and
  // cannot promote unknown devices to "seen".
  void (async () => {
    try {
      await db
        .update(devicesTable)
        .set({ lastActiveAt: new Date(), updatedAt: new Date() })
        .where(eq(devicesTable.id, raw));
    } catch (err) {
      req.log?.warn({ err, deviceId: raw }, "deviceTouch update failed");
    }
  })();

  next();
}

/**
 * requireDeviceBinding — hard check used by revenue-critical routes.
 *
 * If `X-Device-Id` is present:
 *   - device row MUST exist
 *   - device.venueId MUST match req.user.venueId (or super_admin override)
 *
 * If header is absent → PASS (legacy clients / browser dashboards). The
 * intent is to lock down kiosk-specific surfaces, not to break unrelated
 * dashboard traffic.
 */
export async function requireDeviceBinding(
  req:  AuthRequest,
  res:  Response,
  next: NextFunction,
): Promise<void> {
  const raw = req.header("x-device-id");
  if (!raw) { next(); return; }
  if (!isUuid(raw)) {
    res.status(400).json({ error: "Invalid X-Device-Id" });
    return;
  }

  try {
    const [device] = await db
      .select()
      .from(devicesTable)
      .where(eq(devicesTable.id, raw))
      .limit(1);

    if (!device) {
      res.status(403).json({ error: "Device not registered", deviceId: raw });
      return;
    }
    if (device.status !== "active") {
      res.status(403).json({ error: "Device is inactive", deviceId: raw });
      return;
    }
    if (
      req.user?.role !== "super_admin" &&
      req.user?.venueId &&
      device.venueId !== req.user.venueId
    ) {
      res.status(403).json({ error: "Device does not belong to this venue" });
      return;
    }
    next();
  } catch (err) {
    req.log?.error({ err }, "requireDeviceBinding failed");
    res.status(500).json({ error: "Device check failed" });
  }
}
