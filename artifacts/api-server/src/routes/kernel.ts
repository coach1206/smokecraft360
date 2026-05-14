/**
 * Kernel routes — NOVEE OS Titan Kernel
 *
 * GET  /api/kernel/modules              — list registered modules
 * POST /api/kernel/modules              — register a module (super_admin)
 * GET  /api/kernel/mode/:venueId        — get Sovereign/Essential mode for a venue
 * PATCH /api/kernel/mode/:venueId       — set mode (admin/super_admin only)
 * POST /api/kernel/telemetry            — ingest a telemetry event
 * GET  /api/kernel/telemetry/summary    — aggregated telemetry summary
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db }                        from "@workspace/db";
import {
  kernelModulesTable,
  kernelModeConfigTable,
  telemetryEventsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { z }                             from "zod";
import { eq, desc, sql, count }          from "drizzle-orm";

const router: IRouter = Router();

// ── Validation schemas ─────────────────────────────────────────────────────────

const RegisterModuleSchema = z.object({
  name:        z.string().min(1).max(120),
  craftType:   z.enum(["smoke", "pour", "brew", "vape", "none"]).default("none"),
  slug:        z.string().min(1).max(80),
  status:      z.enum(["active", "inactive", "suspended"]).default("active"),
  description: z.string().optional(),
  launchUrl:   z.string().optional(),
});

const SetModeSchema = z.object({
  mode: z.enum(["sovereign", "essential"]),
});

const TelemetryIngestSchema = z.object({
  moduleId:  z.string().uuid().optional(),
  venueId:   z.string().uuid().optional(),
  eventType: z.string().min(1).max(120),
  payload:   z.record(z.unknown()).optional(),
});

// ── GET /api/kernel/modules ────────────────────────────────────────────────────

router.get("/modules", async (_req: Request, res: Response) => {
  try {
    const modules = await db
      .select()
      .from(kernelModulesTable)
      .orderBy(desc(kernelModulesTable.registeredAt));
    res.json({ modules });
  } catch (err) {
    res.status(500).json({ error: "Failed to list kernel modules" });
  }
});

// ── POST /api/kernel/modules ───────────────────────────────────────────────────

router.post("/modules", requireAuth, async (req: AuthRequest, res: Response) => {
  const role = (req as AuthRequest).user?.role;
  if (role !== "super_admin") {
    return res.status(403).json({ error: "super_admin only" });
  }

  const parsed = RegisterModuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  try {
    const [mod] = await db
      .insert(kernelModulesTable)
      .values(parsed.data)
      .returning();
    return res.status(201).json({ module: mod });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: msg });
  }
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── GET /api/kernel/mode/:venueId ─────────────────────────────────────────────
// Public read — no PII returned, mode config is venue-level operational data.

router.get("/mode/:venueId", async (req: Request, res: Response) => {
  const { venueId } = req.params as { venueId: string };
  if (!UUID_RE.test(venueId)) return res.status(400).json({ error: "venueId must be a valid UUID" });

  try {
    const [cfg] = await db
      .select()
      .from(kernelModeConfigTable)
      .where(eq(kernelModeConfigTable.venueId, venueId));

    if (!cfg) {
      return res.json({ venueId, mode: "sovereign" });
    }
    return res.json({ venueId, mode: cfg.mode, updatedAt: cfg.updatedAt });
  } catch {
    return res.status(500).json({ error: "Failed to read mode config" });
  }
});

// ── PATCH /api/kernel/mode/:venueId ──────────────────────────────────────────
// Admin/super_admin only — requires a valid Bearer JWT with the correct role.

router.patch("/mode/:venueId", requireAuth, async (req: AuthRequest, res: Response) => {
  const role = (req as AuthRequest).user?.role;
  if (role !== "admin" && role !== "super_admin") {
    return res.status(403).json({ error: "admin or super_admin only" });
  }

  const { venueId } = req.params as { venueId: string };
  if (!UUID_RE.test(venueId)) return res.status(400).json({ error: "venueId must be a valid UUID" });
  const parsed = SetModeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  try {
    const [cfg] = await db
      .insert(kernelModeConfigTable)
      .values({
        venueId,
        mode: parsed.data.mode,
        updatedBy: (req as AuthRequest).user?.id,
      })
      .onConflictDoUpdate({
        target: kernelModeConfigTable.venueId,
        set: {
          mode: parsed.data.mode,
          updatedAt: new Date(),
          updatedBy: (req as AuthRequest).user?.id,
        },
      })
      .returning();
    return res.json({ venueId, mode: cfg.mode, updatedAt: cfg.updatedAt });
  } catch {
    return res.status(500).json({ error: "Failed to update mode config" });
  }
});

// ── POST /api/kernel/telemetry ─────────────────────────────────────────────────

router.post("/telemetry", async (req: Request, res: Response) => {
  const parsed = TelemetryIngestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  try {
    await db.insert(telemetryEventsTable).values({
      moduleId:  parsed.data.moduleId ?? null,
      venueId:   parsed.data.venueId  ?? null,
      eventType: parsed.data.eventType,
      payload:   parsed.data.payload  ?? {},
    });
    return res.status(202).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to ingest telemetry event" });
  }
});

// ── GET /api/kernel/telemetry/summary ─────────────────────────────────────────
// Public read — aggregated counts only, no PII.

router.get("/telemetry/summary", async (_req: Request, res: Response) => {
  try {
    // Total event count
    const [{ total }] = await db
      .select({ total: count() })
      .from(telemetryEventsTable);

    // Events per day (last 30 days)
    const dailyResult = await db.execute(sql`
      SELECT
        DATE_TRUNC('day', occurred_at)::date::text AS day,
        COUNT(*)::int AS cnt
      FROM telemetry_events
      WHERE occurred_at >= NOW() - INTERVAL '30 days'
      GROUP BY 1
      ORDER BY 1 ASC
    `);
    const dailyCounts = dailyResult.rows as { day: string; cnt: number }[];

    // Top event types
    const topResult = await db.execute(sql`
      SELECT event_type, COUNT(*)::int AS cnt
      FROM telemetry_events
      GROUP BY event_type
      ORDER BY cnt DESC
      LIMIT 10
    `);
    const topEventTypes = topResult.rows as { event_type: string; cnt: number }[];

    // Per-module usage
    const moduleResult = await db.execute(sql`
      SELECT
        km.name AS module_name,
        km.slug AS module_slug,
        COUNT(te.id)::int AS event_count
      FROM kernel_modules km
      LEFT JOIN telemetry_events te ON te.module_id = km.id
      GROUP BY km.id, km.name, km.slug
      ORDER BY event_count DESC
    `);
    const moduleUsage = moduleResult.rows as { module_name: string; module_slug: string; event_count: number }[];

    // Ritual engagement: ratio of build-completions to swipe-starts
    const [swipeStarts] = await db
      .select({ n: count() })
      .from(telemetryEventsTable)
      .where(eq(telemetryEventsTable.eventType, "swipe_start"));

    const [buildCompletions] = await db
      .select({ n: count() })
      .from(telemetryEventsTable)
      .where(eq(telemetryEventsTable.eventType, "build_complete"));

    const ritualEngagement =
      swipeStarts.n > 0
        ? Math.round((buildCompletions.n / swipeStarts.n) * 100)
        : 0;

    return res.json({
      total,
      dailyCounts,
      topEventTypes,
      moduleUsage,
      ritualEngagement,
    });
  } catch {
    return res.status(500).json({ error: "Failed to load telemetry summary" });
  }
});

export default router;
