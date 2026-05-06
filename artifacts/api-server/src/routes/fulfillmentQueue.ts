/**
 * /api/fulfillment — Bartender + server fulfillment queue.
 *
 *   GET  /api/fulfillment/:venueId          — list queue for a venue (staff+)
 *   PATCH /api/fulfillment/:taskId/status   — update task status (staff+)
 *   GET  /api/fulfillment/admin/metrics     — fulfillment health metrics (manager+)
 *
 * Queue types:
 *   bar   — bartender makes the item (cocktail, pour, brew)
 *   floor — server delivers the item (food, cigar, vape)
 *
 * Status machine: pending → claimed → preparing → ready → delivered
 */

import { Router, type IRouter, type Response } from "express";
import { z }                                   from "zod/v4";
import { eq, and, desc, sql, count }           from "drizzle-orm";
import { db, fulfillmentQueueTable }           from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth.js";
import { requireRole }                         from "../middleware/roles.js";
import { allowOnly }                           from "../middleware/sanitize.js";
import { logAudit }                            from "../lib/audit.js";
import { logger }                              from "../lib/logger.js";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid  = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

const VALID_STATUSES = ["pending","claimed","preparing","ready","delivered","cancelled"] as const;
type TaskStatus = typeof VALID_STATUSES[number];

const TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  pending:   ["claimed", "cancelled"],
  claimed:   ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready:     ["delivered"],
  delivered: [],
  cancelled: [],
};

// ── GET /api/fulfillment/:venueId ─────────────────────────────────────────────

router.get(
  "/:venueId",
  requireAuth,
  requireRole("staff", "manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const { venueId } = req.params;
    if (!isUuid(venueId)) { res.status(400).json({ error: "invalid_venue_id" }); return; }

    if (req.user?.role !== "super_admin" && req.user?.venueId !== venueId) {
      res.status(403).json({ error: "forbidden" }); return;
    }

    const status = typeof req.query.status === "string" && VALID_STATUSES.includes(req.query.status as TaskStatus)
      ? req.query.status as TaskStatus
      : null;

    const queueType = req.query.type === "bar" ? "bar" : req.query.type === "floor" ? "floor" : null;

    const rows = await db
      .select()
      .from(fulfillmentQueueTable)
      .where(
        and(
          eq(fulfillmentQueueTable.venueId, venueId),
          status    ? eq(fulfillmentQueueTable.status,    status)    : sql`TRUE`,
          queueType ? eq(fulfillmentQueueTable.queueType, queueType) : sql`TRUE`,
        ),
      )
      .orderBy(desc(fulfillmentQueueTable.createdAt))
      .limit(100);

    res.json({ tasks: rows, count: rows.length });
  },
);

// ── PATCH /api/fulfillment/:taskId/status ─────────────────────────────────────

router.patch(
  "/:taskId/status",
  requireAuth,
  requireRole("staff", "manager", "venue_owner", "super_admin"),
  allowOnly("status"),
  async (req: AuthRequest, res: Response) => {
    const { taskId } = req.params;
    if (!isUuid(taskId)) { res.status(400).json({ error: "invalid_task_id" }); return; }

    const newStatus = req.body.status;
    if (!VALID_STATUSES.includes(newStatus)) {
      res.status(400).json({ error: "invalid_status", valid: VALID_STATUSES }); return;
    }

    const [task] = await db
      .select()
      .from(fulfillmentQueueTable)
      .where(eq(fulfillmentQueueTable.id, taskId));

    if (!task) { res.status(404).json({ error: "task_not_found" }); return; }

    if (!TRANSITIONS[task.status as TaskStatus].includes(newStatus)) {
      res.status(409).json({
        error: "invalid_transition",
        from:  task.status,
        to:    newStatus,
        allowed: TRANSITIONS[task.status as TaskStatus],
      });
      return;
    }

    // Tenant scope
    if (req.user?.role !== "super_admin" && req.user?.venueId !== task.venueId) {
      res.status(403).json({ error: "forbidden" }); return;
    }

    const now = new Date();
    const updates: Record<string, any> = { status: newStatus, updatedAt: now };
    if (newStatus === "claimed")   { updates.claimedBy = req.user?.id; updates.claimedAt  = now; }
    if (newStatus === "preparing") { updates.preparedAt = now; }
    if (newStatus === "ready")     { updates.readyAt    = now; }
    if (newStatus === "delivered") { updates.deliveredAt = now; }

    await db
      .update(fulfillmentQueueTable)
      .set(updates)
      .where(eq(fulfillmentQueueTable.id, taskId));

    await logAudit(req, {
      action:     `fulfillment.${newStatus}`,
      entityType: "fulfillment_task",
      entityId:   taskId,
      venueId:    task.venueId,
      before:     { status: task.status },
      after:      { status: newStatus },
    });

    res.json({ success: true, taskId, status: newStatus });
  },
);

// ── GET /api/fulfillment/admin/metrics ────────────────────────────────────────

router.get(
  "/admin/metrics",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user?.role === "super_admin"
      ? (typeof req.query.venueId === "string" ? req.query.venueId : null)
      : req.user?.venueId ?? null;

    try {
      const byStatus = await db
        .select({ status: fulfillmentQueueTable.status, cnt: count() })
        .from(fulfillmentQueueTable)
        .where(venueId ? eq(fulfillmentQueueTable.venueId, venueId) : sql`TRUE`)
        .groupBy(fulfillmentQueueTable.status);

      const statusMap: Record<string, number> = {};
      for (const r of byStatus) statusMap[r.status] = Number(r.cnt);

      const [avgRow] = await db
        .select({
          avgMs: sql<number>`
            avg(extract(epoch from (delivered_at - created_at)) * 1000)
          `,
        })
        .from(fulfillmentQueueTable)
        .where(
          sql`delivered_at is not null AND created_at >= now() - interval '24 hours'${venueId ? sql` AND venue_id = ${venueId}` : sql``}`,
        );

      res.json({
        byStatus:         statusMap,
        pending:          statusMap["pending"]   ?? 0,
        active:           (statusMap["claimed"] ?? 0) + (statusMap["preparing"] ?? 0),
        ready:            statusMap["ready"]     ?? 0,
        deliveredToday:   statusMap["delivered"] ?? 0,
        avgFulfillmentMs: Math.round(Number(avgRow?.avgMs ?? 0)),
      });
    } catch (err) {
      logger.error({ err }, "fulfillment metrics failed");
      res.status(500).json({ error: "metrics_failed" });
    }
  },
);

export default router;
