/**
 * GET /api/system/status — operator health endpoint.
 *
 * Surfaces the operational signals an on-call needs to spot money-losing
 * states fast: stuck orders, paid-but-not-fulfilled, open fraud flags,
 * pending payouts, and unreversed refund candidates. Read-only, super_admin
 * only — never expose tenant-specific data here.
 */

import { Router, type IRouter, type Response } from "express";
import { sql, and, lt, eq } from "drizzle-orm";
import {
  db, ordersTable, commissionsTable, fraudFlagsTable,
  payoutRequestsTable, dunningEventsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router: IRouter = Router();

const STUCK_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

router.get(
  "/status",
  requireAuth,
  requireRole("super_admin"),
  async (_req: AuthRequest, res: Response) => {
    const stuckCutoff = new Date(Date.now() - STUCK_THRESHOLD_MS);

    const [
      ordersByStatus,
      stuckPending,
      paidUnfulfilled,
      openFraud,
      pendingCommissions,
      pendingPayouts,
      recentDunningFailures,
    ] = await Promise.all([
      db.select({
        status: ordersTable.status,
        count:  sql<number>`count(*)::int`,
      }).from(ordersTable).groupBy(ordersTable.status),

      db.select({ count: sql<number>`count(*)::int` })
        .from(ordersTable)
        .where(and(eq(ordersTable.status, "pending"), lt(ordersTable.createdAt, stuckCutoff))),

      db.select({ count: sql<number>`count(*)::int` })
        .from(ordersTable)
        .where(and(eq(ordersTable.status, "paid"), lt(ordersTable.updatedAt, stuckCutoff))),

      db.select({ count: sql<number>`count(*)::int` })
        .from(fraudFlagsTable)
        .where(eq(fraudFlagsTable.resolved, "open")),

      db.select({
        count: sql<number>`count(*)::int`,
        cents: sql<number>`coalesce(sum(${commissionsTable.amountCents}), 0)::int`,
      }).from(commissionsTable).where(eq(commissionsTable.status, "pending")),

      db.select({ count: sql<number>`count(*)::int` })
        .from(payoutRequestsTable)
        .where(eq(payoutRequestsTable.status, "pending")),

      db.select({ count: sql<number>`count(*)::int` })
        .from(dunningEventsTable)
        .where(eq(dunningEventsTable.type, "failed")),
    ]);

    res.json({
      ok: openFraud[0]!.count === 0 && stuckPending[0]!.count === 0,
      generatedAt: new Date().toISOString(),
      orders: {
        byStatus:        Object.fromEntries(ordersByStatus.map(r => [r.status, r.count])),
        stuckPending:    stuckPending[0]!.count,
        paidUnfulfilled: paidUnfulfilled[0]!.count,
      },
      fraud: {
        open: openFraud[0]!.count,
      },
      commissions: {
        pendingCount:      pendingCommissions[0]!.count,
        pendingTotalCents: pendingCommissions[0]!.cents,
      },
      payouts: {
        pending: pendingPayouts[0]!.count,
      },
      dunning: {
        recentFailures: recentDunningFailures[0]!.count,
      },
    });
  },
);

export default router;
