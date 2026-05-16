/**
 * replayMonitor — replay backlog and performance monitoring.
 *
 * Tracks:
 *   - Pending replay job count (backlog depth)
 *   - Average replay duration
 *   - Replay failure rate
 *   - Stale/abandoned replays
 *   - Anomaly detection for backlog spikes
 */

import { pool }         from "@workspace/db";
import { logger }       from "../../lib/logger";
import { setGauge, observe } from "../../platform/observability/metricsCollector";
import { checkAnomaly }      from "./anomalyMonitor";

export interface ReplayBacklogStats {
  pending:    number;
  running:    number;
  failed:     number;
  avgDuration:number;
  oldestPendingAgeMs: number;
  ts:         number;
}

async function collectReplayMetrics(): Promise<void> {
  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='pending')   AS pending,
         COUNT(*) FILTER (WHERE status='running')   AS running,
         COUNT(*) FILTER (WHERE status='failed')    AS failed,
         AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)
           FILTER (WHERE status='completed' AND started_at IS NOT NULL) AS avg_duration_ms,
         EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) * 1000
           FILTER (WHERE status='pending') AS oldest_pending_age_ms
       FROM replay_jobs
       WHERE created_at > NOW() - INTERVAL '1 hour'`,
    );

    const r = rows[0] as Record<string, unknown>;
    const pending    = Number(r?.["pending"]   ?? 0);
    const running    = Number(r?.["running"]   ?? 0);
    const failed     = Number(r?.["failed"]    ?? 0);
    const avgDur     = Number(r?.["avg_duration_ms"] ?? 0);
    const oldestAge  = Number(r?.["oldest_pending_age_ms"] ?? 0);

    setGauge("replay.monitor", "pending",         pending);
    setGauge("replay.monitor", "running",         running);
    setGauge("replay.monitor", "failed",          failed);
    setGauge("replay.monitor", "avg_duration_ms", avgDur);
    setGauge("replay.monitor", "oldest_age_ms",   oldestAge);

    await checkAnomaly("replay.backlog", "pending_jobs", pending);

    if (oldestAge > 30 * 60_000) {
      logger.warn({ pendingCount: pending, oldestAgeMs: oldestAge }, "replayMonitor: stale replay backlog detected");
    }
  } catch {}
}

export async function getReplayBacklogStats(): Promise<ReplayBacklogStats> {
  try {
    const { rows } = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status='pending') AS pending,
         COUNT(*) FILTER (WHERE status='running') AS running,
         COUNT(*) FILTER (WHERE status='failed')  AS failed,
         AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)
           FILTER (WHERE status='completed' AND started_at IS NOT NULL) AS avg_dur,
         EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) * 1000
           FILTER (WHERE status='pending') AS oldest_age
       FROM replay_jobs`,
    );
    const r = rows[0] as Record<string, unknown>;
    return {
      pending:   Number(r?.["pending"]  ?? 0),
      running:   Number(r?.["running"]  ?? 0),
      failed:    Number(r?.["failed"]   ?? 0),
      avgDuration: Number(r?.["avg_dur"] ?? 0),
      oldestPendingAgeMs: Number(r?.["oldest_age"] ?? 0),
      ts: Date.now(),
    };
  } catch {
    return { pending:0, running:0, failed:0, avgDuration:0, oldestPendingAgeMs:0, ts:Date.now() };
  }
}

setInterval(() => collectReplayMetrics().catch(() => {}), 30_000).unref();
