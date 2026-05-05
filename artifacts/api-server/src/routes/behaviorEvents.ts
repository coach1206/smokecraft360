/**
 * /api/events/behavior — privacy-safe behavioral event logging + analytics.
 *
 *   POST /api/events/behavior              log an event (fire-and-forget, no auth required)
 *   GET  /api/analytics/top-products       top purchased products        [ADVANCED_ANALYTICS]
 *   GET  /api/analytics/trends             daily event trends            [ADVANCED_ANALYTICS]
 *   GET  /api/analytics/revenue            revenue summary               [ANALYTICS]
 *   GET  /api/analytics/behavior           session + conversion funnel   [ADVANCED_ANALYTICS]
 *
 * All GET routes are venue-scoped (super_admin sees any venueId query param).
 */

import { Router, type Request, type Response } from "express";
import { logger }                              from "../lib/logger";
import { sql }                                  from "drizzle-orm";
import { z }                                   from "zod/v4";
import { db, behaviorEventLogsTable } from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireFeature }                      from "../middleware/requireFeature";

const router = Router();

const VALID_EVENT_TYPES = new Set([
  "SESSION_START", "SESSION_END", "QUESTION_ANSWERED",
  "PRODUCT_VIEWED", "PRODUCT_SELECTED", "PRODUCT_PURCHASED",
  "UPSELL_ACCEPTED", "LOYALTY_USED",
]);

const logSchema = z.object({
  venueId:   z.string().min(1),
  sessionId: z.string().min(1),
  eventType: z.string().refine(v => VALID_EVENT_TYPES.has(v), { message: "Unknown event type" }),
  productId: z.string().optional(),
  category:  z.string().optional(),
  metadata:  z.record(z.string(), z.unknown()).optional(),
});

// ── POST /api/events/behavior ───────────────────────────────────────────────

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const parse = logSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid event payload" });
    return;
  }
  const { venueId, sessionId, eventType, productId, category, metadata } = parse.data;
  try {
    await db.insert(behaviorEventLogsTable).values({
      venueId, sessionId, eventType,
      productId: productId ?? null,
      category:  category ?? null,
      metadata:  metadata ?? {},
    });
    res.status(202).json({ ok: true });
  } catch (err) {
    logger.error({ err }, "behavior event log failed");
    res.status(500).json({ error: "Failed to log event" });
  }
});

// ── Helper: resolve venueId from request ────────────────────────────────────

