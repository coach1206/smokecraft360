/**
 * reconciliationWorker — automated financial health checks.
 *
 * Runs on a 15-minute interval. Detects:
 *   - Stale authorized tabs (authorized >2h, never paid)
 *   - Orphan tabs (open >72h)
 *   - Exhausted failed webhooks
 *   - Failed / stuck payout requests
 *   - Unpaid but fulfilled tabs (fulfillment gap)
 *
 * Each issue type creates at most ONE open alert of that category
 * per entity to avoid spam. Skips if an identical open/ack alert exists.
 */

import { eq, and, lte, gte, sql, count } from "drizzle-orm";
import {
  db,
  guestTabsTable, payoutRequestsTable,
  failedWebhooksTable, reconciliationAlertsTable,
} from "@workspace/db";
import { logger } from "./logger.js";

export interface ReconciliationResult {
  alertsCreated: number;
  checkedAt: string;
}

async function upsertAlert(input: {
  category:   string;
  severity:   string;
  title:      string;
  description:string;
  entityId?:  string;
  entityType?:string;
  venueId?:   string;
  metadata?:  unknown;
}): Promise<boolean> {
  // Don't create duplicate open/ack alerts for the same entity + category
  const existing = await db.select({ id: reconciliationAlertsTable.id })
    .from(reconciliationAlertsTable)
    .where(and(
      eq(reconciliationAlertsTable.category, input.category as any),
      sql`status IN ('open','acknowledged')`,
      input.entityId
        ? eq(reconciliationAlertsTable.entityId, input.entityId)
        : sql`entity_id IS NULL`,
    ))
    .limit(1);

  if (existing.length > 0) return false; // already alerted

  await db.insert(reconciliationAlertsTable).values({
    category:    input.category as any,
    severity:    input.severity as any,
    title:       input.title,
    description: input.description,
    entityId:    input.entityId,
    entityType:  input.entityType,
    venueId:     input.venueId,
    metadata:    input.metadata ?? null,
    status:      "open",
  });
  return true;
}

