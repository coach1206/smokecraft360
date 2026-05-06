/**
 * /api/admin/launch-readiness — Pre-Launch Readiness Panel backend.
 *
 * Returns a live snapshot of all critical system dimensions for the
 * FINAL ADMIN CONTROL CENTER. Read-only; no mutations.
 *
 * Dimensions:
 *   payment_health   — stripe webhooks, failed webhooks, tab/payment integrity
 *   security         — feature flag kill switches, audit activity
 *   devices          — online %, stale heartbeats
 *   deployment       — OTA channel status
 *   operations       — open tickets, fulfillment queue health
 *   risk_score       — 0–100 operational risk (lower = safer to launch)
 */

import { Router, type IRouter, type Response } from "express";
import { eq, sql, count, gte, and, isNull, lte } from "drizzle-orm";
import {
  db,
  failedWebhooksTable,
  guestTabsTable,
  fulfillmentQueueTable,
  venuesTable,
  auditLogTable,
  featureFlagsTable,
  devicesTable,
  supportTicketsTable,
  stripeEventsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { requireRole }                   from "../middleware/roles.js";
import { logger }                        from "../lib/logger.js";

const router: IRouter = Router();

// ── GET /api/admin/launch-readiness ──────────────────────────────────────────

router.get(
  "/",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  async (_req: AuthRequest, res: Response) => {
    const now = new Date();
    const h24  = new Date(now.getTime() - 24 * 3600_000);
    const h1   = new Date(now.getTime() -      3600_000);
    const m15  = new Date(now.getTime() -  15 * 60_000);

    try {
      const [
        // Payment health
        failedWebhookStats,
        openTabsCount,
        stuckTabs,
        paidTodayRow,
        stripeEventCount,

        // Security
        recentAuditCount,
        killSwitchFlags,

        // Devices
        devicesByStatus,
        staleHeartbeats,

        // Fulfillment
        fqByStatus,

        // Support tickets
        openTickets,

        // Connect onboarding
        venueConnectStats,
      ] = await Promise.all([
        // Failed webhooks by status
        db.select({ status: failedWebhooksTable.status, cnt: count() })
          .from(failedWebhooksTable)
          .groupBy(failedWebhooksTable.status),

        // Open tabs count
        db.select({ cnt: count() })
          .from(guestTabsTable)
          .where(eq(guestTabsTable.status, "open")),

        // Tabs stuck in "authorized" for >1h (payment intent created but not confirmed)
        db.select({ cnt: count() })
          .from(guestTabsTable)
          .where(
            and(
              eq(guestTabsTable.paymentStatus, "authorized"),
              lte(guestTabsTable.openedAt, h1),
            ),
          ),

        // Revenue paid in last 24h
        db.select({ total: sql<number>`coalesce(sum(total_cents), 0)` })
          .from(guestTabsTable)
          .where(
            and(
              eq(guestTabsTable.paymentStatus, "paid"),
              gte(guestTabsTable.paidAt!, h24),
            ),
          ),

        // Stripe events processed in 24h (webhook activity)
        db.select({ cnt: count() })
          .from(stripeEventsTable)
          .where(gte(stripeEventsTable.createdAt, h24)),

        // Audit log activity in 1h
        db.select({ cnt: count() })
          .from(auditLogTable)
          .where(gte(auditLogTable.createdAt, h1)),

        // Feature flag kill switches
        db.select({ name: featureFlagsTable.name, enabled: featureFlagsTable.enabled })
          .from(featureFlagsTable)
          .where(sql`name IN ('payments-enabled','rewards-enabled','ai-enabled','fulfillment-enabled')`),

        // Devices by status
        db.select({ status: devicesTable.status, cnt: count() })
          .from(devicesTable)
          .groupBy(devicesTable.status),

        // Stale device heartbeats (no check-in for >15 min, status=active)
        db.select({ cnt: count() })
          .from(devicesTable)
          .where(
            and(
              eq(devicesTable.status, "active"),
              lte(devicesTable.lastActiveAt!, m15),
            ),
          ),

        // Fulfillment queue by status
        db.select({ status: fulfillmentQueueTable.status, cnt: count() })
          .from(fulfillmentQueueTable)
          .groupBy(fulfillmentQueueTable.status),

        // Open support tickets
        db.select({ cnt: count() })
          .from(supportTicketsTable)
          .where(sql`status IN ('open','in_progress')`),

        // Venue Stripe Connect stats
        db.select({
          total:     count(),
          onboarded: sql<number>`count(*) filter (where stripe_connect_onboarded = true)`,
          connected: sql<number>`count(*) filter (where stripe_connect_account_id is not null)`,
        })
        .from(venuesTable),
      ]);

      // ── Aggregate ─────────────────────────────────────────────────────────

      const fwMap: Record<string, number> = {};
      for (const r of failedWebhookStats) fwMap[r.status] = Number(r.cnt);

      const devMap: Record<string, number> = {};
      for (const r of devicesByStatus) devMap[r.status] = Number(r.cnt);

      const fqMap: Record<string, number> = {};
      for (const r of fqByStatus) fqMap[r.status] = Number(r.cnt);

      const killMap: Record<string, boolean> = {};
      for (const f of killSwitchFlags) killMap[f.name] = f.enabled;

      const totalDevices    = Object.values(devMap).reduce((s, n) => s + n, 0);
      const onlineDevices   = devMap["active"]  ?? 0;
      const offlineDevices  = devMap["offline"] ?? 0;
      const deviceHealthPct = totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 100;

      const pendingFw   = fwMap["pending"]   ?? 0;
      const exhaustedFw = fwMap["exhausted"] ?? 0;
      const recoveredFw = fwMap["recovered"] ?? 0;

      const pendingFq  = fqMap["pending"]   ?? 0;
      const activeFq   = (fqMap["claimed"] ?? 0) + (fqMap["preparing"] ?? 0);
      const readyFq    = fqMap["ready"]     ?? 0;

      const stuckTabsCount  = Number(stuckTabs[0]?.cnt ?? 0);
      const openTabsVal     = Number(openTabsCount[0]?.cnt ?? 0);
      const paidTodayCents  = Number(paidTodayRow[0]?.total ?? 0);
      const stripeActivity  = Number(stripeEventCount[0]?.cnt ?? 0);
      const auditActivity   = Number(recentAuditCount[0]?.cnt ?? 0);
      const staleCount      = Number(staleHeartbeats[0]?.cnt ?? 0);
      const openTicketCount = Number(openTickets[0]?.cnt ?? 0);
      const venueStats      = venueConnectStats[0] ?? { total: 0, onboarded: 0, connected: 0 };

      // ── Risk score (0=no risk, 100=critical risk) ─────────────────────────
      //   +20  if >0 exhausted webhooks
      //   +10  per 5 exhausted webhooks (cap +30)
      //   +15  if payments kill-switch is OFF
      //   +15  if device health < 70%
      //   +10  if >0 stuck tabs (payment authorized but not confirmed)
      //   +5   if >0 open P1 support tickets
      //   −5   if stripe activity > 0 in last 24h (sign of live integration)

      let risk = 0;
      if (exhaustedFw > 0)       risk += 20;
      if (exhaustedFw >= 5)      risk += 10;
      if (exhaustedFw >= 10)     risk += 10;
      if (killMap["payments-enabled"] === false) risk += 15;
      if (deviceHealthPct < 70)  risk += 15;
      if (stuckTabsCount > 0)    risk += 10;
      if (openTicketCount > 5)   risk += 5;
      if (stripeActivity > 0)    risk  = Math.max(0, risk - 5);
      risk = Math.min(100, Math.max(0, risk));

      // ── Response ──────────────────────────────────────────────────────────

      res.json({
        checkedAt: now.toISOString(),
        riskScore: risk,
        riskLabel: risk === 0 ? "low" : risk < 30 ? "moderate" : risk < 60 ? "elevated" : "critical",

        paymentHealth: {
          paymentsEnabled:     killMap["payments-enabled"] ?? true,
          failedWebhooks:      { pending: pendingFw, exhausted: exhaustedFw, recovered: recoveredFw },
          stuckTabs:           stuckTabsCount,
          openTabs:            openTabsVal,
          paidTodayCents,
          stripeActivityLast24h: stripeActivity,
          venueConnect: {
            total:     Number(venueStats.total),
            connected: Number(venueStats.connected),
            onboarded: Number(venueStats.onboarded),
          },
        },

        security: {
          killSwitches:       killMap,
          auditActivityLastHour: auditActivity,
          rewardsEnabled:     killMap["rewards-enabled"] ?? true,
          aiEnabled:          killMap["ai-enabled"] ?? true,
        },

        devices: {
          total:        totalDevices,
          online:       onlineDevices,
          offline:      offlineDevices,
          staleHeartbeats: staleCount,
          healthPct:    deviceHealthPct,
        },

        fulfillment: {
          pending:  pendingFq,
          active:   activeFq,
          ready:    readyFq,
          byStatus: fqMap,
        },

        operations: {
          openSupportTickets: openTicketCount,
        },

        alerts: [
          ...(exhaustedFw > 0 ? [{
            level: "critical",
            area:  "payments",
            msg:   `${exhaustedFw} Stripe webhook(s) exhausted — manual review required`,
            action: "Review at /axiom-pay → Stripe tab or /admin/failed-webhooks",
          }] : []),
          ...(stuckTabsCount > 0 ? [{
            level: "warning",
            area:  "payments",
            msg:   `${stuckTabsCount} tab(s) have authorized payment not yet confirmed`,
            action: "Review open tabs in /axiom-pay → Open Tabs",
          }] : []),
          ...(killMap["payments-enabled"] === false ? [{
            level: "critical",
            area:  "security",
            msg:   "Payments kill-switch is OFF — no charges can be processed",
            action: "Enable payments in Feature Flags",
          }] : []),
          ...(deviceHealthPct < 70 ? [{
            level: "warning",
            area:  "devices",
            msg:   `Device health at ${deviceHealthPct}% — ${offlineDevices} device(s) offline`,
            action: "Check /devices for offline kiosks",
          }] : []),
          ...(staleCount > 0 ? [{
            level: "warning",
            area:  "devices",
            msg:   `${staleCount} device(s) marked online but no heartbeat in 15+ minutes`,
            action: "Verify kiosk connectivity in /devices",
          }] : []),
          ...(openTicketCount > 10 ? [{
            level: "warning",
            area:  "operations",
            msg:   `${openTicketCount} open support tickets need attention`,
            action: "Review /admin/support",
          }] : []),
        ],
      });
    } catch (err) {
      logger.error({ err }, "launch readiness check failed");
      res.status(500).json({ error: "readiness_check_failed" });
    }
  },
);

export default router;
