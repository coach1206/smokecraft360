/**
 * cognitionLogger — structured logging for AI/cognition pipeline decisions.
 *
 * Captures decision trails for:
 *   - Recommendation generation (why was X recommended?)
 *   - Orchestration rule evaluation (why did rule Y fire?)
 *   - Context interpretation (what signals drove this context?)
 *   - AI governance overrides (what was blocked and why?)
 *
 * Output: structured JSON to pino logger + async append to cognition_decisions table.
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";

export type CognitionDecisionType =
  | "recommendation_generated" | "recommendation_blocked" | "rule_fired"
  | "rule_skipped" | "context_interpreted" | "confidence_gated"
  | "autonomous_approved" | "autonomous_blocked" | "memory_updated"
  | "twin_divergence" | "environmental_shift";

export interface CognitionDecision {
  venueId:      string;
  decisionType: CognitionDecisionType;
  entityId?:    string;
  confidence?:  number;
  inputs:       Record<string, unknown>;
  output:       Record<string, unknown>;
  reasoning:    string;
  durationMs:   number;
  ts:           number;
}

export async function logCognitionDecision(decision: CognitionDecision): Promise<void> {
  // Structured log entry for real-time observability
  logger.info({
    cognition: true,
    venueId:      decision.venueId,
    decisionType: decision.decisionType,
    entityId:     decision.entityId,
    confidence:   decision.confidence,
    durationMs:   decision.durationMs,
    reasoning:    decision.reasoning,
  }, `cognition: ${decision.decisionType}`);

  // Async DB append for forensic trail
  pool.query(
    `INSERT INTO cognition_decisions
       (venue_id, decision_type, entity_id, confidence, inputs, output, reasoning, duration_ms, decided_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
    [
      decision.venueId, decision.decisionType, decision.entityId ?? null,
      decision.confidence ?? null,
      JSON.stringify(decision.inputs), JSON.stringify(decision.output),
      decision.reasoning, decision.durationMs,
    ],
  ).catch(() => {}); // fire and forget
}

export async function getCognitionDecisions(
  venueId: string,
  type?:   CognitionDecisionType,
  limit  = 50,
): Promise<CognitionDecision[]> {
  const params: unknown[] = [venueId, limit];
  let sql = `SELECT * FROM cognition_decisions WHERE venue_id=$1`;
  if (type) { sql += ` AND decision_type=$3`; params.push(type); }
  sql += ` ORDER BY decided_at DESC LIMIT $2`;

  const { rows } = await pool.query(sql, params).catch(() => ({ rows: [] }));
  return (rows as Record<string, unknown>[]).map(r => ({
    venueId:      String(r["venue_id"]),
    decisionType: String(r["decision_type"]) as CognitionDecisionType,
    entityId:     r["entity_id"] ? String(r["entity_id"]) : undefined,
    confidence:   r["confidence"] ? Number(r["confidence"]) : undefined,
    inputs:       (r["inputs"]  as Record<string, unknown>) ?? {},
    output:       (r["output"]  as Record<string, unknown>) ?? {},
    reasoning:    String(r["reasoning"]),
    durationMs:   Number(r["duration_ms"]),
    ts:           new Date(r["decided_at"] as string).getTime(),
  }));
}
