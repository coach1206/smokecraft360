/**
 * Device hardware lifecycle records — physical asset sidecar to `devices`.
 *
 *   PUT  /api/devices/:deviceId/hardware       — upsert (manager+ on own venue)
 *   GET  /api/devices/:deviceId/hardware       — read (manager+ on own venue)
 *   GET  /api/devices/hardware/expiring        — super_admin warranty report
 *
 * Auth + tenant scope is inherited from the PARENT device: a caller may
 * read/write the hardware row iff they could see the device itself
 * (cross-tenant ⇒ 404, no existence leak — same G3/G5/G6 pattern).
 *
 * The hardware row is OPTIONAL — a device can exist without one (mobile
 * BYOD has nothing to record). PUT is idempotent: it inserts on first
 * call and updates on subsequent calls.
 *
 * The `/expiring` operator report is super_admin only. It surfaces
 * devices whose warranty expires within `?days=N` (default 30, max 365)
 * across the whole network so the operator can plan replacements. NULL
 * warranties are excluded by definition.
 */

import { Router, type IRouter, type Response } from "express";
import { and, asc, eq, gte, lte, sql, isNotNull } from "drizzle-orm";
import {
  db,
  devicesTable,
  deviceHardwareTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { deviceHardwareWriteLimiter } from "../middleware/rateLimit";
import { z } from "zod";

const router: IRouter = Router({ mergeParams: true });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Loose MAC pattern: 6 colon- or hyphen-separated hex pairs, OR 12 hex chars.
const MAC_RE = /^([0-9a-f]{2}([:-]?[0-9a-f]{2}){5})$/i;

const STR_MAX   = 200;
const NOTES_MAX = 2000;
const MAC_MAX   = 64;
const MAX_PRICE_CENTS = 1_000_000_000; // $10M ceiling
const MAX_EXPIRING_DAYS = 365;

const VENUE_WRITE_ROLES = ["manager", "venue_owner", "super_admin"] as const;
const VENUE_READ_ROLES  = ["staff", "manager", "venue_owner", "super_admin"] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function paramDeviceId(req: AuthRequest, res: Response): string | null {
  const id = String(req.params.deviceId ?? "");
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: "Invalid device id" });
    return null;
  }
  return id;
}

/**
 * Resolve the device the caller is targeting, applying tenant scope.
 * Cross-tenant and unknown both → 404 (G3/G5/G6 pattern, never leak
 * existence). super_admin sees all.
 */
async function resolveDevice(
  req: AuthRequest,
  res: Response,
  deviceId: string,
): Promise<{ id: string; venueId: string } | null> {
  const isSuper = req.user!.role === "super_admin";
  const conds   = [eq(devicesTable.id, deviceId)];
  if (!isSuper) {
    const venueId = req.user!.venueId ?? null;
    if (!venueId) {
      res.status(403).json({ error: "Caller has no venue context" });
      return null;
    }
    conds.push(eq(devicesTable.venueId, venueId));
  }
  const rows = await db
    .select({ id: devicesTable.id, venueId: devicesTable.venueId })
    .from(devicesTable)
    .where(and(...conds))
    .limit(1);
  if (rows.length === 0) {
    res.status(404).json({ error: "Device not found" });
    return null;
  }
  return rows[0]!;
}

// ── PUT /api/devices/:deviceId/hardware ──────────────────────────────────────

const upsertSchema = z.object({
  serialNumber:       z.string().trim().min(1).max(STR_MAX).nullable().optional(),
  manufacturer:       z.string().trim().min(1).max(STR_MAX).nullable().optional(),
  model:              z.string().trim().min(1).max(STR_MAX).nullable().optional(),
  macAddress:         z.string().trim().max(MAC_MAX).regex(MAC_RE, "Invalid MAC address").nullable().optional(),
  supplier:           z.string().trim().min(1).max(STR_MAX).nullable().optional(),
  // ISO date (YYYY-MM-DD). Stored as Postgres `date`. Nullable to clear.
  purchaseDate:       z.string().regex(ISO_DATE_RE, "purchaseDate must be YYYY-MM-DD").nullable().optional(),
  purchasePriceCents: z.number().int().min(0).max(MAX_PRICE_CENTS).nullable().optional(),
  // ISO datetime. Stored as Postgres `timestamp`. Nullable to clear.
  warrantyExpiresAt:  z.string().datetime({ offset: true }).nullable().optional(),
  notes:              z.string().max(NOTES_MAX).nullable().optional(),
}).strict();

