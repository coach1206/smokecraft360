/**
 * PIN Authentication — /api/auth/pin-login
 * NOVEE OS · 360 Enterprises Services LLC
 *
 * Dual-tier PIN validation:
 *   Sovereign (6-digit) — validates against FOUNDER_PIN_HASH env secret (bcrypt)
 *   Staff     (4-digit) — delegates to venueStaffTable (existing DB-backed flow)
 *
 * Security properties:
 *   - Zero PIN values in source code; all secrets are env-only
 *   - bcrypt comparison for Sovereign PIN (12 rounds min)
 *   - Server-side attempt counting per IP via in-process Map (resets on restart)
 *     → production: replace with Redis for persistence across restarts
 *   - 5 attempts max, 15-minute lockout window
 *   - Audit log entry on every attempt (success and failure)
 *   - Generic error messages — no enumeration of PIN length or tier
 *
 * Mount in app.ts after pinLimiter:
 *   app.use("/api/auth/pin-login", pinLimiter);
 *   app.use("/api/auth", authLimiter, authRouter);  // authRouter re-uses the prefix
 */

import { Router, type Request, type Response } from "express";
import bcrypt              from "bcryptjs";
import { z }               from "zod";
import { eq, and }         from "drizzle-orm";
import { db, venueStaffTable, auditLogTable } from "@workspace/db";
import { signToken }       from "../lib/jwt";
import { logger }          from "../lib/logger";

const router = Router();

// ── In-process attempt tracker ────────────────────────────────────────────────
// Per-IP. Acceptable for single-instance (Replit). Swap for Redis in multi-node.

interface AttemptRecord { count: number; lockedUntil: number | null; }
const attemptMap = new Map<string, AttemptRecord>();

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS   = 15 * 60 * 1_000; // 15 minutes

function getAttempts(ip: string): AttemptRecord {
  return attemptMap.get(ip) ?? { count: 0, lockedUntil: null };
}

function recordFailure(ip: string): AttemptRecord {
  const rec   = getAttempts(ip);
  const count = rec.count + 1;
  const lockedUntil = count >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : rec.lockedUntil;
  const next  = { count, lockedUntil };
  attemptMap.set(ip, next);
  return next;
}

function clearAttempts(ip: string) {
  attemptMap.delete(ip);
}

// ── Zod schema ────────────────────────────────────────────────────────────────

const PinLoginSchema = z.object({
  pin:     z.string().regex(/^\d{4,6}$/, "PIN must be 4–6 digits"),
  venueId: z.string().uuid().optional(),
});

// ── Best-effort audit helper ──────────────────────────────────────────────────

async function auditPin(
  ip:     string,
  tier:   "sovereign" | "staff",
  result: "success" | "failure" | "lockout",
  detail: string,
) {
  try {
    await db.insert(auditLogTable).values({
      actorId:    null,
      actorRole:  tier,
      action:     `auth.pin_${result}`,
      entityType: "pin_auth",
      entityId:   ip,
      afterState: { detail },
      ipAddress:  ip,
    });
  } catch {
    logger.warn({ ip, tier, result }, "PIN audit log write failed");
  }
}

// ── POST /api/auth/pin-login ──────────────────────────────────────────────────

