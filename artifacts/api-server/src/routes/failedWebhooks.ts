/**
 * /api/admin/failed-webhooks — dead-letter queue for Stripe webhook events.
 *
 *   GET  /api/admin/failed-webhooks        — list pending/exhausted failures (super_admin)
 *   POST /api/admin/failed-webhooks/:id/retry  — manually retry one event (super_admin)
 *   POST /api/admin/failed-webhooks/:id/dismiss — mark exhausted as dismissed (super_admin)
 *   GET  /api/admin/failed-webhooks/stats  — summary counts for readiness panel
 *
 * Recovery flow:
 *   1. stripeWebhook.ts catches unhandled errors → calls recordFailedWebhook()
 *   2. Retry worker (failedWebhookWorker.ts) polls every 5 min with back-off
 *   3. Admins can force-retry or dismiss from this panel
 */

import { Router, type IRouter, type Response }  from "express";
import { eq, and, desc, sql, count, lte }       from "drizzle-orm";
import { db, failedWebhooksTable }              from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth.js";
import { requireRole }                          from "../middleware/roles.js";
import { webhookAdminLimiter }                  from "../middleware/rateLimit.js";
import { logger }                               from "../lib/logger.js";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid  = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

// ── Public helper: log a failed webhook ──────────────────────────────────────

export async function recordFailedWebhook(
  stripeEventId: string,
  eventType:     string,
  payload:       string,
  errorMessage:  string,
): Promise<void> {
  try {
    await db.insert(failedWebhooksTable).values({
      stripeEventId,
      eventType,
      payload,
      errorMessage,
      status:      "pending",
      attempts:    1,
      nextRetryAt: new Date(Date.now() + 5 * 60_000), // retry in 5 min
    });
  } catch (err) {
    logger.error({ err, stripeEventId }, "Failed to record failed webhook");
  }
}

// ── GET /api/admin/failed-webhooks/stats ─────────────────────────────────────

router.get(
  "/stats",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  async (_req: AuthRequest, res: Response) => {
    try {
      const rows = await db
        .select({ status: failedWebhooksTable.status, cnt: count() })
        .from(failedWebhooksTable)
        .groupBy(failedWebhooksTable.status);

      const byStatus: Record<string, number> = {};
      for (const r of rows) byStatus[r.status] = Number(r.cnt);

      res.json({
        pending:    byStatus["pending"]   ?? 0,
        retrying:   byStatus["retrying"]  ?? 0,
        recovered:  byStatus["recovered"] ?? 0,
        exhausted:  byStatus["exhausted"] ?? 0,
        dismissed:  byStatus["dismissed"] ?? 0,
        total:      Object.values(byStatus).reduce((s, n) => s + n, 0),
      });
    } catch (err) {
      logger.error({ err }, "Failed webhook stats query failed");
      res.status(500).json({ error: "stats_failed" });
    }
  },
);

// ── GET /api/admin/failed-webhooks ───────────────────────────────────────────

router.get(
  "/",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const status = typeof req.query.status === "string" ? req.query.status : null;
    const limit  = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 100);

    try {
      const rows = await db
        .select()
        .from(failedWebhooksTable)
        .where(
          status
            ? eq(failedWebhooksTable.status, status)
            : sql`status IN ('pending','retrying','exhausted')`,
        )
        .orderBy(desc(failedWebhooksTable.createdAt))
        .limit(limit);

      res.json({ webhooks: rows, count: rows.length });
    } catch (err) {
      logger.error({ err }, "Failed webhook list query failed");
      res.status(500).json({ error: "list_failed" });
    }
  },
);

// ── POST /api/admin/failed-webhooks/:id/retry ─────────────────────────────────

router.post(
  "/:id/retry",
  requireAuth,
  requireRole("super_admin"),
  webhookAdminLimiter,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    if (!isUuid(id)) { res.status(400).json({ error: "invalid_id" }); return; }

    const [row] = await db
      .select()
      .from(failedWebhooksTable)
      .where(eq(failedWebhooksTable.id, id));

    if (!row) { res.status(404).json({ error: "not_found" }); return; }
    if (row.status === "recovered") {
      res.status(409).json({ error: "already_recovered" }); return;
    }

    // Mark as retrying and schedule immediate next attempt
    await db
      .update(failedWebhooksTable)
      .set({
        status:      "retrying",
        nextRetryAt: new Date(),
        attempts:    row.attempts + 1,
        updatedAt:   new Date(),
      })
      .where(eq(failedWebhooksTable.id, id));

    logger.info({ id, eventType: row.eventType, attempts: row.attempts + 1 }, "Manual webhook retry scheduled");
    res.json({ success: true, id, status: "retrying", attempts: row.attempts + 1 });
  },
);

// ── POST /api/admin/failed-webhooks/:id/dismiss ───────────────────────────────

router.post(
  "/:id/dismiss",
  requireAuth,
  requireRole("super_admin"),
  webhookAdminLimiter,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    if (!isUuid(id)) { res.status(400).json({ error: "invalid_id" }); return; }

    const [row] = await db
      .select({ id: failedWebhooksTable.id, status: failedWebhooksTable.status })
      .from(failedWebhooksTable)
      .where(eq(failedWebhooksTable.id, id));

    if (!row) { res.status(404).json({ error: "not_found" }); return; }

    await db
      .update(failedWebhooksTable)
      .set({ status: "dismissed", resolvedAt: new Date(), updatedAt: new Date() })
      .where(eq(failedWebhooksTable.id, id));

    res.json({ success: true, id, status: "dismissed" });
  },
);

export default router;