router.put(
  "/",
  deviceHardwareWriteLimiter,
  requireAuth,
  requireRole(...VENUE_WRITE_ROLES),
  async (req: AuthRequest, res: Response) => {
    const deviceId = paramDeviceId(req, res);
    if (!deviceId) return;

    const parse = upsertSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid hardware payload", issues: parse.error.issues });
      return;
    }
    const dev = await resolveDevice(req, res, deviceId);
    if (!dev) return;

    // Build the insert payload. We pass through every field the caller
    // supplied (including explicit nulls so they can clear values), and
    // omit fields the caller didn't mention so the existing DB value is
    // preserved on the conflict-update path.
    const data = parse.data;
    const warrantyDate = data.warrantyExpiresAt
      ? new Date(data.warrantyExpiresAt)
      : data.warrantyExpiresAt; // null or undefined passes through

    const insertValues = {
      deviceId,
      ...(data.serialNumber       !== undefined && { serialNumber:       data.serialNumber }),
      ...(data.manufacturer       !== undefined && { manufacturer:       data.manufacturer }),
      ...(data.model              !== undefined && { model:              data.model }),
      ...(data.macAddress         !== undefined && { macAddress:         data.macAddress }),
      ...(data.supplier           !== undefined && { supplier:           data.supplier }),
      ...(data.purchaseDate       !== undefined && { purchaseDate:       data.purchaseDate }),
      ...(data.purchasePriceCents !== undefined && { purchasePriceCents: data.purchasePriceCents }),
      ...(warrantyDate            !== undefined && { warrantyExpiresAt:  warrantyDate as Date | null }),
      ...(data.notes              !== undefined && { notes:              data.notes }),
      updatedAt: new Date(),
    };

    // Upsert. ON CONFLICT (device_id) DO UPDATE: only the fields the
    // caller supplied this turn are overwritten; untouched columns keep
    // their existing value. `created_at` stays at the original insert time.
    const updateSet: Record<string, unknown> = { updatedAt: new Date() };
    if (data.serialNumber       !== undefined) updateSet["serialNumber"]       = data.serialNumber;
    if (data.manufacturer       !== undefined) updateSet["manufacturer"]       = data.manufacturer;
    if (data.model              !== undefined) updateSet["model"]              = data.model;
    if (data.macAddress         !== undefined) updateSet["macAddress"]         = data.macAddress;
    if (data.supplier           !== undefined) updateSet["supplier"]           = data.supplier;
    if (data.purchaseDate       !== undefined) updateSet["purchaseDate"]       = data.purchaseDate;
    if (data.purchasePriceCents !== undefined) updateSet["purchasePriceCents"] = data.purchasePriceCents;
    if (warrantyDate            !== undefined) updateSet["warrantyExpiresAt"]  = warrantyDate;
    if (data.notes              !== undefined) updateSet["notes"]              = data.notes;

    const [row] = await db
      .insert(deviceHardwareTable)
      .values(insertValues)
      .onConflictDoUpdate({ target: deviceHardwareTable.deviceId, set: updateSet })
      .returning();

    res.status(200).json(row);
  },
);

// ── GET /api/devices/:deviceId/hardware ──────────────────────────────────────

router.get(
  "/",
  requireAuth,
  requireRole(...VENUE_READ_ROLES),
  async (req: AuthRequest, res: Response) => {
    const deviceId = paramDeviceId(req, res);
    if (!deviceId) return;
    const dev = await resolveDevice(req, res, deviceId);
    if (!dev) return;

    const rows = await db
      .select()
      .from(deviceHardwareTable)
      .where(eq(deviceHardwareTable.deviceId, deviceId))
      .limit(1);

    if (rows.length === 0) {
      // Distinct shape from "device not found" (404). Caller knows the
      // device exists (resolveDevice already passed) — the hardware row
      // simply hasn't been recorded yet. Return 404 with a hint so the UI
      // can show "Add hardware record".
      res.status(404).json({ error: "No hardware record for this device", deviceId });
      return;
    }
    res.json(rows[0]);
  },
);

export default router;

// ── Top-level operator report router ─────────────────────────────────────────
// Exposed separately because it is NOT scoped by :deviceId — it surveys all
// devices the super_admin operator owns. Mounted at /api/devices/hardware
// in app.ts (alongside the per-device router).

export const deviceHardwareReportRouter: IRouter = Router();

deviceHardwareReportRouter.get(
  "/expiring",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    let days = 30;
    if (typeof req.query["days"] === "string") {
      const n = Number.parseInt(req.query["days"], 10);
      if (Number.isFinite(n) && n > 0) days = Math.min(n, MAX_EXPIRING_DAYS);
    }
    let venueFilter: string | null = null;
    if (typeof req.query["venueId"] === "string" && UUID_RE.test(req.query["venueId"])) {
      venueFilter = req.query["venueId"];
    }

    // Window: from now (already-expired warranties are interesting too —
    // they tell the operator "this asset is past warranty NOW") through
    // (now + days). Use a single bounded range so the warranty index is hit.
    const lowerBound = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // 1y back catches recently-lapsed
    const upperBound = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const conds = [
      isNotNull(deviceHardwareTable.warrantyExpiresAt),
      gte(deviceHardwareTable.warrantyExpiresAt, lowerBound),
      lte(deviceHardwareTable.warrantyExpiresAt, upperBound),
    ];
    if (venueFilter) conds.push(eq(devicesTable.venueId, venueFilter));

    const rows = await db
      .select({
        deviceId:          deviceHardwareTable.deviceId,
        nickname:          devicesTable.nickname,
        venueId:           devicesTable.venueId,
        manufacturer:      deviceHardwareTable.manufacturer,
        model:             deviceHardwareTable.model,
        serialNumber:      deviceHardwareTable.serialNumber,
        warrantyExpiresAt: deviceHardwareTable.warrantyExpiresAt,
        // Days remaining (negative = already lapsed). Computed in SQL so
        // pagination/sort works without per-row JS math.
        daysRemaining: sql<number>`extract(day from (${deviceHardwareTable.warrantyExpiresAt} - now()))::int`,
      })
      .from(deviceHardwareTable)
      .innerJoin(devicesTable, eq(devicesTable.id, deviceHardwareTable.deviceId))
      .where(and(...conds))
      .orderBy(asc(deviceHardwareTable.warrantyExpiresAt))
      .limit(500);

    res.json({ windowDays: days, venueId: venueFilter, count: rows.length, devices: rows });
  },
);
