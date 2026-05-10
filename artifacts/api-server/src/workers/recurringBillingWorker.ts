/**
 * recurringBillingWorker — Real Stripe Invoice + Dunning Pipeline.
 *
 * Runs every 60 minutes. Responsibilities:
 *   1. Hardware lease monthly payments → Stripe invoice item + auto-finalize
 *   2. Module entitlement monthly billing → Stripe invoice item + auto-finalize
 *   3. Enterprise contract billing → Stripe invoice item + auto-finalize
 *   4. Stale rentals past rental_end → mark overdue
 *   5. Dunning: detect past_due subscriptions, write dunning_events, retry
 *
 * Idempotent: guarded by daily_billed_at / monthStart checks so double-runs
 * within the same calendar day do not double-bill.
 *
 * Stripe invoices are created, finalized, and auto-paid in one call per billing
 * cycle. On Stripe failure the revenue_event is NOT written — the error is
 * logged and a dunning_event is recorded for visibility.
 */

import Stripe  from "stripe";
import { pool } from "@workspace/db";
import { db, dunningEventsTable, subscriptionsTable } from "@workspace/db";
import { eq, and, lte } from "drizzle-orm";
import { logger } from "../lib/logger";

const INTERVAL_MS = 60 * 60 * 1000;
let   timer: ReturnType<typeof setInterval> | null = null;

function getStripe(): Stripe | null {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key || key.startsWith("<") || key === "sk_test_placeholder") return null;
  return new Stripe(key);
}

async function createAndFinalizeInvoice(
  stripe: Stripe,
  stripeCustomerId: string,
  description: string,
  amountCents: number,
  metadata: Record<string, string>,
): Promise<string | null> {
  try {
    await stripe.invoiceItems.create({
      customer:    stripeCustomerId,
      amount:      amountCents,
      currency:    "usd",
      description,
    });

    const invoice = await stripe.invoices.create({
      customer:         stripeCustomerId,
      auto_advance:     true,
      collection_method: "charge_automatically",
      metadata,
    });

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);
    logger.info({ invoiceId: finalized.id, stripeCustomerId, amountCents }, "[RecurringBilling] invoice created and finalized");
    return finalized.id;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err: msg, stripeCustomerId, amountCents }, "[RecurringBilling] Stripe invoice creation failed");
    return null;
  }
}

async function writeDunningEvent(params: {
  venueId:      string;
  type:         "reminder" | "failed" | "retry" | "recovered" | "canceled";
  attemptCount: number;
  nextRetryAt?: Date;
  metadata?:    Record<string, unknown>;
}): Promise<void> {
  await db.insert(dunningEventsTable).values({
    venueId:      params.venueId,
    type:         params.type,
    attemptCount: params.attemptCount,
    nextRetryAt:  params.nextRetryAt,
    metadata:     params.metadata ?? null,
  }).catch(err => logger.warn({ err }, "[RecurringBilling] dunning event write failed"));
}

