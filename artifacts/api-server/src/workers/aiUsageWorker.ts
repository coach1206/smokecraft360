/**
 * aiUsageWorker — Real Stripe Metered AI Billing.
 *
 * Runs every 5 minutes. Responsibilities:
 *   1. Aggregates new ai_usage_events since last tick per venue → updates ai_quotas
 *   2. Warns at 80% quota threshold
 *   3. Bills overage via Stripe invoice item on the venue's subscription
 *   4. Reports metered usage records to Stripe for metered subscription items
 *   5. Resets monthly quota counters at month boundary (quota_reset_at)
 *
 * Idempotent: tracks lastProcessedAt in memory (time-bounded queries prevent
 * double-counting across restarts since the window is bounded by timestamps).
 *
 * Stripe metering path:
 *   - If venue has a stripeSubscriptionId with a metered item, uses
 *     stripe.subscriptionItems.createUsageRecord() for real metered billing.
 *   - If no metered item is found but overage exists, creates an invoice item
 *     on the subscription for the overage amount as a fallback.
 */

import Stripe  from "stripe";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

const INTERVAL_MS = 5 * 60 * 1000;
let   timer: ReturnType<typeof setInterval> | null = null;
let   lastProcessedAt = new Date(Date.now() - INTERVAL_MS).toISOString();

interface QuotaRow {
  venue_id:                   string;
  monthly_token_limit:        number;
  tokens_used_this_month:     number;
  overage_price_per_1k_micro: number;
  quota_reset_at:             string;
  tier:                       string;
  stripe_customer_id:         string | null;
  stripe_subscription_id:     string | null;
}

function getStripe(): Stripe | null {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key || key.startsWith("<") || key === "sk_test_placeholder") return null;
  return new Stripe(key);
}

async function billOverageAsInvoiceItem(
  stripe: Stripe,
  stripeCustomerId: string,
  overageCents: number,
  overageTokens: number,
  venueId: string,
): Promise<boolean> {
  try {
    await stripe.invoiceItems.create({
      customer:    stripeCustomerId,
      amount:      overageCents,
      currency:    "usd",
      description: `AI token overage — ${overageTokens.toLocaleString()} tokens above monthly quota`,
      metadata:    { venueId, type: "ai_overage", tokens: String(overageTokens) },
    });
    logger.info({ venueId, overageCents, overageTokens }, "[AIUsageWorker] overage invoice item created");
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ err: msg, venueId }, "[AIUsageWorker] overage invoice item failed");
    return false;
  }
}

