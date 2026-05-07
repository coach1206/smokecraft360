/**
 * Environment Sync API — atmospheric orchestration log
 *
 * GET  /api/environment-sync          Venue-scoped sync history (manager+)
 * POST /api/environment-sync          Log a sync event (staff+)
 * GET  /api/environment-sync/presets  Available DMX presets (staff+)
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, desc }                       from "drizzle-orm";
import { z }                                   from "zod";
import {
  db,
  environmentSyncHistoryTable,
  DMX_PRESETS,
  SYNC_TRIGGERS,
}                                              from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";

const router: IRouter = Router();

const staffUp   = [requireAuth, requireRole("staff",   "manager", "venue_owner", "super_admin")];
const managerUp = [requireAuth, requireRole("manager", "venue_owner", "super_admin")];

// ── GET /presets ──────────────────────────────────────────────────────────────

router.get("/presets", ...staffUp, (_req: AuthRequest, res: Response) => {
  res.json({
    presets: DMX_PRESETS,
    triggers: SYNC_TRIGGERS,
    description: {
      PREMIUM_WINDOW:  "Warm amber + low shadow — curated premium reveal",
      HIGH_ENERGY:     "Full brightness + saturation — peak engagement window",
      INTIMATE_REVEAL: "Candlelight dim + spot focus — one-on-one recommendation moment",
      COOL_DOWN:       "Cool blue wash — post-peak transition",
      AMBIENT_HOLD:    "Hold current state, no DMX change",
    },
  });
});

// ── GET / ─────────────────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  preset:   z.enum(DMX_PRESETS    as unknown as [string, ...string[]]).optional(),
  trigger:  z.enum(SYNC_TRIGGERS  as unknown as [string, ...string[]]).optional(),
  limit:    z.coerce.number().int().min(1).max(200).default(50),
  offset:   z.coerce.number().int().min(0).default(0),
});

router.get("/", ...managerUp, async (req: AuthRequest, res: Response) => {
  const q = listQuerySchema.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: "Invalid query", details: q.error.flatten() }); return; }

  const { preset, trigger, limit, offset } = q.data;
  const venueId = req.user!.role === "super_admin"
    ? (typeof req.query["venueId"] === "string" ? req.query["venueId"] : null)
    : (req.user!.venueId ?? null);

  if (!venueId && req.user!.role !== "super_admin") {
    res.status(400).json({ error: "venueId required" }); return;
  }

  const conditions = [];
  if (venueId) conditions.push(eq(environmentSyncHistoryTable.venueId, venueId));
  if (preset)  conditions.push(eq(environmentSyncHistoryTable.dmxPresetApplied, preset as typeof DMX_PRESETS[number]));
  if (trigger) conditions.push(eq(environmentSyncHistoryTable.triggeredBy, trigger as typeof SYNC_TRIGGERS[number]));

  const rows = await db
    .select()
    .from(environmentSyncHistoryTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(environmentSyncHistoryTable.appliedAt))
    .limit(limit)
    .offset(offset);

  res.json({ total: rows.length, limit, offset, syncs: rows });
});

// ── POST / — log sync event ───────────────────────────────────────────────────

const syncSchema = z.object({
  venueId:              z.string().uuid(),
  roomEnergyTrigger:    z.number().min(0).max(100).optional(),
  dmxPresetApplied:     z.enum(DMX_PRESETS    as unknown as [string, ...string[]]).optional(),
  hapticPulseIntensity: z.number().min(0).max(1).optional(),
  triggeredBy:          z.enum(SYNC_TRIGGERS  as unknown as [string, ...string[]]).default("AUTOMATION"),
});

router.post("/", ...staffUp, async (req: AuthRequest, res: Response) => {
  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() }); return; }

  // Non-super_admin can only log for their own venue
  if (req.user!.role !== "super_admin" && parsed.data.venueId !== req.user!.venueId) {
    res.status(403).json({ error: "Cross-venue sync log denied" }); return;
  }

  const [row] = await db
    .insert(environmentSyncHistoryTable)
    .values({
      venueId:              parsed.data.venueId,
      roomEnergyTrigger:    parsed.data.roomEnergyTrigger    ?? null,
      dmxPresetApplied:     parsed.data.dmxPresetApplied     as typeof DMX_PRESETS[number] | undefined,
      hapticPulseIntensity: parsed.data.hapticPulseIntensity ?? null,
      triggeredBy:          parsed.data.triggeredBy          as typeof SYNC_TRIGGERS[number],
      actorId:              parsed.data.triggeredBy === "STAFF" ? req.user!.id : null,
    })
    .returning();

  res.status(201).json({ message: "Sync event logged", sync: row });
});

export default router;