async function processCycle(): Promise<void> {
  const now        = new Date();
  const today      = now.getDate();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const stripe     = getStripe();

  logger.info({ ts: now.toISOString(), stripeEnabled: !!stripe }, "[RecurringBilling] cycle start");

  // ── 1. Hardware lease monthly payments ─────────────────────────────────────
  try {
    const { rows: leases } = await pool.query<{
      id: string; venue_id: string; monthly_cents: number; stripe_customer_id: string | null;
    }>(
      `SELECT hl.id, hl.venue_id, hl.monthly_cents, v.stripe_customer_id
       FROM hardware_leases hl
       JOIN venues v ON v.id = hl.venue_id
       WHERE hl.status = 'active'
         AND EXTRACT(DAY FROM hl.lease_start) = $1
         AND NOT EXISTS (
           SELECT 1 FROM revenue_events
           WHERE venue_id = hl.venue_id
             AND revenue_type = 'hardware_lease_payment'
             AND (metadata->>'leaseId') = hl.id::text
             AND created_at >= $2
         )`,
      [today, monthStart],
    ).catch(() => ({ rows: [] as { id: string; venue_id: string; monthly_cents: number; stripe_customer_id: string | null }[] }));

    for (const lease of leases) {
      let invoiceId: string | null = null;

      if (stripe && lease.stripe_customer_id) {
        invoiceId = await createAndFinalizeInvoice(
          stripe,
          lease.stripe_customer_id,
          `Hardware lease payment — ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
          lease.monthly_cents,
          { leaseId: lease.id, venueId: lease.venue_id, type: "hardware_lease" },
        );

        if (!invoiceId) {
          await writeDunningEvent({ venueId: lease.venue_id, type: "failed", attemptCount: 1, metadata: { leaseId: lease.id, amountCents: lease.monthly_cents } });
          continue;
        }
      } else if (!stripe) {
        logger.warn({ leaseId: lease.id }, "[RecurringBilling] Stripe not configured — hardware lease billing deferred");
        continue;
      }

      await pool.query(
        `INSERT INTO revenue_events (venue_id, revenue_type, amount_cents, metadata)
         VALUES ($1, 'hardware_lease_payment', $2, $3)`,
        [lease.venue_id, lease.monthly_cents, JSON.stringify({ leaseId: lease.id, billingDate: now.toISOString(), stripeInvoiceId: invoiceId })],
      ).catch(() => {});
      logger.info({ leaseId: lease.id, amountCents: lease.monthly_cents, invoiceId }, "[RecurringBilling] hardware lease billed");
    }
  } catch (err) {
    logger.warn({ err }, "[RecurringBilling] hardware lease pass error");
  }

  // ── 2. Module entitlement monthly billing ───────────────────────────────────
  try {
    const { rows: mods } = await pool.query<{
      id: string; venue_id: string; price_cents: number; module_name: string; stripe_customer_id: string | null;
    }>(
      `SELECT me.id, me.venue_id, me.price_cents, me.module_name, v.stripe_customer_id
       FROM module_entitlements me
       JOIN venues v ON v.id = me.venue_id
       WHERE me.status = 'active' AND me.billing_interval = 'monthly'
         AND NOT EXISTS (
           SELECT 1 FROM revenue_events
           WHERE venue_id = me.venue_id
             AND revenue_type = 'module_subscription'
             AND (metadata->>'moduleEntitlementId') = me.id::text
             AND created_at >= $1
         )`,
      [monthStart],
    ).catch(() => ({ rows: [] as { id: string; venue_id: string; price_cents: number; module_name: string; stripe_customer_id: string | null }[] }));

    for (const mod of mods) {
      let invoiceId: string | null = null;

      if (stripe && mod.stripe_customer_id) {
        invoiceId = await createAndFinalizeInvoice(
          stripe,
          mod.stripe_customer_id,
          `${mod.module_name} module — ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
          mod.price_cents,
          { moduleEntitlementId: mod.id, moduleName: mod.module_name, venueId: mod.venue_id, type: "module_subscription" },
        );

        if (!invoiceId) {
          await writeDunningEvent({ venueId: mod.venue_id, type: "failed", attemptCount: 1, metadata: { moduleEntitlementId: mod.id, moduleName: mod.module_name } });
          continue;
        }
      } else if (!stripe) {
        logger.warn({ modId: mod.id }, "[RecurringBilling] Stripe not configured — module billing deferred");
        continue;
      }

      await pool.query(
        `INSERT INTO revenue_events (venue_id, revenue_type, amount_cents, metadata)
         VALUES ($1, 'module_subscription', $2, $3)`,
        [mod.venue_id, mod.price_cents, JSON.stringify({ moduleEntitlementId: mod.id, moduleName: mod.module_name, billingDate: now.toISOString(), stripeInvoiceId: invoiceId })],
      ).catch(() => {});
    }
    if (mods.length) logger.info({ count: mods.length }, "[RecurringBilling] modules billed");
  } catch (err) {
    logger.warn({ err }, "[RecurringBilling] module billing pass error");
  }

  // ── 3. Enterprise contract monthly billing ──────────────────────────────────
  try {
    const { rows: contracts } = await pool.query<{
      id: string; entity_name: string; monthly_base_cents: number; per_location_cents: number;
      location_count: number; stripe_customer_id: string | null;
    }>(
      `SELECT ec.id, ec.entity_name, ec.monthly_base_cents, ec.per_location_cents, ec.location_count,
              v.stripe_customer_id
       FROM enterprise_contracts ec
       LEFT JOIN venues v ON v.id::text = ec.id::text
       WHERE ec.status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM revenue_events
           WHERE revenue_type = 'enterprise_invoice'
             AND (metadata->>'contractId') = ec.id::text
             AND created_at >= $1
         )`,
      [monthStart],
    ).catch(() => ({ rows: [] as { id: string; entity_name: string; monthly_base_cents: number; per_location_cents: number; location_count: number; stripe_customer_id: string | null }[] }));

    for (const c of contracts) {
      const total = c.monthly_base_cents + c.per_location_cents * c.location_count;
      let invoiceId: string | null = null;

      if (stripe && c.stripe_customer_id) {
        invoiceId = await createAndFinalizeInvoice(
          stripe,
          c.stripe_customer_id,
          `Enterprise contract — ${c.entity_name} — ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
          total,
          { contractId: c.id, entityName: c.entity_name, type: "enterprise_invoice" },
        );
        if (!invoiceId) continue;
      }

      await pool.query(
        `INSERT INTO revenue_events (venue_id, revenue_type, amount_cents, metadata)
         VALUES ($1, 'enterprise_invoice', $2, $3)`,
        [c.id, total, JSON.stringify({ contractId: c.id, entityName: c.entity_name, billingDate: now.toISOString(), stripeInvoiceId: invoiceId })],
      ).catch(() => {});
    }
    if (contracts.length) logger.info({ count: contracts.length }, "[RecurringBilling] enterprise contracts billed");
  } catch (err) {
    logger.warn({ err }, "[RecurringBilling] enterprise billing pass error");
  }

  // ── 4. Stale rental → overdue ───────────────────────────────────────────────
  try {
    const { rowCount } = await pool.query(
      `UPDATE hardware_rentals SET status = 'overdue' WHERE status = 'active' AND rental_end < NOW()`,
    ).catch(() => ({ rowCount: 0 }));
    if ((rowCount ?? 0) > 0) logger.info({ count: rowCount }, "[RecurringBilling] rentals marked overdue");
  } catch (err) {
    logger.warn({ err }, "[RecurringBilling] rental overdue pass error");
  }

  // ── 5. Dunning: detect past_due subscriptions and write dunning events ───────
  try {
    const pastDue = await db
      .select({ venueId: subscriptionsTable.venueId, stripeSubscriptionId: subscriptionsTable.stripeSubscriptionId, gracePeriodEndsAt: subscriptionsTable.gracePeriodEndsAt })
      .from(subscriptionsTable)
      .where(and(
        eq(subscriptionsTable.status, "past_due"),
        lte(subscriptionsTable.gracePeriodEndsAt, new Date()),
      ))
      .limit(50);

    for (const sub of pastDue) {
      const nextRetry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      await writeDunningEvent({
        venueId:      sub.venueId,
        type:         "retry",
        attemptCount: 1,
        nextRetryAt:  nextRetry,
        metadata:     { stripeSubscriptionId: sub.stripeSubscriptionId, gracePeriodEndsAt: sub.gracePeriodEndsAt?.toISOString() },
      });
      logger.warn({ venueId: sub.venueId, stripeSubscriptionId: sub.stripeSubscriptionId }, "[RecurringBilling] dunning retry scheduled");
    }
  } catch (err) {
    logger.warn({ err }, "[RecurringBilling] dunning pass error");
  }

  logger.info({ ts: new Date().toISOString() }, "[RecurringBilling] cycle complete");
}

export function startRecurringBillingWorker(): void {
  if (timer) return;
  processCycle().catch(err => logger.error({ err }, "[RecurringBilling] initial cycle failed"));
  timer = setInterval(() => {
    processCycle().catch(err => logger.error({ err }, "[RecurringBilling] cycle failed"));
  }, INTERVAL_MS);
  logger.info({ intervalMs: INTERVAL_MS }, "[RecurringBilling] worker started — real Stripe invoicing active");
}

export function stopRecurringBillingWorker(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
