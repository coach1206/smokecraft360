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
import { eq, desc, sql, count, and, ne } from "drizzle-orm";

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

const EditModuleSchema = z.object({
  name:        z.string().min(1).max(120).optional(),
  craftType:   z.enum(["smoke", "pour", "brew", "vape", "none"]).optional(),
  slug:        z.string().min(1).max(80).optional(),
  status:      z.enum(["active", "inactive", "suspended"]).optional(),
  description: z.string().optional(),
  launchUrl:   z.string().optional(),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── GET /api/kernel/modules ────────────────────────────────────────────────────
// Optional query params:
//   ?slug=<value>       — returns { available: boolean } only
//   ?excludeId=<uuid>   — when combined with ?slug, ignore a match with this ID
//                         (used by the Edit modal so a module's own slug isn't
//                          flagged as a conflict)

router.get("/modules", async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const { slug, excludeId } = q;

  if (slug !== undefined) {
    // Slug availability check — no auth required
    if (excludeId !== undefined && !UUID_RE.test(excludeId)) {
      return res.status(400).json({ error: "excludeId must be a valid UUID" });
    }
    try {
      const whereClause = excludeId
        ? and(eq(kernelModulesTable.slug, slug.trim()), ne(kernelModulesTable.id, excludeId))
        : eq(kernelModulesTable.slug, slug.trim());

      const rows = await db
        .select({ id: kernelModulesTable.id })
        .from(kernelModulesTable)
        .where(whereClause)
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

// ── PATCH /api/kernel/modules/:id ─────────────────────────────────────────────
// Update an existing module (admin/super_admin only).

router.patch("/modules/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const role = (req as AuthRequest).user?.role;
  if (role !== "admin" && role !== "super_admin") {
    return res.status(403).json({ error: "admin or super_admin only" });
  }

  const { id } = req.params as { id: string };
  if (!UUID_RE.test(id)) return res.status(400).json({ error: "id must be a valid UUID" });

  const parsed = EditModuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    const [mod] = await db
      .update(kernelModulesTable)
      .set(parsed.data)
      .where(eq(kernelModulesTable.id, id))
      .returning();

    if (!mod) return res.status(404).json({ error: "Module not found" });
    return res.json({ module: mod });
  } catch (err: unknown) {
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
// super_admin: can update any venue.
// venue_owner: can only update the venue they own (req.user.venueId must match).

router.patch("/mode/:venueId", requireAuth, async (req: AuthRequest, res: Response) => {
  const { role, venueId: userVenueId } = (req as AuthRequest).user ?? {};
  if (role !== "super_admin" && role !== "venue_owner") {
    return res.status(403).json({ error: "super_admin or venue_owner only" });
  }

  const { venueId } = req.params as { venueId: string };
  if (!UUID_RE.test(venueId)) return res.status(400).json({ error: "venueId must be a valid UUID" });

  // Venue-scoped guard: venue_owner may only update their own venue.
  if (role === "venue_owner" && userVenueId !== venueId) {
    return res.status(403).json({ error: "venue_owner may only update their own venue" });
  }
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

// ── GET /api/kernel/telemetry/products ────────────────────────────────────────
// Aggregates swipe_add / swipe_skip counts by cardId + title from the payload.
// Query params:
//   ?moduleId=<uuid>              — filter to a specific module (optional)
//   ?window=24h|7d|30d|90d        — shorthand time window (default: 30d)
//   ?days=N                       — explicit day count (overrides window, max 365)
//   ?craftType=smoke|pour|brew|vape — filter by payload craftType (optional)

const CRAFT_TYPES = ["smoke", "pour", "brew", "vape"] as const;
type CraftType = typeof CRAFT_TYPES[number];

router.get("/telemetry/products", async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;

  // Resolve window in days
  let days = 30;
  if (q.days !== undefined) {
    const d = parseInt(q.days, 10);
    if (Number.isFinite(d) && d > 0) days = Math.min(d, 365);
  } else if (q.window !== undefined) {
    const w = q.window.trim().toLowerCase();
    if (w === "24h" || w === "1d") {
      days = 1;
    } else {
      const m = /^(\d+)d$/.exec(w);
      if (m) days = Math.min(parseInt(m[1]!, 10), 365);
    }
  }

  const moduleId = q.moduleId;
  if (moduleId !== undefined && !UUID_RE.test(moduleId)) {
    return res.status(400).json({ error: "moduleId must be a valid UUID" });
  }

  const rawCraftType = q.craftType?.trim().toLowerCase();
  if (rawCraftType !== undefined && !(CRAFT_TYPES as readonly string[]).includes(rawCraftType)) {
    return res.status(400).json({ error: "craftType must be one of: smoke, pour, brew, vape" });
  }
  const craftType: CraftType | null = rawCraftType ? (rawCraftType as CraftType) : null;

  try {
    const windowStart = sql`NOW() - (${days} || ' days')::interval`;

    type ProductRow = { card_id: string; title: string | null; craft_type: string | null; adds: number; skips: number; total: number };

    const craftFilter = craftType
      ? sql`AND payload->>'craftType' = ${craftType}`
      : sql``;

    let rows: ProductRow[];

    if (moduleId) {
      const result = await db.execute(sql`
        SELECT
          payload->>'cardId'    AS card_id,
          payload->>'title'     AS title,
          payload->>'craftType' AS craft_type,
          SUM(CASE WHEN event_type = 'swipe_add'  THEN 1 ELSE 0 END)::int AS adds,
          SUM(CASE WHEN event_type = 'swipe_skip' THEN 1 ELSE 0 END)::int AS skips,
          COUNT(*)::int AS total
        FROM telemetry_events
        WHERE event_type IN ('swipe_add', 'swipe_skip')
          AND occurred_at >= ${windowStart}
          AND module_id = ${moduleId}::uuid
          AND payload->>'cardId' IS NOT NULL
          ${craftFilter}
        GROUP BY payload->>'cardId', payload->>'title', payload->>'craftType'
        ORDER BY total DESC
        LIMIT 50
      `);
      rows = result.rows as ProductRow[];
    } else {
      const result = await db.execute(sql`
        SELECT
          payload->>'cardId'    AS card_id,
          payload->>'title'     AS title,
          payload->>'craftType' AS craft_type,
          SUM(CASE WHEN event_type = 'swipe_add'  THEN 1 ELSE 0 END)::int AS adds,
          SUM(CASE WHEN event_type = 'swipe_skip' THEN 1 ELSE 0 END)::int AS skips,
          COUNT(*)::int AS total
        FROM telemetry_events
        WHERE event_type IN ('swipe_add', 'swipe_skip')
          AND occurred_at >= ${windowStart}
          AND payload->>'cardId' IS NOT NULL
          ${craftFilter}
        GROUP BY payload->>'cardId', payload->>'title', payload->>'craftType'
        ORDER BY total DESC
        LIMIT 50
      `);
      rows = result.rows as ProductRow[];
    }

    return res.json({ products: rows, days, moduleId: moduleId ?? null, craftType: craftType ?? null });
  } catch {
    return res.status(500).json({ error: "Failed to load product telemetry" });
  }
});

export default router;
