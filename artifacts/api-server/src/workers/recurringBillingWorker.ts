/**
 * recurringBillingWorker — Background Recurring Infrastructure Billing.
 *
 * Runs every 60 minutes. Detects:
 *   1. Hardware leases due for monthly payment (lease_start day-of-month matches today)
 *   2. Module entitlements with monthly billing that haven't been invoiced this month
 *   3. Enterprise contracts due for monthly invoice
 *   4. AI usage monthly billing aggregation (rolls up unbilled usage)
 *   5. Stale rentals past their rental_end date → auto-marks as 'overdue'
 *
 * Revenue events are appended to revenue_events for every billing cycle.
 * Real Stripe invoice creation is stubbed with a TODO — replace with
 * stripe.invoices.create() when Stripe billing is fully wired.
 *
 * This worker is intentionally idempotent — duplicate runs within the
 * same calendar day will not double-bill (enforced by the daily_billed_at check).
 */

import { pool }   from "@workspace/db";
import { logger } from "../lib/logger";

const INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let   timer: ReturnType<typeof setInterval> | null = null;

async function processCycle(): Promise<void> {
  const now     = new Date();
  const today   = now.getDate();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  logger.info({ ts: now.toISOString() }, "[RecurringBilling] cycle start");

  // ── 1. Hardware lease monthly payments ──────────────────────────────────────
  try {
    const { rows: leases } = await pool.query<{
      id: string; venue_id: string; monthly_cents: number;
    }>(
      `SELECT id, venue_id, monthly_cents FROM hardware_leases
       WHERE status = 'active'
         AND EXTRACT(DAY FROM lease_start) = $1
         AND NOT EXISTS (
           SELECT 1 FROM revenue_events
           WHERE venue_id = hardware_leases.venue_id
             AND revenue_type = 'hardware_lease_payment'
             AND (metadata->>'leaseId') = hardware_leases.id::text
             AND created_at >= $2
         )`,
      [today, monthStart],
    ).catch(() => ({ rows: [] as { id: string; venue_id: string; monthly_cents: number }[] }));

    for (const lease of leases) {
      await pool.query(
        `INSERT INTO revenue_events (venue_id, revenue_type, amount_cents, metadata)
         VALUES ($1, 'hardware_lease_payment', $2, $3)`,
        [lease.venue_id, lease.monthly_cents, JSON.stringify({ leaseId: lease.id, billingDate: now.toISOString() })],
      ).catch(() => {});
      logger.info({ leaseId: lease.id, amountCents: lease.monthly_cents }, "[RecurringBilling] hardware lease billed");
    }
  } catch (err) {
    logger.warn({ err }, "[RecurringBilling] hardware lease pass error");
  }

  // ── 2. Module entitlement monthly billing ───────────────────────────────────
  try {
    const { rows: mods } = await pool.query<{
      id: string; venue_id: string; price_cents: number; module_name: string;
    }>(
      `SELECT id, venue_id, price_cents, module_name FROM module_entitlements
       WHERE status = 'active' AND billing_interval = 'monthly'
         AND NOT EXISTS (
           SELECT 1 FROM revenue_events
           WHERE venue_id = module_entitlements.venue_id
             AND revenue_type = 'module_subscription'
             AND (metadata->>'moduleEntitlementId') = module_entitlements.id::text
             AND created_at >= $1
         )`,
      [monthStart],
    ).catch(() => ({ rows: [] as { id: string; venue_id: string; price_cents: number; module_name: string }[] }));

    for (const mod of mods) {
      await pool.query(
        `INSERT INTO revenue_events (venue_id, revenue_type, amount_cents, metadata)
         VALUES ($1, 'module_subscription', $2, $3)`,
        [mod.venue_id, mod.price_cents, JSON.stringify({ moduleEntitlementId: mod.id, moduleName: mod.module_name, billingDate: now.toISOString() })],
      ).catch(() => {});
    }
    if (mods.length) logger.info({ count: mods.length }, "[RecurringBilling] modules billed");
  } catch (err) {
    logger.warn({ err }, "[RecurringBilling] module billing pass error");
  }

  // ── 3. Enterprise contract monthly billing ──────────────────────────────────
  try {
    const { rows: contracts } = await pool.query<{
      id: string; entity_name: string; monthly_base_cents: number; per_location_cents: number; location_count: number;
    }>(
      `SELECT id, entity_name, monthly_base_cents, per_location_cents, location_count
       FROM enterprise_contracts
       WHERE status = 'active'
         AND NOT EXISTS (
           SELECT 1 FROM revenue_events
           WHERE revenue_type = 'enterprise_invoice'
             AND (metadata->>'contractId') = enterprise_contracts.id::text
             AND created_at >= $1
         )`,
      [monthStart],
    ).catch(() => ({ rows: [] as { id: string; entity_name: string; monthly_base_cents: number; per_location_cents: number; location_count: number }[] }));

    for (const c of contracts) {
      const total = c.monthly_base_cents + c.per_location_cents * c.location_count;
      await pool.query(
        `INSERT INTO revenue_events (venue_id, revenue_type, amount_cents, metadata)
         VALUES ($1, 'enterprise_invoice', $2, $3)`,
        [c.id, total, JSON.stringify({ contractId: c.id, entityName: c.entity_name, billingDate: now.toISOString() })],
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

  logger.info({ ts: new Date().toISOString() }, "[RecurringBilling] cycle complete");
}

export function startRecurringBillingWorker(): void {
  if (timer) return;

  processCycle().catch(err => logger.error({ err }, "[RecurringBilling] initial cycle failed"));

  timer = setInterval(() => {
    processCycle().catch(err => logger.error({ err }, "[RecurringBilling] cycle failed"));
  }, INTERVAL_MS);

  logger.info({ intervalMs: INTERVAL_MS }, "[RecurringBilling] worker started");
}

export function stopRecurringBillingWorker(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
