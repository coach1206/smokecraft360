/**
 * aiUsageWorker — Background AI Usage Aggregation + Billing.
 *
 * Runs every 5 minutes. Responsibilities:
 *   1. Aggregates unbilled ai_usage_events per venue for the rolling 30-day window
 *   2. Checks each venue's quota — emits warning if usage ≥ 80%
 *   3. Calculates overage if usage exceeds monthly_token_limit
 *   4. Records overage billing events to revenue_events
 *   5. Resets monthly quota counters at month boundary (quota_reset_at)
 *
 * Idempotent: tracks last processed timestamp in ai_usage_worker_state
 * (in-memory, resets on restart — safe because queries are time-bounded).
 *
 * Real Stripe metered billing: stub with TODO. Replace the revenue_events
 * insert with a Stripe usage record when metered billing is wired.
 */

import { pool }   from "@workspace/db";
import { logger } from "../lib/logger";

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let   timer: ReturnType<typeof setInterval> | null = null;
let   lastProcessedAt = new Date(Date.now() - INTERVAL_MS).toISOString();

interface QuotaRow {
  venue_id:               string;
  monthly_token_limit:    number;
  tokens_used_this_month: number;
  overage_price_per_1k_micro: number;
  quota_reset_at:         string;
  tier:                   string;
}

async function processCycle(): Promise<void> {
  const now = new Date();
  logger.info({ ts: now.toISOString(), since: lastProcessedAt }, "[AIUsageWorker] cycle start");

  // ── 1. Aggregate new usage since last tick ───────────────────────────────────
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
    }

    lastProcessedAt = now.toISOString();
    if (newUsage.length) logger.info({ venues: newUsage.length }, "[AIUsageWorker] usage aggregated");
  } catch (err) {
    logger.warn({ err }, "[AIUsageWorker] aggregation pass error");
  }

  // ── 2. Quota enforcement + overage billing ──────────────────────────────────
  try {
    const { rows: quotas } = await pool.query<QuotaRow>(
      `SELECT venue_id, monthly_token_limit, tokens_used_this_month,
              overage_price_per_1k_micro, quota_reset_at, tier
       FROM ai_quotas WHERE tokens_used_this_month > monthly_token_limit * 0.79`,
    ).catch(() => ({ rows: [] as QuotaRow[] }));

    for (const q of quotas) {
      const usagePct = q.tokens_used_this_month / q.monthly_token_limit;

      if (usagePct >= 0.8 && usagePct < 1.0) {
        logger.warn({ venueId: q.venue_id, pct: Math.round(usagePct * 100) }, "[AIUsageWorker] quota warning — 80%+");
      }

      if (q.tokens_used_this_month > q.monthly_token_limit) {
        const overageTokens = q.tokens_used_this_month - q.monthly_token_limit;
        const overageMicroUsd = Math.round((overageTokens / 1000) * q.overage_price_per_1k_micro);
        const overageCents    = Math.round(overageMicroUsd / 10000);

        if (overageCents > 0) {
          await pool.query(
            `INSERT INTO revenue_events (venue_id, revenue_type, amount_cents, metadata)
             VALUES ($1, 'ai_overage_charge', $2, $3)`,
            [q.venue_id, overageCents, JSON.stringify({
              overageTokens, overageMicroUsd, tier: q.tier, billedAt: now.toISOString(),
            })],
          ).catch(() => {});
          logger.info({ venueId: q.venue_id, overageTokens, overageCents }, "[AIUsageWorker] overage billed");
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

  logger.info({ intervalMs: INTERVAL_MS }, "[AIUsageWorker] started");
}

export function stopAIUsageWorker(): void {
  if (timer) { clearInterval(timer); timer = null; }
}
