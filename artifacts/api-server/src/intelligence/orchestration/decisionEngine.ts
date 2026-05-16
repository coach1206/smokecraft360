/**
 * decisionEngine — transforms VenueContext + rule actions into persisted decisions.
 *
 * Each decision gets a confidence score, is written to orchestration_decisions,
 * and published to the orchestration pgPubSub channel.
 */

import { pool } from "@workspace/db";
import { pgPubSub } from "../../realtime/pgPubSub";
import { logger } from "../../lib/logger";
import { evaluateRules, type VenueContext, type OrchestrationAction } from "./ruleEngine";
import { checkGuardrails } from "../safety/automationGuardrails";

export interface Decision {
  id:         string;
  venueId:    string;
  actions:    OrchestrationAction[];
  confidence: number;
  trigger:    string;
  status:     "applied" | "blocked" | "pending_approval";
  guardHit:   boolean;
  guardReason?:string;
}

export async function makeDecision(
  ctx:          VenueContext,
  triggerType:  string,
  triggerPayload: Record<string, unknown> = {},
): Promise<Decision | null> {
  // 1. Check guardrails before evaluating
  const guard = await checkGuardrails(ctx.venueId);
  if (guard.blocked) {
    logger.info({ venueId: ctx.venueId, reason: guard.reason }, "decisionEngine: blocked by guardrail");
    return null;
  }

  // 2. Evaluate rules
  const actions = await evaluateRules(ctx);
  if (actions.length === 0) return null;

  // 3. Compute aggregate confidence
  const confidence = actions.reduce((sum, a) => sum + a.confidence, 0) / actions.length;

  // 4. Check if approval required
  const requiresApproval = confidence >= (guard.requireApprovalAbove ?? 0.95);
  const status = requiresApproval ? "pending_approval" : "applied";

  // 5. Persist decision
  let decisionId: string;
  try {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO orchestration_decisions
         (venue_id, trigger_type, trigger_payload, actions, confidence, status,
          applied_at, guard_hit, guard_reason)
       VALUES ($1,$2,$3,$4,$5,$6,$7,false,null)
       RETURNING id`,
      [
        ctx.venueId,
        triggerType,
        JSON.stringify(triggerPayload),
        JSON.stringify(actions),
        confidence,
        status,
        status === "applied" ? new Date() : null,
      ],
    );
    decisionId = rows[0]!.id;
  } catch (err) {
    logger.warn({ err }, "decisionEngine: failed to persist decision");
    return null;
  }

  // 6. Publish
  await pgPubSub.publish("orchestration", {
    event:      "DECISION_MADE",
    venueId:    ctx.venueId,
    decisionId,
    trigger:    triggerType,
    status,
    confidence,
    actions:    actions.map((a) => ({ type: a.type, priority: a.priority })),
  });

  // 7. Write audit log
  try {
    await pool.query(
      `INSERT INTO orchestration_audit_logs
         (venue_id, entity_type, entity_id, action, actor, after, metadata)
       VALUES ($1,'decision',$2,$3,'system',$4,$5)`,
      [
        ctx.venueId,
        decisionId,
        `DECISION_${status.toUpperCase()}`,
        JSON.stringify({ confidence, actionCount: actions.length }),
        JSON.stringify({ trigger: triggerType }),
      ],
    );
  } catch { /* non-critical */ }

  logger.info(
    { venueId: ctx.venueId, decisionId, status, confidence: confidence.toFixed(2), actionCount: actions.length },
    "decisionEngine: decision made",
  );

  return {
    id: decisionId,
    venueId: ctx.venueId,
    actions,
    confidence,
    trigger: triggerType,
    status,
    guardHit: false,
  };
}

export async function rollbackDecision(
  decisionId: string,
  venueId:    string,
  reason:     string,
  operatorId?:string,
): Promise<void> {
  try {
    await pool.query(
      `UPDATE orchestration_decisions
       SET status = 'rolled_back', rolled_back_at = NOW(),
           rollback_reason = $1, operator_override = $2, override_by = $3
       WHERE id = $4 AND venue_id = $5`,
      [reason, !!operatorId, operatorId ?? null, decisionId, venueId],
    );
    await pool.query(
      `INSERT INTO orchestration_audit_logs
         (venue_id, entity_type, entity_id, action, actor, actor_id,
          is_operator_override, is_rollback, metadata)
       VALUES ($1,'decision',$2,'ROLLBACK',$3,$4,$5,true,$6)`,
      [
        venueId, decisionId,
        operatorId ? "operator" : "system",
        operatorId ?? null,
        !!operatorId,
        JSON.stringify({ reason }),
      ],
    );
    await pgPubSub.publish("orchestration", {
      event: "DECISION_ROLLED_BACK",
      venueId, decisionId, reason,
    });
    logger.info({ venueId, decisionId, reason }, "decisionEngine: decision rolled back");
  } catch (err) {
    logger.warn({ err }, "decisionEngine: rollback failed");
  }
}
