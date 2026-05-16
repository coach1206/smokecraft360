/**
 * providerFailover — automatic provider outage detection and failover.
 *
 * Strategy:
 *   1. Monitor latency + error rate via latencyMonitor
 *   2. On threshold breach → move provider to DEGRADED state
 *   3. On sustained breach → FAILED state → route to failover provider
 *   4. Background probe every 30s → auto-recovery when healthy
 *
 * Failover priority (per venue): configured in pos_adapter_configs.
 * Default: toast → square → clover → offline_mode
 */

import { pool }           from "@workspace/db";
import { logger }         from "../../lib/logger";
import { publish }        from "../../realtime/transport/eventBus";
import { computeStats }   from "./latencyMonitor";

export type ProviderHealth = "healthy" | "degraded" | "failed" | "unknown";

export interface ProviderStatus {
  provider:       string;
  venueId:        string;
  health:          ProviderHealth;
  consecutiveFails:number;
  lastCheckAt:     number;
  failedSince:     number | null;
  degradedSince:   number | null;
  recoveredAt:     number | null;
  activeFailover:  string | null;    // currently routing to this provider instead
}

const DEGRADE_ERROR_RATE   = 0.3;   // 30% errors → degraded
const FAIL_ERROR_RATE      = 0.6;   // 60% errors → failed
const DEGRADE_LATENCY_MS   = 2_000; // p95 > 2s → degraded
const FAIL_LATENCY_MS      = 5_000; // p95 > 5s → failed
const RECOVERY_WINDOW_MIN  = 2;     // must stay healthy 2 min to recover

const statusMap = new Map<string, ProviderStatus>();

function statusKey(provider: string, venueId: string): string {
  return `${provider}:${venueId}`;
}

export function getProviderStatus(provider: string, venueId: string): ProviderStatus {
  return statusMap.get(statusKey(provider, venueId)) ?? {
    provider, venueId, health: "unknown", consecutiveFails: 0,
    lastCheckAt: 0, failedSince: null, degradedSince: null,
    recoveredAt: null, activeFailover: null,
  };
}

export async function evaluateProvider(
  provider:  string,
  venueId:   string,
  operation = "order",
): Promise<ProviderStatus> {
  const key     = statusKey(provider, venueId);
  const current = getProviderStatus(provider, venueId);
  const stats   = computeStats(provider, venueId, operation);

  let health: ProviderHealth = "healthy";

  if (stats) {
    if (stats.errorRate >= FAIL_ERROR_RATE || stats.p95 >= FAIL_LATENCY_MS) {
      health = "failed";
    } else if (stats.errorRate >= DEGRADE_ERROR_RATE || stats.p95 >= DEGRADE_LATENCY_MS) {
      health = "degraded";
    }
  }

  const now = Date.now();
  const next: ProviderStatus = {
    ...current,
    provider, venueId,
    health,
    lastCheckAt:      now,
    consecutiveFails: health === "failed" ? current.consecutiveFails + 1 : 0,
    failedSince:      health === "failed"   ? (current.failedSince   ?? now) : null,
    degradedSince:    health === "degraded" ? (current.degradedSince ?? now) : null,
    recoveredAt:      health === "healthy" && current.health !== "healthy" ? now : current.recoveredAt,
  };

  // Trigger failover
  if (health === "failed" && !current.activeFailover) {
    const failover = await selectFailover(provider, venueId);
    next.activeFailover = failover;
    if (failover) {
      logger.warn({ provider, venueId, failover }, "providerFailover: activating failover");
      await publish("orchestration", {
        event: "PROVIDER_FAILOVER_ACTIVATED", venueId, provider, failover,
        reason: stats ? `errorRate=${stats.errorRate.toFixed(2)} p95=${stats.p95}ms` : "unknown",
      });
    }
  }

  // Deactivate failover on recovery
  if (health === "healthy" && current.activeFailover) {
    next.activeFailover = null;
    logger.info({ provider, venueId }, "providerFailover: provider recovered, deactivating failover");
    await publish("orchestration", { event: "PROVIDER_RECOVERED", venueId, provider });
  }

  statusMap.set(key, next);

  // Persist to DB
  pool.query(
    `INSERT INTO pos_provider_health
       (provider, venue_id, health, consecutive_fails, active_failover, checked_at)
     VALUES ($1,$2,$3,$4,$5,NOW())
     ON CONFLICT (provider, venue_id) DO UPDATE SET
       health            = EXCLUDED.health,
       consecutive_fails = EXCLUDED.consecutive_fails,
       active_failover   = EXCLUDED.active_failover,
       checked_at        = NOW()`,
    [provider, venueId, health, next.consecutiveFails, next.activeFailover],
  ).catch(() => {});

  return next;
}

async function selectFailover(
  failedProvider: string,
  venueId:        string,
): Promise<string | null> {
  try {
    const { rows } = await pool.query(
      `SELECT failover_priority FROM pos_adapter_configs
       WHERE venue_id=$1 ORDER BY priority_order ASC LIMIT 1`,
      [venueId],
    );
    if (rows.length === 0) return "offline_mode";
    const priority = (rows[0] as Record<string, unknown>)["failover_priority"] as string[];
    return priority.find(p => p !== failedProvider) ?? "offline_mode";
  } catch {
    return "offline_mode";
  }
}

/** Get the active routing target (may be a failover) */
export function getActiveProvider(primary: string, venueId: string): string {
  const status = getProviderStatus(primary, venueId);
  return status.activeFailover ?? primary;
}

/** Periodic health probe — call from reconciliation worker */
export async function probeAllProviders(venueId: string): Promise<void> {
  const providers = [...statusMap.entries()]
    .filter(([k]) => k.endsWith(`:${venueId}`))
    .map(([, s]) => s.provider);

  await Promise.allSettled(providers.map(p => evaluateProvider(p, venueId)));
}
