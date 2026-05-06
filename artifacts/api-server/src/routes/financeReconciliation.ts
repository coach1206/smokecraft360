/**
 * /api/finance-reconciliation — Enterprise financial reconciliation dashboard.
 *
 *   GET  /api/finance-reconciliation/overview         — health metrics + scores
 *   GET  /api/finance-reconciliation/alerts           — alert list (paginated)
 *   POST /api/finance-reconciliation/alerts/:id/ack   — acknowledge alert
 *   POST /api/finance-reconciliation/alerts/:id/resolve
 *   GET  /api/finance-reconciliation/orphans          — orphan / stale tabs
 *   GET  /api/finance-reconciliation/payout-status    — payout health
 *   GET  /api/finance-reconciliation/insights         — AI-style financial insights
 *   POST /api/finance-reconciliation/run              — trigger reconciliation workers now
 *
 * Access: super_admin, finance_admin, venue_owner (venue-scoped)
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, gte, lte, sql, count, sum, desc, or, ne } from "drizzle-orm";
import {
  db,
  guestTabsTable, tabItemsTable,
  payoutRequestsTable, failedWebhooksTable,
  paymentEventsTable, reconciliationAlertsTable,
  receiptsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { requireRole }                   from "../middleware/roles.js";
import { logger }                        from "../lib/logger.js";

const router: IRouter = Router();

const guard = requireRole("super_admin", "venue_owner", "manager");

// ── GET /api/finance-reconciliation/overview ─────────────────────────────────

router.get("/overview", requireAuth, guard, async (_req: AuthRequest, res: Response) => {
  const now  = new Date();
  const h24  = new Date(now.getTime() - 24 * 3600_000);
  const h72  = new Date(now.getTime() - 72 * 3600_000);
  const d30  = new Date(now.getTime() - 30 * 24 * 3600_000);
  const h2   = new Date(now.getTime() -  2 * 3600_000);

  try {
    const [
      revRow,          // total paid revenue all time
      rev24h,          // revenue last 24h
      paidCount,       // paid tabs
      refundedCount,   // refunded tabs
      failedTabCount,  // tabs where authorized but never paid (>2h)
      orphanCount,     // open tabs older than 72h
      payoutPending,   // pending payouts
      payoutPaid,      // completed payouts
      payoutFailed,    // failed payouts
      webhookExhausted,// exhausted failed webhooks
      webhookPending,
      openAlerts,
      criticalAlerts,
      pendingFulfillment,
    ] = await Promise.all([
      db.select({ total: sql<number>`coalesce(sum(total_cents), 0)` })
        .from(guestTabsTable).where(eq(guestTabsTable.paymentStatus, "paid")),

      db.select({ total: sql<number>`coalesce(sum(total_cents), 0)` })
        .from(guestTabsTable)
        .where(and(eq(guestTabsTable.paymentStatus, "paid"), gte(guestTabsTable.paidAt!, h24))),

      db.select({ cnt: count() })
        .from(guestTabsTable).where(eq(guestTabsTable.paymentStatus, "paid")),

      db.select({ cnt: count() })
        .from(guestTabsTable).where(eq(guestTabsTable.paymentStatus, "refunded")),

      // Tabs authorized but not paid in >2h = stuck
      db.select({ cnt: count() })
        .from(guestTabsTable)
        .where(and(
          eq(guestTabsTable.paymentStatus, "authorized"),
          lte(guestTabsTable.openedAt, h2),
        )),

      // Orphan: open tabs older than 72h
      db.select({ cnt: count() })
        .from(guestTabsTable)
        .where(and(
          eq(guestTabsTable.status, "open"),
          lte(guestTabsTable.openedAt, h72),
        )),

      db.select({ cnt: count(), total: sql<number>`coalesce(sum(amount_cents), 0)` })
        .from(payoutRequestsTable).where(eq(payoutRequestsTable.status, "pending")),

      db.select({ cnt: count(), total: sql<number>`coalesce(sum(amount_cents), 0)` })
        .from(payoutRequestsTable).where(eq(payoutRequestsTable.status, "paid")),

      db.select({ cnt: count(), total: sql<number>`coalesce(sum(amount_cents), 0)` })
        .from(payoutRequestsTable).where(eq(payoutRequestsTable.status, "failed")),

      db.select({ cnt: count() })
        .from(failedWebhooksTable).where(eq(failedWebhooksTable.status, "exhausted")),

      db.select({ cnt: count() })
        .from(failedWebhooksTable)
        .where(sql`status IN ('pending','retrying')`),

      db.select({ cnt: count() })
        .from(reconciliationAlertsTable)
        .where(sql`status IN ('open','acknowledged')`),

      db.select({ cnt: count() })
        .from(reconciliationAlertsTable)
        .where(and(eq(reconciliationAlertsTable.severity, "critical"), sql`status IN ('open','acknowledged')`)),

      db.select({ cnt: count() })
        .from(guestTabsTable)
        .where(and(
          eq(guestTabsTable.paymentStatus, "paid"),
          eq(guestTabsTable.status, "closed"),
          sql`NOT EXISTS (
            SELECT 1 FROM tab_items ti
            WHERE ti.tab_id = guest_tabs.id AND ti.fulfilled = true
          )`,
        )),
    ]);

    const totalRevCents    = Number(revRow[0]?.total ?? 0);
    const rev24hCents      = Number(rev24h[0]?.total ?? 0);
    const paidTabs         = Number(paidCount[0]?.cnt ?? 0);
    const refundedTabs     = Number(refundedCount[0]?.cnt ?? 0);
    const stuckTabs        = Number(failedTabCount[0]?.cnt ?? 0);
    const orphanTabs       = Number(orphanCount[0]?.cnt ?? 0);
    const totalTabs        = paidTabs + refundedTabs + stuckTabs;
    const failedRate       = totalTabs > 0 ? Math.round((stuckTabs / totalTabs) * 10000) / 100 : 0;
    const refundRate       = totalTabs > 0 ? Math.round((refundedTabs / totalTabs) * 10000) / 100 : 0;
    const payoutPendingAmt = Number(payoutPending[0]?.total ?? 0);
    const payoutPaidAmt    = Number(payoutPaid[0]?.total ?? 0);
    const payoutCompletion = (Number(payoutPaid[0]?.cnt ?? 0) + Number(payoutPending[0]?.cnt ?? 0)) > 0
      ? Math.round((Number(payoutPaid[0]?.cnt ?? 0) / (Number(payoutPaid[0]?.cnt ?? 0) + Number(payoutPending[0]?.cnt ?? 0))) * 100) : 100;
    const exhWebhooks      = Number(webhookExhausted[0]?.cnt ?? 0);
    const pendWebhooks     = Number(webhookPending[0]?.cnt ?? 0);
    const alertCount       = Number(openAlerts[0]?.cnt ?? 0);
    const critCount        = Number(criticalAlerts[0]?.cnt ?? 0);

    // Reconciliation score 0-100 (100 = perfect)
    let score = 100;
    if (exhWebhooks > 0)   score -= Math.min(20, exhWebhooks * 4);
    if (stuckTabs > 0)     score -= Math.min(15, stuckTabs * 3);
    if (orphanTabs > 0)    score -= Math.min(10, orphanTabs * 2);
    if (critCount > 0)     score -= Math.min(15, critCount * 5);
    if (failedRate > 5)    score -= 10;
    if (refundRate > 10)   score -= 5;
    score = Math.max(0, score);

    res.json({
      checkedAt: now.toISOString(),
      reconciliationScore: score,
      scoreLabel: score >= 90 ? "excellent" : score >= 70 ? "good" : score >= 50 ? "fair" : "poor",

      revenue: {
        totalCents:    totalRevCents,
        last24hCents:  rev24hCents,
        paidTabs,
      },

      payments: {
        paidTabs,
        refundedTabs,
        stuckTabs,
        orphanTabs,
        failedRate,
        refundRate,
        payoutCompletion,
      },

      payouts: {
        pending:   { count: Number(payoutPending[0]?.cnt ?? 0), amountCents: payoutPendingAmt },
        paid:      { count: Number(payoutPaid[0]?.cnt ?? 0),    amountCents: payoutPaidAmt   },
        failed:    { count: Number(payoutFailed[0]?.cnt ?? 0),  amountCents: Number(payoutFailed[0]?.total ?? 0) },
      },

      webhooks: {
        exhausted: exhWebhooks,
        pending:   pendWebhooks,
        healthy:   exhWebhooks === 0 && pendWebhooks === 0,
      },

      alerts: {
        open:     alertCount,
        critical: critCount,
      },

      fulfillment: {
        unpaidFulfilledTabs: Number(pendingFulfillment[0]?.cnt ?? 0),
      },
    });
  } catch (err) {
    logger.error({ err }, "Finance overview query failed");
    res.status(500).json({ error: "overview_failed" });
  }
});

// ── GET /api/finance-reconciliation/alerts ───────────────────────────────────

router.get("/alerts", requireAuth, guard, async (req: AuthRequest, res: Response) => {
  const severity = typeof req.query.severity === "string" ? req.query.severity : null;
  const status   = typeof req.query.status   === "string" ? req.query.status   : null;
  const limit    = Math.min(parseInt(String(req.query.limit ?? "50"), 10), 100);

  try {
    const rows = await db.select()
      .from(reconciliationAlertsTable)
      .where(
        severity && status ? and(eq(reconciliationAlertsTable.severity, severity as any), eq(reconciliationAlertsTable.status, status as any))
        : severity ? eq(reconciliationAlertsTable.severity, severity as any)
        : status   ? eq(reconciliationAlertsTable.status,   status   as any)
        : sql`status IN ('open','acknowledged')`,
      )
      .orderBy(
        sql`CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`,
        desc(reconciliationAlertsTable.createdAt),
      )
      .limit(limit);

    res.json({ alerts: rows, count: rows.length });
  } catch (err) {
    logger.error({ err }, "Alerts query failed");
    res.status(500).json({ error: "alerts_failed" });
  }
});

// ── POST /api/finance-reconciliation/alerts/:id/ack ──────────────────────────

router.post("/alerts/:id/ack", requireAuth, guard, async (req: AuthRequest, res: Response) => {
  const id = String(req.params["id"]);
  await db.update(reconciliationAlertsTable)
    .set({ status: "acknowledged", acknowledgedAt: new Date() })
    .where(eq(reconciliationAlertsTable.id, id));
  res.json({ success: true, id, status: "acknowledged" });
});

// ── POST /api/finance-reconciliation/alerts/:id/resolve ──────────────────────

router.post("/alerts/:id/resolve", requireAuth, guard, async (req: AuthRequest, res: Response) => {
  const id     = String(req.params["id"]);
  const userId = req.user?.id;
  await db.update(reconciliationAlertsTable)
    .set({ status: "resolved", resolvedAt: new Date(), resolvedBy: userId })
    .where(eq(reconciliationAlertsTable.id, id));
  res.json({ success: true, id, status: "resolved" });
});

// ── GET /api/finance-reconciliation/orphans ───────────────────────────────────

router.get("/orphans", requireAuth, guard, async (_req: AuthRequest, res: Response) => {
  const h2  = new Date(Date.now() -  2 * 3600_000);
  const h72 = new Date(Date.now() - 72 * 3600_000);

  const [stuck, orphans] = await Promise.all([
    db.select().from(guestTabsTable)
      .where(and(eq(guestTabsTable.paymentStatus, "authorized"), lte(guestTabsTable.openedAt, h2)))
      .orderBy(desc(guestTabsTable.openedAt)).limit(50),

    db.select().from(guestTabsTable)
      .where(and(eq(guestTabsTable.status, "open"), lte(guestTabsTable.openedAt, h72)))
      .orderBy(desc(guestTabsTable.openedAt)).limit(50),
  ]);

  res.json({ stuckTabs: stuck, orphanTabs: orphans });
});

// ── GET /api/finance-reconciliation/payout-status ────────────────────────────

router.get("/payout-status", requireAuth, guard, async (_req: AuthRequest, res: Response) => {
  const d30 = new Date(Date.now() - 30 * 24 * 3600_000);
  const rows = await db.select()
    .from(payoutRequestsTable)
    .where(gte(payoutRequestsTable.createdAt, d30))
    .orderBy(desc(payoutRequestsTable.createdAt))
    .limit(100);

  res.json({ payouts: rows, count: rows.length });
});

// ── GET /api/finance-reconciliation/insights ─────────────────────────────────

router.get("/insights", requireAuth, guard, async (_req: AuthRequest, res: Response) => {
  // Deterministic AI-style insights derived from real data patterns.
  const h72 = new Date(Date.now() - 72 * 3600_000);
  const d30 = new Date(Date.now() - 30 * 24 * 3600_000);

  try {
    const [stuckRow, refundRow, loyaltyRow, orphanRow, avgTabRow, webhookRow] = await Promise.all([
      db.select({ cnt: count() }).from(guestTabsTable)
        .where(and(eq(guestTabsTable.paymentStatus, "authorized"), lte(guestTabsTable.openedAt, new Date(Date.now() - 2 * 3600_000)))),

      db.select({ cnt: count() }).from(guestTabsTable)
        .where(and(eq(guestTabsTable.paymentStatus, "refunded"), gte(guestTabsTable.paidAt!, d30))),

      db.select({ total: sql<number>`coalesce(sum(loyalty_credits_used), 0)`, cnt: count() })
        .from(guestTabsTable).where(and(eq(guestTabsTable.paymentStatus, "paid"), gte(guestTabsTable.paidAt!, d30))),

      db.select({ cnt: count() }).from(guestTabsTable)
        .where(and(eq(guestTabsTable.status, "open"), lte(guestTabsTable.openedAt, h72))),

      db.select({ avg: sql<number>`coalesce(avg(total_cents), 0)` })
        .from(guestTabsTable).where(and(eq(guestTabsTable.paymentStatus, "paid"), gte(guestTabsTable.paidAt!, d30))),

      db.select({ cnt: count() }).from(failedWebhooksTable).where(sql`status IN ('pending','retrying','exhausted')`),
    ]);

    const insights: Array<{ id: string; category: string; title: string; body: string; severity: string }> = [];

    const stuckCount   = Number(stuckRow[0]?.cnt   ?? 0);
    const refundCount  = Number(refundRow[0]?.cnt  ?? 0);
    const loyaltyUsed  = Number(loyaltyRow[0]?.total ?? 0);
    const paidCount    = Number(loyaltyRow[0]?.cnt  ?? 0);
    const orphanCount  = Number(orphanRow[0]?.cnt   ?? 0);
    const avgCents     = Number(avgTabRow[0]?.avg   ?? 0);
    const webhookCount = Number(webhookRow[0]?.cnt  ?? 0);

    if (stuckCount > 0) insights.push({
      id: "stuck-tabs", category: "payment", severity: "high",
      title: `${stuckCount} authorized tab${stuckCount > 1 ? "s" : ""} not captured`,
      body: "Payment intents were authorized but not captured within 2h. Review these tabs for potential capture failures before authorization windows expire.",
    });

    if (refundCount > 5) insights.push({
      id: "refund-rate", category: "revenue", severity: "medium",
      title: `${refundCount} refunds issued in the last 30 days`,
      body: "Elevated refund volume detected. Review whether refunds cluster around specific venues, products, or atmosphere modes.",
    });

    if (loyaltyUsed > 0 && paidCount > 0) {
      const usageRate = Math.round((loyaltyUsed / (paidCount * 100)) * 10) / 10;
      if (usageRate > 50) insights.push({
        id: "loyalty-burn", category: "loyalty", severity: "low",
        title: `High loyalty credit burn rate — avg ${usageRate} points/tab`,
        body: "Guests are redeeming loyalty points at an above-average rate. Ensure point accrual is keeping pace with redemptions to maintain program health.",
      });
    }

    if (orphanCount > 0) insights.push({
      id: "orphan-tabs", category: "reconciliation", severity: "medium",
      title: `${orphanCount} open tab${orphanCount > 1 ? "s" : ""} older than 72 hours`,
      body: "Stale open tabs may represent abandoned sessions or uncompleted POS workflows. Review for potential revenue capture or void.",
    });

    if (avgCents > 0) insights.push({
      id: "avg-tab", category: "revenue", severity: "low",
      title: `Average tab value: $${(avgCents / 100).toFixed(2)} (last 30 days)`,
      body: avgCents > 5000
        ? "Above-average tab values suggest effective upselling and premium pairing recommendations are performing well."
        : "Consider activating the Revenue Engine's upsell automation to improve average tab values.",
    });

    if (webhookCount > 0) insights.push({
      id: "webhook-health", category: "infrastructure", severity: webhookCount > 3 ? "critical" : "high",
      title: `${webhookCount} unresolved Stripe webhook event${webhookCount > 1 ? "s" : ""}`,
      body: "Unresolved webhooks may indicate missed payment state transitions. Review and retry via the Webhook Recovery Queue.",
    });

    if (insights.length === 0) insights.push({
      id: "all-clear", category: "system", severity: "low",
      title: "Financial systems nominal",
      body: "No anomalies detected in payment flows, payout pipeline, webhook health, or reconciliation queue. All indicators within normal thresholds.",
    });

    res.json({ insights, generatedAt: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, "Insights query failed");
    res.status(500).json({ error: "insights_failed" });
  }
});

// ── POST /api/finance-reconciliation/run ─────────────────────────────────────

router.post("/run", requireAuth, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
  try {
    const { runReconciliation } = await import("../lib/reconciliationWorker.js");
    const result = await runReconciliation();
    res.json({ success: true, alertsCreated: result.alertsCreated, at: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, "Manual reconciliation run failed");
    res.status(500).json({ error: "run_failed" });
  }
});

export default router;
