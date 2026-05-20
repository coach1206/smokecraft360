/**
 * pinMatrix.ts — Multi-tier PIN access control system.
 *
 * Three tiers, each unlocking deeper venue functionality:
 *
 *   STAFF      (4-digit) — floor operations: table management, orders, alerts
 *   MANAGEMENT (6-digit) — environment control, inventory, analytics
 *   SOVEREIGN  (8-digit) — full system access, ControlChamber, all overrides
 *
 * Verification:
 *   STAFF:      Fast-path against local known PINs + API confirm when available
 *   MANAGEMENT: API-only via POST /api/auth/pin-login
 *   SOVEREIGN:  API-only via POST /api/auth/pin-login (role=sovereign check)
 *
 * Lockout: 3 failures → 5-minute cooldown per tier.
 * Session: sessionStorage `eat_pin_<tier>` with 8-hour expiry.
 */

export type PinTier = "staff" | "management" | "sovereign";

export interface PinSession {
  tier:      PinTier;
  expiresAt: number;
  userId?:   string;
  name?:     string;
}

export interface PinVerifyResult {
  success:  boolean;
  session?: PinSession;
  error?:   string;
  locked?:  boolean;
  lockMs?:  number;
}

export const PIN_DIGITS: Record<PinTier, number> = {
  staff:      4,
  management: 6,
  sovereign:  8,
};

export const PIN_LABELS: Record<PinTier, { title: string; sub: string; color: string }> = {
  staff:      { title: "STAFF ACCESS",      sub: "Floor Operations · Table Management",  color: "#D4AF37" },
  management: { title: "MANAGEMENT ACCESS", sub: "Environment · Inventory · Analytics",  color: "#C87028" },
  sovereign:  { title: "SOVEREIGN ACCESS",  sub: "Full System Control",                  color: "#E8C840" },
};

const SESSION_TTL = 8 * 60 * 60 * 1000;  // 8 hours
const LOCKOUT_MS  = 5 * 60 * 1000;       // 5 minutes
const MAX_FAILURES = 3;

// Staff fast-path PINs (used when API is unreachable)
const STAFF_LOCAL = new Set(["1234", "2580", "7890"]);

// ── Storage helpers ───────────────────────────────────────────────────────────

function sessionKey(tier: PinTier) { return `eat_pin_${tier}`; }
function lockKey   (tier: PinTier) { return `eat_pin_lock_${tier}`; }

export function getSession(tier: PinTier): PinSession | null {
  try {
    const raw = sessionStorage.getItem(sessionKey(tier));
    if (!raw) return null;
    const s = JSON.parse(raw) as PinSession;
    if (Date.now() > s.expiresAt) { sessionStorage.removeItem(sessionKey(tier)); return null; }
    return s;
  } catch { return null; }
}

export function hasAccess(tier: PinTier): boolean {
  return getSession(tier) !== null;
}

/** Staff access also grants read-only view of floor at management pages */
export function hasAtLeast(tier: PinTier): boolean {
  const order: PinTier[] = ["staff", "management", "sovereign"];
  const required = order.indexOf(tier);
  return order.some((t, i) => i >= required && getSession(t) !== null);
}

export function clearSession(tier: PinTier): void {
  try { sessionStorage.removeItem(sessionKey(tier)); } catch { /* SSR */ }
}

export function clearAllSessions(): void {
  (["staff", "management", "sovereign"] as PinTier[]).forEach(clearSession);
}

function saveSession(tier: PinTier, name?: string, userId?: string): PinSession {
  const s: PinSession = { tier, expiresAt: Date.now() + SESSION_TTL, name, userId };
  try { sessionStorage.setItem(sessionKey(tier), JSON.stringify(s)); } catch { /* SSR */ }
  return s;
}

// ── Lockout helpers ───────────────────────────────────────────────────────────

interface LockState { failures: number; lockedUntil: number | null }

function getLockState(tier: PinTier): LockState {
  try {
    const raw = sessionStorage.getItem(lockKey(tier));
    return raw ? (JSON.parse(raw) as LockState) : { failures: 0, lockedUntil: null };
  } catch { return { failures: 0, lockedUntil: null }; }
}

function saveLockState(tier: PinTier, s: LockState): void {
  try { sessionStorage.setItem(lockKey(tier), JSON.stringify(s)); } catch { /* SSR */ }
}

function clearLock(tier: PinTier): void {
  try { sessionStorage.removeItem(lockKey(tier)); } catch { /* SSR */ }
}

export function getLockMs(tier: PinTier): number {
  const s = getLockState(tier);
  if (!s.lockedUntil) return 0;
  return Math.max(0, s.lockedUntil - Date.now());
}

// ── Verification ──────────────────────────────────────────────────────────────

export async function verifyPin(tier: PinTier, pin: string): Promise<PinVerifyResult> {
  // Enforce lockout
  const lock = getLockState(tier);
  if (lock.lockedUntil && Date.now() < lock.lockedUntil) {
    return { success: false, locked: true, lockMs: lock.lockedUntil - Date.now() };
  }

  if (pin.length !== PIN_DIGITS[tier]) {
    return { success: false, error: `${PIN_DIGITS[tier]}-digit PIN required` };
  }

  let success = false;
  let name:   string | undefined;
  let userId: string | undefined;

  // Try API verification
  try {
    const res  = await fetch("/api/auth/pin-login", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ pin, tier }),
    });
    if (res.ok) {
      const data = await res.json() as {
        success?: boolean; name?: string; userId?: string;
        tier?: string; role?: string;
      };
      if (
        data.success === true ||
        data.tier  === tier   ||
        data.role  === tier   ||
        data.role  === "sovereign"
      ) {
        success = true;
        name    = data.name;
        userId  = data.userId;
      }
    }
  } catch {
    // Network unavailable — staff tier allows local fast-path
    if (tier === "staff" && STAFF_LOCAL.has(pin)) {
      success = true;
      name    = "Staff";
    }
  }

  if (success) {
    clearLock(tier);
    return { success: true, session: saveSession(tier, name, userId) };
  }

  // Record failure and possibly lock
  const failures     = lock.failures + 1;
  const lockedUntil  = failures >= MAX_FAILURES ? Date.now() + LOCKOUT_MS : null;
  saveLockState(tier, { failures, lockedUntil });

  return {
    success: false,
    error:   "Incorrect PIN",
    locked:  !!lockedUntil,
    lockMs:  lockedUntil ? LOCKOUT_MS : undefined,
  };
}