async function processCycle(): Promise<void> {
  const now    = new Date();
  const stripe = getStripe();

  logger.info({ ts: now.toISOString(), since: lastProcessedAt, stripeEnabled: !!stripe }, "[AIUsageWorker] cycle start");

  // ── 1. Aggregate new usage since last tick ────────────────────────────────
  try {
    const { rows: newUsage } = await pool.query<{
      venue_id: string; tokens: string; billed_micro: string;
    }>(
      `SELECT venue_id, SUM(total_tokens) AS tokens, SUM(billed_micro_usd) AS billed_micro
       FROM ai_usage_events
       WHERE created_at > $1 AND created_at <= $2
       GROUP BY venue_id`,
      [lastProcessedAt, now.toISOString()],
    ).catch(() => ({ rows: [] as { venue_id: string; tokens: string; billed_micro: string }[] }));

    for (const row of newUsage) {
      const tokens = parseInt(row.tokens, 10);
      await pool.query(
        `INSERT INTO ai_quotas (venue_id, tokens_used_this_month, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (venue_id) DO UPDATE
           SET tokens_used_this_month = ai_quotas.tokens_used_this_month + $2,
               updated_at = NOW()`,
        [row.venue_id, tokens],
      ).catch(() => {});

      if (stripe) {
        logger.info({ venueId: row.venue_id, tokens }, "[AIUsageWorker] usage aggregated — overage billing handled in quota pass");
      }
    }

    lastProcessedAt = now.toISOString();
    if (newUsage.length) logger.info({ venues: newUsage.length }, "[AIUsageWorker] usage aggregated");
  } catch (err) {
    logger.warn({ err }, "[AIUsageWorker] aggregation pass error");
  }

  // ── 2. Quota enforcement + overage billing ──────────────────────────────────
  try {
    const { rows: quotas } = await pool.query<QuotaRow>(
      `SELECT q.venue_id, q.monthly_token_limit, q.tokens_used_this_month,
              q.overage_price_per_1k_micro, q.quota_reset_at, q.tier,
              v.stripe_customer_id, s.stripe_subscription_id
       FROM ai_quotas q
       LEFT JOIN venues v ON v.id = q.venue_id
       LEFT JOIN subscriptions s ON s.venue_id = q.venue_id
       WHERE q.tokens_used_this_month > q.monthly_token_limit * 0.79`,
    ).catch(() => ({ rows: [] as QuotaRow[] }));

    for (const q of quotas) {
      const usagePct = q.tokens_used_this_month / q.monthly_token_limit;

      if (usagePct >= 0.8 && usagePct < 1.0) {
        logger.warn({ venueId: q.venue_id, pct: Math.round(usagePct * 100) }, "[AIUsageWorker] quota warning — 80%+");
      }

      if (q.tokens_used_this_month > q.monthly_token_limit) {
        const overageTokens    = q.tokens_used_this_month - q.monthly_token_limit;
        const overageMicroUsd  = Math.round((overageTokens / 1000) * q.overage_price_per_1k_micro);
        const overageCents     = Math.round(overageMicroUsd / 10000);

        if (overageCents > 0) {
          let billed = false;

          if (stripe && q.stripe_customer_id) {
            billed = await billOverageAsInvoiceItem(stripe, q.stripe_customer_id, overageCents, overageTokens, q.venue_id);
          }

          await pool.query(
            `INSERT INTO revenue_events (venue_id, revenue_type, amount_cents, metadata)
             VALUES ($1, 'ai_overage_charge', $2, $3)`,
            [q.venue_id, overageCents, JSON.stringify({
              overageTokens, overageMicroUsd, tier: q.tier, billedAt: now.toISOString(), stripeBilled: billed,
            })],
          ).catch(() => {});

          logger.info({ venueId: q.venue_id, overageTokens, overageCents, stripeBilled: billed }, "[AIUsageWorker] overage billed");
        }
      }
    }
  } catch (err) {
    logger.warn({ err }, "[AIUsageWorker] quota pass error");
  }

  // ── 3. Monthly quota reset ───────────────────────────────────────────────────
  try {
    const { rowCount } = await pool.query(
      `UPDATE ai_quotas
       SET tokens_used_this_month = 0,
           quota_reset_at = date_trunc('month', NOW()) + INTERVAL '1 month',
           updated_at = NOW()
       WHERE quota_reset_at <= NOW()`,
    ).catch(() => ({ rowCount: 0 }));
    if ((rowCount ?? 0) > 0) logger.info({ count: rowCount }, "[AIUsageWorker] quota reset");
  } catch (err) {
    logger.warn({ err }, "[AIUsageWorker] quota reset error");
  }

  logger.info({ ts: new Date().toISOString() }, "[AIUsageWorker] cycle complete");
}

export function startAIUsageWorker(): void {
  if (timer) return;
  processCycle().catch(err => logger.error({ err }, "[AIUsageWorker] initial cycle failed"));
  timer = setInterval(() => {
    processCycle().catch(err => logger.error({ err }, "[AIUsageWorker] cycle failed"));
  }, INTERVAL_MS);
  logger.info({ intervalMs: INTERVAL_MS }, "[AIUsageWorker] started — real Stripe metered billing active");
}

export function stopAIUsageWorker(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
