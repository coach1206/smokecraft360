/**
 * deviceFingerprint — persistent per-device identifier for license binding.
 *
 * The kiosk/tablet/BYOD device is identified by a UUID that is generated on
 * first launch and persisted in localStorage. The id is sent on every API
 * request via the `X-Device-Id` header; the server uses it to:
 *
 *   1. touch `devices.lastActiveAt` for liveness reporting
 *   2. (when binding is enforced) verify that the device row exists and
 *      belongs to the same venue as the request
 *
 * Notes:
 *   - We deliberately do NOT use a hardware fingerprint (canvas/font/etc).
 *     Those are fragile across browser updates and create privacy concerns.
 *     A persistent UUID in localStorage is good enough for a venue kiosk
 *     that the operator physically controls.
 *   - If localStorage is unavailable (private mode), we fall back to a
 *     session-scoped id so the request still has *something* to send and
 *     the server treats it as ephemeral.
 */

const STORAGE_KEY = "smokecraft_device_id";

let cachedId: string | null = null;

function newUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // RFC4122-ish fallback for very old runtimes.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDeviceId(): string {
  if (cachedId) return cachedId;
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) {
      cachedId = existing;
      return existing;
    }
    const fresh = newUuid();
    localStorage.setItem(STORAGE_KEY, fresh);
    cachedId = fresh;
    return fresh;
  } catch {
    // Private mode / storage blocked — give a session-only id.
    cachedId = newUuid();
    return cachedId;
  }
}

/** Headers helper — call from `fetch` calls that should be device-tagged. */
export function getDeviceHeaders(): Record<string, string> {
  return { "X-Device-Id": getDeviceId() };
}
