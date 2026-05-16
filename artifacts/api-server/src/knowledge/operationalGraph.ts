/**
 * operationalGraph — maps relationships between operational states,
 * orchestration decisions, staff actions, and outcomes.
 */

import { RelationshipGraph } from "./relationshipGraph";
import { logger }            from "../lib/logger";
import { pool }              from "@workspace/db";

export const operationalGraph = new RelationshipGraph("operational");

export function recordOrchestrationDecision(
  ruleId:    string,
  ruleName:  string,
  trigger:   string,
  actions:   string[],
  outcome:   "success" | "partial" | "failure",
  venueId:   string,
): void {
  operationalGraph.upsertNode(ruleId, "orchestration", ruleName, { venueId });
  operationalGraph.upsertNode(trigger, "orchestration", trigger);

  const weight = outcome === "success" ? 0.9 : outcome === "partial" ? 0.5 : 0.1;
  operationalGraph.addEdge(trigger, ruleId, "activates",        weight);
  operationalGraph.addEdge(ruleId,  trigger, "responds_to",     weight);

  for (const action of actions) {
    operationalGraph.upsertNode(action, "orchestration", action);
    operationalGraph.addEdge(ruleId, action, "produces", weight);
  }
}

export function recordStaffAction(
  staffId:  string,
  action:   string,
  context:  string,
  success:  boolean,
): void {
  operationalGraph.upsertNode(staffId, "staff", `staff:${staffId.slice(0, 8)}`);
  operationalGraph.upsertNode(action,  "orchestration", action);
  operationalGraph.upsertNode(context, "orchestration", context);

  operationalGraph.addEdge(staffId, action,  "performed", success ? 0.9 : 0.3);
  operationalGraph.addEdge(action,  context, "occurred_in", 1.0);
}

export function getEffectiveActions(trigger: string, limit = 5): string[] {
  return operationalGraph.neighbors(trigger, "activates")
    .slice(0, limit)
    .map(n => n.label);
}

export function getRuleSuccessChain(ruleId: string): string[] {
  return operationalGraph.neighbors(ruleId, "produces").map(n => n.label);
}

export async function loadFromDB(venueId: string): Promise<void> {
  try {
    const { rows } = await pool.query(
      `SELECT rule_id::text, action_type, trigger_event, outcome
       FROM orchestration_audit_logs
       WHERE venue_id = $1 AND rule_id IS NOT NULL
       ORDER BY created_at DESC LIMIT 1000`,
      [venueId],
    );
    for (const r of rows) {
      if (!r.rule_id) continue;
      recordOrchestrationDecision(
        r.rule_id, r.action_type, r.trigger_event ?? "unknown",
        [r.action_type], r.outcome as "success" | "partial" | "failure", venueId,
      );
    }
    logger.info({ venueId, ...operationalGraph.stats() }, "operationalGraph: loaded from DB");
  } catch (err) {
    logger.warn({ err }, "operationalGraph: load failed (non-fatal)");
  }
}
