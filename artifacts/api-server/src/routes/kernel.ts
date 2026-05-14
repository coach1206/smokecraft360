/**
 * Kernel routes — NOVEE OS Titan Kernel
 *
 * GET  /api/kernel/modules              — list registered modules
 * POST /api/kernel/modules              — register a module (admin/super_admin)
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
// Optional query param: ?slug=<value>  — returns { available: boolean } only

router.get("/modules", async (req: Request, res: Response) => {
  const { slug } = req.query as Record<string, string | undefined>;

  if (slug !== undefined) {
    // Slug availability check — no auth required
    try {
      const rows = await db
        .select({ id: kernelModulesTable.id })
        .from(kernelModulesTable)
        .where(eq(kernelModulesTable.slug, slug.trim()))
        .limit(1);
      return res.json({ available: rows.length === 0 });
    } catch {
      return res.status(500).json({ error: "Failed to check slug availability" });
    }
  }

  try {
    const modules = await db
      .select()
      .from(kernelModulesTable)
      .orderBy(desc(kernelModulesTable.registeredAt));
    return res.json({ modules });
  } catch {
    return res.status(500).json({ error: "Failed to list kernel modules" });
  }
});

// ── POST /api/kernel/modules ───────────────────────────────────────────────────

router.post("/modules", requireAuth, async (req: AuthRequest, res: Response) => {
  const role = (req as AuthRequest).user?.role;
  if (role !== "admin" && role !== "super_admin") {
    return res.status(403).json({ error: "admin or super_admin only" });
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
    // PostgreSQL unique-constraint violation
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      return res.status(409).json({ error: "Slug already in use", field: "slug" });
    }
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

// ── GET /api/kernel/telemetry/recent ──────────────────────────────────────────
// Returns the most recent telemetry events in reverse-chronological order.
// Optional query param: ?limit=N  (default 20, max 100)

router.get("/telemetry/recent", async (req: Request, res: Response) => {
  const rawLimit = parseInt((req.query as Record<string, string>).limit ?? "20", 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;

  try {
    const rows = await db
      .select({
        id:         telemetryEventsTable.id,
        eventType:  telemetryEventsTable.eventType,
        moduleId:   telemetryEventsTable.moduleId,
        venueId:    telemetryEventsTable.venueId,
        occurredAt: telemetryEventsTable.occurredAt,
      })
      .from(telemetryEventsTable)
      .orderBy(desc(telemetryEventsTable.occurredAt))
      .limit(limit);

    return res.json({ events: rows });
  } catch {
    return res.status(500).json({ error: "Failed to load recent telemetry events" });
  }
});

// ── GET /api/kernel/telemetry/summary ─────────────────────────────────────────
// Public read — aggregated counts only, no PII.
// Query params:
//   ?days=N          — primary window length in days (default 30, max 365)
//   ?compareDays=N   — when set, also return a comparison block for the
//                      preceding equivalent window of that length

async function buildSummary(windowDays: number, offsetDays = 0) {
  const windowEnd   = sql`NOW() - (${offsetDays} || ' days')::interval`;
  const windowStart = sql`NOW() - (${offsetDays + windowDays} || ' days')::interval`;

  // Total events in window
  const totalResult = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM telemetry_events
    WHERE occurred_at >= ${windowStart} AND occurred_at < ${windowEnd}
  `);
  const total = (totalResult.rows[0] as { total: number }).total;

  // Events per day — generate_series zero-fills days with no events so every
  // window always returns exactly windowDays rows in ascending order.
  const dailyResult = await db.execute(sql`
    SELECT
      gs.day::date::text AS day,
      COALESCE(c.cnt, 0)::int AS cnt
    FROM (
      SELECT generate_series(
        (${windowStart})::date,
        (${windowEnd})::date - INTERVAL '1 day',
        '1 day'::interval
      )::date AS day
    ) gs
    LEFT JOIN (
      SELECT DATE_TRUNC('day', occurred_at)::date AS day, COUNT(*)::int AS cnt
      FROM telemetry_events
      WHERE occurred_at >= ${windowStart} AND occurred_at < ${windowEnd}
      GROUP BY 1
    ) c USING (day)
    ORDER BY gs.day ASC
  `);
  const dailyCounts = dailyResult.rows as { day: string; cnt: number }[];

  // Top event types in window
  const topResult = await db.execute(sql`
    SELECT event_type, COUNT(*)::int AS cnt
    FROM telemetry_events
    WHERE occurred_at >= ${windowStart} AND occurred_at < ${windowEnd}
    GROUP BY event_type
    ORDER BY cnt DESC
    LIMIT 10
  `);
  const topEventTypes = topResult.rows as { event_type: string; cnt: number }[];

  // Per-module usage in window
  const moduleResult = await db.execute(sql`
    SELECT
      km.name AS module_name,
      km.slug AS module_slug,
      COUNT(te.id)::int AS event_count
    FROM kernel_modules km
    LEFT JOIN telemetry_events te
      ON te.module_id = km.id
      AND te.occurred_at >= ${windowStart}
      AND te.occurred_at < ${windowEnd}
    GROUP BY km.id, km.name, km.slug
    ORDER BY event_count DESC
  `);
  const moduleUsage = moduleResult.rows as { module_name: string; module_slug: string; event_count: number }[];

  // Ritual engagement in window
  const ritualResult = await db.execute(sql`
    SELECT
      SUM(CASE WHEN event_type = 'swipe_start'    THEN 1 ELSE 0 END)::int AS starts,
      SUM(CASE WHEN event_type = 'build_complete' THEN 1 ELSE 0 END)::int AS completions
    FROM telemetry_events
    WHERE occurred_at >= ${windowStart} AND occurred_at < ${windowEnd}
  `);
  const { starts, completions } = ritualResult.rows[0] as { starts: number; completions: number };
  const ritualEngagement = starts > 0 ? Math.round((completions / starts) * 100) : 0;

  return { total, dailyCounts, topEventTypes, moduleUsage, ritualEngagement };
}

router.get("/telemetry/summary", async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const rawDays = parseInt(q.days ?? "30", 10);
  const days = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(rawDays, 365) : 30;

  const rawCompare = parseInt(q.compareDays ?? "", 10);
  const compareDays = Number.isFinite(rawCompare) && rawCompare > 0 ? Math.min(rawCompare, 365) : null;

  try {
    const primary = await buildSummary(days, 0);

    let comparison = null;
    if (compareDays !== null) {
      comparison = await buildSummary(compareDays, days);
    }

    return res.json({ ...primary, comparison });
  } catch {
    return res.status(500).json({ error: "Failed to load telemetry summary" });
  }
});

export default router;