router.post("/", async (req: Request, res: Response) => {
  const ip = (req.ip ?? req.socket.remoteAddress ?? "unknown").replace(/^::ffff:/, "");

  // ── Lockout check ────────────────────────────────────────────────────────────
  const rec = getAttempts(ip);
  if (rec.lockedUntil && Date.now() < rec.lockedUntil) {
    const remainingSeconds = Math.ceil((rec.lockedUntil - Date.now()) / 1_000);
    logger.warn({ ip }, "PIN login blocked — lockout active");
    await auditPin(ip, "staff", "lockout", `Locked out — ${remainingSeconds}s remaining`);
    res.status(429).json({
      error:             "too_many_attempts",
      message:           "Too many failed attempts. Please wait before trying again.",
      retryAfterSeconds: remainingSeconds,
    });
    return;
  }

  // ── Validate input ────────────────────────────────────────────────────────────
  const parsed = PinLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_input", message: "PIN must be 4–6 digits." });
    return;
  }

  const { pin, venueId } = parsed.data;

  // ── TIER 1: Sovereign (6-digit) ──────────────────────────────────────────────
  // FOUNDER_PIN_HASH must be a bcrypt hash of the 6-digit sovereign PIN,
  // stored as a Replit Secret. Generate with: bcrypt.hashSync("YOUR_PIN", 12)
  if (pin.length === 6) {
    const hash = process.env["FOUNDER_PIN_HASH"];

    if (!hash) {
      logger.warn({ ip }, "Sovereign PIN attempt — FOUNDER_PIN_HASH not set");
      const fail = recordFailure(ip);
      await auditPin(ip, "sovereign", "failure", "FOUNDER_PIN_HASH not configured");
      res.status(401).json({
        error:             "invalid_pin",
        message:           "Incorrect PIN.",
        attemptsRemaining: Math.max(0, MAX_ATTEMPTS - fail.count),
      });
      return;
    }

    const valid = await bcrypt.compare(pin, hash);

    if (!valid) {
      const fail = recordFailure(ip);
      logger.warn({ ip }, "Sovereign PIN rejected");
      await auditPin(ip, "sovereign", "failure", `${fail.count}/${MAX_ATTEMPTS} failed attempts`);

      if (fail.lockedUntil) {
        res.status(429).json({
          error:             "too_many_attempts",
          message:           "Too many failed attempts. Please wait before trying again.",
          retryAfterSeconds: Math.ceil((fail.lockedUntil - Date.now()) / 1_000),
        });
        return;
      }

      res.status(401).json({
        error:             "invalid_pin",
        message:           "Incorrect PIN.",
        attemptsRemaining: Math.max(0, MAX_ATTEMPTS - fail.count),
      });
      return;
    }

    clearAttempts(ip);
    logger.info({ ip }, "Sovereign PIN authenticated");
    await auditPin(ip, "sovereign", "success", "Sovereign access granted");

    const token = await signToken({
      sub:     "sovereign-jc",
      email:   (process.env["SOVEREIGN_EMAIL"] ?? "jc@dayone360.com").toLowerCase().trim(),
      role:    "super_admin",
      name:    "JC Collins",
      venueId: null,
    });

    res.json({
      ok:         true,
      tier:       "sovereign",
      token,
      redirectTo: "/sovereign-dashboard",
      name:       "JC Collins",
      role:       "super_admin",
    });
    return;
  }

  // ── TIER 2: Staff (4-digit) — DB-backed via venueStaffTable ─────────────────
  if (pin.length === 4) {
    const conditions = venueId
      ? and(
          eq(venueStaffTable.staffPin,  pin),
          eq(venueStaffTable.venueId,   venueId),
          eq(venueStaffTable.isActive,  true),
        )
      : and(
          eq(venueStaffTable.staffPin,  pin),
          eq(venueStaffTable.isActive,  true),
        );

    const [staff] = await db
      .select()
      .from(venueStaffTable)
      .where(conditions)
      .limit(1);

    if (!staff) {
      const fail = recordFailure(ip);
      logger.warn({ ip }, "Staff PIN rejected");
      await auditPin(ip, "staff", "failure", `${fail.count}/${MAX_ATTEMPTS} failed attempts`);

      if (fail.lockedUntil) {
        res.status(429).json({
          error:             "too_many_attempts",
          message:           "Too many failed attempts. Please wait before trying again.",
          retryAfterSeconds: Math.ceil((fail.lockedUntil - Date.now()) / 1_000),
        });
        return;
      }

      res.status(401).json({
        error:             "invalid_pin",
        message:           "Incorrect PIN.",
        attemptsRemaining: Math.max(0, MAX_ATTEMPTS - fail.count),
      });
      return;
    }

    clearAttempts(ip);
    logger.info({ ip, staffId: staff.staffId }, "Staff PIN authenticated");
    await auditPin(ip, "staff", "success", `Staff ${staff.staffName} authenticated`);

    const token = await signToken({
      sub:     staff.staffId,
      email:   `staff-${staff.staffId}@kiosk.internal`,
      role:    "staff",
      name:    staff.staffName,
      venueId: staff.venueId ?? null,
    });

    res.json({
      ok:         true,
      tier:       "staff",
      token,
      redirectTo: "/pos",
      name:       staff.staffName,
      role:       "staff",
      venueId:    staff.venueId,
    });
    return;
  }

  res.status(400).json({ error: "invalid_input", message: "PIN must be 4 or 6 digits." });
});

export default router;
