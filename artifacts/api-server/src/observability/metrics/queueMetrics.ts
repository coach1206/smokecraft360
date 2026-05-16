/**
 * queueMetrics — orchestration and distributed queue depth/throughput metrics.
 *
 * Polls queue tables every 30s and publishes gauges for:
 *   - orchestration_queue: pending, processing, failed, dead
 *   - distributed_work_items: per-queue stats
 *   - replay_jobs: pending, running, completed
 */

import { pool }              from "@workspace/db";
import { setGauge, increment } from "../../platform/observability/metricsCollector";
import { getQueueStats }     from "../../distributed/distributedQueues";

const KNOWN_QUEUES = ["venue_intelligence", "inventory_sync", "payment_retry", "replay_jobs"];

async function collectQueueMetrics(): Promise<void> {
  // Orchestration queue
  try {
    const { rows } = await pool.query(
      `SELECT status, COUNT(*) AS cnt FROM orchestration_queue GROUP BY status`,
    );
    for (const r of rows as Record<string, unknown>[]) {
      setGauge("queue.orchestration", String(r["status"]), Number(r["cnt"]));
    }
  } catch {}

  // Distributed work queues
  for (const queueName of KNOWN_QUEUES) {
    try {
      const stats = await getQueueStats(queueName);
      setGauge(`queue.${queueName}`, "pending",   stats.pending);
      setGauge(`queue.${queueName}`, "claimed",   stats.claimed);
      setGauge(`queue.${queueName}`, "failed",    stats.failed);
      setGauge(`queue.${queueName}`, "dead",      stats.dead);
    } catch {}
  }

  // Replay jobs
  try {
    const { rows } = await pool.query(
      `SELECT status, COUNT(*) AS cnt FROM replay_jobs GROUP BY status`,
    );
    for (const r of rows as Record<string, unknown>[]) {
      setGauge("queue.replay", String(r["status"]), Number(r["cnt"]));
    }
  } catch {}

  // Dead letter queue depth
  try {
    const { rows } = await pool.query(`SELECT COUNT(*) AS cnt FROM dead_letter_queue`);
    setGauge("queue", "dead_letter_depth", Number((rows[0] as Record<string, unknown>)?.["cnt"] ?? 0));
  } catch {}
}

const timer = setInterval(() => collectQueueMetrics().catch(() => {}), 30_000);
timer.unref();
collectQueueMetrics().catch(() => {});

export { collectQueueMetrics };