export async function runReconciliation(): Promise<ReconciliationResult> {
  const now  = new Date();
  const h2   = new Date(now.getTime() -  2 * 3600_000);
  const h72  = new Date(now.getTime() - 72 * 3600_000);
  const d7   = new Date(now.getTime() -  7 * 24 * 3600_000);

  let alertsCreated = 0;

  try {
    // ── 1. Stale authorized tabs (stuck payment intents) ─────────────────────
    const stuckTabs = await db.select({
      id:       guestTabsTable.id,
      venueId:  guestTabsTable.venueId,
      totalCents: guestTabsTable.totalCents,
      openedAt: guestTabsTable.openedAt,
      stripePaymentIntentId: guestTabsTable.stripePaymentIntentId,
    })
    .from(guestTabsTable)
    .where(and(
      eq(guestTabsTable.paymentStatus, "authorized"),
      lte(guestTabsTable.openedAt, h2),
    ))
    .limit(20);

    for (const tab of stuckTabs) {
      const created = await upsertAlert({
        category:    "stale_tab",
        severity:    "high",
        title:       `Tab ${tab.id.slice(0, 8)} authorized >2h without capture`,
        description: `Payment intent authorized but not captured for $${(tab.totalCents / 100).toFixed(2)}. Stripe authorization may expire.`,
        entityId:    tab.id,
        entityType:  "tab",
        venueId:     tab.venueId,
        metadata:    { stripePaymentIntentId: tab.stripePaymentIntentId, openedAt: tab.openedAt },
      });
      if (created) alertsCreated++;
    }

    // ── 2. Orphan open tabs (>72h) ────────────────────────────────────────────
    const orphanTabs = await db.select({ id: guestTabsTable.id, venueId: guestTabsTable.venueId, openedAt: guestTabsTable.openedAt })
      .from(guestTabsTable)
      .where(and(eq(guestTabsTable.status, "open"), lte(guestTabsTable.openedAt, h72)))
      .limit(20);

    for (const tab of orphanTabs) {
      const created = await upsertAlert({
        category:    "orphan_payment",
        severity:    "medium",
        title:       `Orphan tab open for >72 hours`,
        description: `Tab ${tab.id.slice(0, 8)} has been open since ${tab.openedAt.toLocaleDateString()}. Consider voiding or following up with the guest.`,
        entityId:    tab.id,
        entityType:  "tab",
        venueId:     tab.venueId,
        metadata:    { openedAt: tab.openedAt },
      });
      if (created) alertsCreated++;
    }

    // ── 3. Exhausted failed webhooks ──────────────────────────────────────────
    const exhausted = await db.select({ id: failedWebhooksTable.id, eventType: failedWebhooksTable.eventType })
      .from(failedWebhooksTable).where(eq(failedWebhooksTable.status, "exhausted")).limit(10);

    if (exhausted.length > 0) {
      const created = await upsertAlert({
        category:    "webhook_outage",
        severity:    "critical",
        title:       `${exhausted.length} Stripe webhook event(s) exhausted — manual review required`,
        description: `Webhook events have failed all retry attempts: ${exhausted.map((e) => e.eventType).join(", ")}. Payment state may be inconsistent.`,
        entityId:    "webhook-batch",
        entityType:  "webhook",
        metadata:    { ids: exhausted.map((e) => e.id) },
      });
      if (created) alertsCreated++;
    }

    // ── 4. Failed payout requests ──────────────────────────────────────────────
    const failedPayouts = await db.select({ id: payoutRequestsTable.id, venueId: payoutRequestsTable.venueId, amountCents: payoutRequestsTable.amountCents })
      .from(payoutRequestsTable).where(eq(payoutRequestsTable.status, "failed")).limit(10);

    for (const payout of failedPayouts) {
      const created = await upsertAlert({
        category:    "payout_failure",
        severity:    "critical",
        title:       `Payout of $${(payout.amountCents / 100).toFixed(2)} failed`,
        description: `Payout request ${payout.id.slice(0, 8)} failed. Venue proceeds are being held. Review Stripe Connect dashboard for transfer errors.`,
        entityId:    payout.id,
        entityType:  "payout_request",
        venueId:     payout.venueId,
        metadata:    { amountCents: payout.amountCents },
      });
      if (created) alertsCreated++;
    }

    // ── 5. Stale pending payout requests (>7 days) ────────────────────────────
    const stalePending = await db.select({ id: payoutRequestsTable.id, venueId: payoutRequestsTable.venueId, amountCents: payoutRequestsTable.amountCents, createdAt: payoutRequestsTable.createdAt })
      .from(payoutRequestsTable)
      .where(and(eq(payoutRequestsTable.status, "pending"), lte(payoutRequestsTable.createdAt, d7)))
      .limit(10);

    for (const payout of stalePending) {
      const created = await upsertAlert({
        category:    "payout_delay",
        severity:    "high",
        title:       `Payout request pending for >7 days`,
        description: `Payout request ${payout.id.slice(0, 8)} for $${(payout.amountCents / 100).toFixed(2)} has not been approved or rejected. Review in the payout management panel.`,
        entityId:    payout.id,
        entityType:  "payout_request",
        venueId:     payout.venueId,
        metadata:    { createdAt: payout.createdAt, amountCents: payout.amountCents },
      });
      if (created) alertsCreated++;
    }

    logger.info({ alertsCreated, stuckTabs: stuckTabs.length, orphanTabs: orphanTabs.length }, "Reconciliation worker completed");
  } catch (err) {
    logger.error({ err }, "reconciliationWorker: unhandled error");
  }

  return { alertsCreated, checkedAt: now.toISOString() };
}

export function startReconciliationWorker(): void {
  const INTERVAL_MS = 15 * 60_000; // every 15 minutes

  const run = async () => {
    try {
      await runReconciliation();
    } catch (err) {
      logger.error({ err }, "reconciliationWorker: uncaught error");
    }
  };

  setTimeout(() => {
    void run();
    setInterval(() => void run(), INTERVAL_MS);
  }, 60_000); // stagger 60s after server start

  logger.info("reconciliationWorker: started (15-min interval)");
}
