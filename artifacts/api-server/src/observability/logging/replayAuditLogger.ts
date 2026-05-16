/**
 * replayAuditLogger — immutable log of all replay operations for forensic accountability.
 *
 * Records who triggered a replay, what was replayed, what divergences were found,
 * and what corrections were applied. Critical for compliance and debugging.
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { NODE_ID } from "../../distributed/clusterMembership";

export type ReplayAuditAction =
  | "replay_started" | "replay_completed" | "replay_failed" | "replay_cancelled"
  | "divergence_detected" | "correction_applied" | "anomaly_flagged";

export interface ReplayAuditRecord {
  replayId:   string;
  replayType: string;
  entityId:   string;
  triggeredBy:string;
  nodeId:     string;
  action:     ReplayAuditAction;
  metadata:   Record<string, unknown>;
  ts:         number;
}

export async function logReplayEvent(
  replayId:   string,
  replayType: string,
  entityId:   string,
  triggeredBy:string,
  action:     ReplayAuditAction,
  metadata:   Record<string, unknown> = {},
): Promise<void> {
  await pool.query(
    `INSERT INTO replay_audit_log
       (replay_id, replay_type, entity_id, triggered_by, node_id, action, metadata, logged_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
    [replayId, replayType, entityId, triggeredBy, NODE_ID, action, JSON.stringify(metadata)],
  ).catch(err => logger.warn({ err, replayId, action }, "replayAuditLogger: insert failed"));
}

export async function getReplayAuditLog(replayId: string): Promise<ReplayAuditRecord[]> {
  const { rows } = await pool.query(
    `SELECT * FROM replay_audit_log WHERE replay_id=$1 ORDER BY logged_at ASC`,
    [replayId],
  ).catch(() => ({ rows: [] }));
  return rows.map(r => ({
    replayId:   String((r as Record<string, unknown>)["replay_id"]),
    replayType: String((r as Record<string, unknown>)["replay_type"]),
    entityId:   String((r as Record<string, unknown>)["entity_id"]),
    triggeredBy:String((r as Record<string, unknown>)["triggered_by"]),
    nodeId:     String((r as Record<string, unknown>)["node_id"]),
    action:     String((r as Record<string, unknown>)["action"]) as ReplayAuditAction,
    metadata:   ((r as Record<string, unknown>)["metadata"] as Record<string, unknown>) ?? {},
    ts:         new Date((r as Record<string, unknown>)["logged_at"] as string).getTime(),
  }));
}

export async function getDivergenceReport(entityId: string): Promise<{
  divergences: number; corrections: number; anomalies: number;
}> {
  const { rows } = await pool.query(
    `SELECT action, COUNT(*) AS cnt FROM replay_audit_log
     WHERE entity_id=$1 AND action IN ('divergence_detected','correction_applied','anomaly_flagged')
     GROUP BY action`,
    [entityId],
  ).catch(() => ({ rows: [] }));
  const result = { divergences:0, corrections:0, anomalies:0 };
  for (const r of rows as Record<string, unknown>[]) {
    const cnt = Number(r["cnt"]);
    if (r["action"] === "divergence_detected")  result.divergences  = cnt;
    if (r["action"] === "correction_applied")   result.corrections  = cnt;
    if (r["action"] === "anomaly_flagged")      result.anomalies    = cnt;
  }
  return result;
}
