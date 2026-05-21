/**
 * Kernel Background Worker — scheduled maintenance for the Integration Kernel.
 *
 * Runs on a fixed schedule to:
 *   - Provider health sweeps (every 5 min) — marks degraded/failed providers
 *   - Stale device cleanup (every 2 min) — sets kiosks/tablets OFFLINE after no heartbeat
 *   - Rate limit bucket pruning (every 30 min) — removes expired window rows
 *   - Webhook dead-letter processing (every 10 min) — exhausted deliveries → dead_letter table
 *   - Usage alert checks (every 15 min) — fires threshold events via kernelBus
 */

import { logger }                       from "../../lib/logger";
import { runHealthSweep }               from "./healthMonitor";
import { purgeExpiredRateLimitBuckets } from "./tenantGuard";
import { kernelBus }                    from "./eventBus";
import { pool }                         from "@workspace/db";

let started = false;
const timers: ReturnType<typeof setInterval>[] = [];

/* ── Venue ID helpers ────────────────────────────────────────────────────────── */

async function getActiveVenueIds(): Promise<string[]> {
  try {
    const { rows } = await pool.query<{ venue_id: string }>(
      `SELECT DISTINCT venue_id FROM integration_providers WHERE is_active = TRUE LIMIT 100`,
    );
    return rows.map(r => r.venue_id);
  } catch {
    return [];
  }
}

/* ── Webhook dead-letter processor ──────────────────────────────────────────── */

async function processDeadLetterWebhooks(): Promise<void> {
  try {
    const { rows } = await pool.query<{
      id:                  string;
      webhook_config_id:   string;
      venue_id:            string;
      attempt_count:       number;
      last_error:          string;
    }>(`
      SELECT id, webhook_config_id, venue_id, attempt_count, last_error
        FROM kernel_webhook_deliveries
       WHERE status = 'failed'
         AND attempt_count >= max_attempts
         AND dead_lettered = FALSE
       LIMIT 50
    `);
    if (rows.length === 0) return;

    await pool.query(`
      UPDATE kernel_webhook_deliveries
         SET dead_lettered = TRUE, updated_at = NOW()
       WHERE id = ANY($1)
    `, [rows.map(r => r.id)]);

    logger.info({ count: rows.length }, "kernelWorker: dead-lettered exhausted webhook deliveries");

    for (const row of rows) {
      kernelBus.emit("webhook.failed", {
        venueId:      row.venue_id,
        deliveryId:   row.id,
        providerName: "unknown",
        targetUrl:    "",
        error:        row.last_error ?? "exhausted retries",
        attempt:      row.attempt_count,
        willRetry:    false,
        ts:           Date.now(),
      });
    }
  } catch {
    /* table may not exist yet — silently skip */
  }
}

/* ── Usage alert checks ──────────────────────────────────────────────────────── */

async function checkUsageAlerts(): Promise<void> {
  try {
    const { rows } = await pool.query<{
      venue_id:      string;
      provider_id:   string;
      provider_name: string;
      request_count: string;
      daily_limit:   string | null;
      alert_threshold: string | null;
    }>(`
      SELECT
        iu.venue_id,
        iu.provider_id,
        iu.request_count,
        ip.usage_limits->>'dailyRequests' AS daily_limit,
        ip.usage_limits->>'alertThreshold' AS alert_threshold,
        ip.provider_name
      FROM integration_usage iu
      JOIN integration_providers ip
        ON ip.id = iu.provider_id AND ip.venue_id = iu.venue_id
      WHERE iu.bucket_date = CURRENT_DATE
        AND ip.usage_limits IS NOT NULL
    `);

    for (const row of rows) {
      const daily     = Number(row.daily_limit);
      const threshold = Number(row.alert_threshold ?? 0.8);
      if (!daily || daily <= 0) continue;

      const current = Number(row.request_count);
      const pct     = current / daily;
      if (pct >= threshold) {
        kernelBus.emit("usage.threshold_exceeded", {
          venueId:      row.venue_id,
          providerId:   row.provider_id,
          providerName: row.provider_name,
          metric:       "dailyRequests",
          current,
          limit:        daily,
          pct,
          ts:           Date.now(),
        });
      }
    }
  } catch {
    /* table may not exist yet — silently skip */
  }
}

/* ── Stale device sweep ──────────────────────────────────────────────────────── */

async function sweepStaleDevices(staleThresholdMinutes: number): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - staleThresholdMinutes * 60_000).toISOString();
    const { rowCount } = await pool.query(`
      UPDATE integration_devices
         SET status = 'offline', updated_at = NOW()
       WHERE status = 'online'
         AND last_heartbeat_at < $1
    `, [cutoff]);
    if ((rowCount ?? 0) > 0) {
      logger.info({ count: rowCount, staleThresholdMinutes }, "kernelWorker: marked stale devices offline");
    }
  } catch {
    /* table may not exist yet — silently skip */
  }
}

/* ── Public API ──────────────────────────────────────────────────────────────── */

export function startKernelWorker(): void {
  if (started) return;
  started = true;

  // Provider health sweeps — every 5 minutes (per active venue)
  timers.push(setInterval(async () => {
    const venueIds = await getActiveVenueIds();
    for (const venueId of venueIds) {
      try {
        await runHealthSweep(venueId);
      } catch (err) {
        logger.warn({ err, venueId }, "kernelWorker: health sweep failed");
      }
    }
  }, 5 * 60 * 1_000));

  // Stale device cleanup — every 2 minutes (marks devices offline after no heartbeat for 10 min)
  timers.push(setInterval(async () => {
    await sweepStaleDevices(10);
  }, 2 * 60 * 1_000));

  // Rate limit bucket pruning — every 30 minutes
  timers.push(setInterval(async () => {
    try {
      await purgeExpiredRateLimitBuckets();
    } catch (err) {
      logger.warn({ err }, "kernelWorker: rate limit purge failed");
    }
  }, 30 * 60 * 1_000));

  // Webhook dead-letter processing — every 10 minutes
  timers.push(setInterval(async () => {
    await processDeadLetterWebhooks();
  }, 10 * 60 * 1_000));

  // Usage alert checks — every 15 minutes
  timers.push(setInterval(async () => {
    await checkUsageAlerts();
  }, 15 * 60 * 1_000));

  logger.info("kernelWorker: started (health sweeps, stale devices, rate limit pruning, dead-letter, usage alerts)");
}

export function stopKernelWorker(): void {
  for (const t of timers) clearInterval(t);
  timers.length = 0;
  started = false;
  logger.info("kernelWorker: stopped");
}