function getVenueId(req: AuthRequest): string | null {
  if (req.user?.role === "super_admin" && typeof req.query["venueId"] === "string") {
    return req.query["venueId"];
  }
  return req.user?.venueId ?? (typeof req.query["venueId"] === "string" ? req.query["venueId"] : null);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ── GET /api/analytics/top-products ────────────────────────────────────────

router.get(
  "/top-products",
  requireAuth,
  requireFeature("ADVANCED_ANALYTICS"),
  async (req: AuthRequest, res: Response) => {
    const venueId = getVenueId(req);
    if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
    try {
      const rows = await db.execute(sql`
        SELECT product_id, COUNT(*)::int AS total
        FROM behavior_event_logs
        WHERE venue_id = ${venueId}
          AND event_type = 'PRODUCT_PURCHASED'
          AND product_id IS NOT NULL
          AND created_at >= ${daysAgo(30)}
        GROUP BY product_id
        ORDER BY total DESC
        LIMIT 10
      `);
      res.json({ topProducts: rows.rows, period: "last_30_days" });
    } catch (err) {
      req.log.error({ err }, "top-products failed");
      res.status(500).json({ error: "Failed to query top products" });
    }
  },
);

// ── GET /api/analytics/trends ───────────────────────────────────────────────

router.get(
  "/trends",
  requireAuth,
  requireFeature("ADVANCED_ANALYTICS"),
  async (req: AuthRequest, res: Response) => {
    const venueId = getVenueId(req);
    if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
    try {
      const rows = await db.execute(sql`
        SELECT
          DATE_TRUNC('day', created_at)::date AS day,
          event_type,
          COUNT(*)::int AS count
        FROM behavior_event_logs
        WHERE venue_id = ${venueId}
          AND created_at >= ${daysAgo(30)}
        GROUP BY day, event_type
        ORDER BY day ASC
      `);
      res.json({ trends: rows.rows, period: "last_30_days" });
    } catch (err) {
      req.log.error({ err }, "trends failed");
      res.status(500).json({ error: "Failed to query trends" });
    }
  },
);

// ── GET /api/analytics/revenue ─────────────────────────────────────────────

router.get(
  "/revenue",
  requireAuth,
  requireFeature("ANALYTICS"),
  async (req: AuthRequest, res: Response) => {
    const venueId = getVenueId(req);
    if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
    try {
      const rows = await db.execute(sql`
        SELECT
          DATE_TRUNC('day', created_at)::date AS day,
          COUNT(*)::int                       AS orders,
          COALESCE(SUM(expected_amount_cents), 0)::int  AS revenue_cents
        FROM orders
        WHERE venue_id = ${venueId}
          AND created_at >= ${daysAgo(30)}
          AND status NOT IN ('cancelled', 'refunded')
        GROUP BY day
        ORDER BY day ASC
      `);
      res.json({ revenue: rows.rows, period: "last_30_days" });
    } catch (err) {
      req.log.error({ err }, "revenue analytics failed");
      res.status(500).json({ error: "Failed to query revenue" });
    }
  },
);

// ── GET /api/analytics/behavior ────────────────────────────────────────────

router.get(
  "/behavior",
  requireAuth,
  requireFeature("ADVANCED_ANALYTICS"),
  async (req: AuthRequest, res: Response) => {
    const venueId = getVenueId(req);
    if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
    try {
      const [sessionCount, eventCounts, funnelRows] = await Promise.all([
        // Total sessions
        db.execute(sql`
          SELECT COUNT(DISTINCT session_id)::int AS sessions
          FROM behavior_event_logs
          WHERE venue_id = ${venueId} AND created_at >= ${daysAgo(30)}
        `),
        // Event type breakdown
        db.execute(sql`
          SELECT event_type, COUNT(*)::int AS count
          FROM behavior_event_logs
          WHERE venue_id = ${venueId} AND created_at >= ${daysAgo(30)}
          GROUP BY event_type ORDER BY count DESC
        `),
        // Conversion funnel: viewed → selected → purchased
        db.execute(sql`
          SELECT
            COUNT(*) FILTER (WHERE event_type = 'PRODUCT_VIEWED')::int    AS viewed,
            COUNT(*) FILTER (WHERE event_type = 'PRODUCT_SELECTED')::int  AS selected,
            COUNT(*) FILTER (WHERE event_type = 'PRODUCT_PURCHASED')::int AS purchased
          FROM behavior_event_logs
          WHERE venue_id = ${venueId} AND created_at >= ${daysAgo(30)}
        `),
      ]);

      const funnel = funnelRows.rows[0] as Record<string, number> | undefined;
      const viewed    = funnel?.viewed    ?? 0;
      const selected  = funnel?.selected  ?? 0;
      const purchased = funnel?.purchased ?? 0;

      res.json({
        sessions:    (sessionCount.rows[0] as Record<string, number>)?.sessions ?? 0,
        eventCounts: eventCounts.rows,
        funnel: {
          viewed,
          selected,
          purchased,
          viewToSelect:    viewed    > 0 ? Math.round((selected  / viewed)    * 100) : 0,
          selectToPurchase: selected > 0 ? Math.round((purchased / selected)  * 100) : 0,
        },
        period: "last_30_days",
      });
    } catch (err) {
      req.log.error({ err }, "behavior analytics failed");
      res.status(500).json({ error: "Failed to query behavior analytics" });
    }
  },
);

export default router;
