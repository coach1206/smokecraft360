/**
 * orchestrationPolicies — operational safety policies for autonomous actions.
 *
 * Policies govern what the orchestration engine is allowed to do autonomously
 * vs what requires human approval. Each policy checks pre-conditions and
 * post-conditions before and after an action is executed.
 */

import { logger }     from "../lib/logger";
import { increment }  from "../platform/observability/metricsCollector";
import { evaluate, type PolicyContext as EnginePolicyContext } from "../platform/policies/policyEngine";

export type OrchestrationAction =
  | "send_staff_alert" | "modify_menu_visibility" | "trigger_reorder"
  | "adjust_pricing" | "flag_inventory" | "lock_venue_access"
  | "emit_broadcast" | "update_recommendations" | "clear_session"
  | "emergency_shutdown";

export interface PolicyContext {
  venueId:    string;
  actorId:    string;
  actorRole:  string;
  action:     OrchestrationAction;
  parameters: Record<string, unknown>;
  confidence: number;
}

export interface PolicyDecision {
  allowed:    boolean;
  reason:     string;
  requiresApproval: boolean;
  approverRole?:    string;
  auditRequired:    boolean;
}

// Risk tiers for actions
const ACTION_RISK: Record<OrchestrationAction, "low"|"medium"|"high"|"critical"> = {
  send_staff_alert:        "low",
  emit_broadcast:          "low",
  update_recommendations:  "low",
  flag_inventory:          "medium",
  trigger_reorder:         "medium",
  modify_menu_visibility:  "medium",
  adjust_pricing:          "high",
  clear_session:           "high",
  lock_venue_access:       "critical",
  emergency_shutdown:      "critical",
};

// Minimum confidence thresholds per risk tier
const CONFIDENCE_THRESHOLDS: Record<string, number> = {
  low:      0.50,
  medium:   0.70,
  high:     0.85,
  critical: 0.95,
};

// Actions that always require human approval regardless of confidence
const ALWAYS_REQUIRE_APPROVAL = new Set<OrchestrationAction>([
  "lock_venue_access", "emergency_shutdown", "adjust_pricing",
]);

// Roles that can approve each risk tier
const APPROVAL_ROLES: Record<string, string> = {
  low:      "manager",
  medium:   "venue_admin",
  high:     "admin",
  critical: "super_admin",
};

export function evaluateOrchestrationPolicy(ctx: PolicyContext): PolicyDecision {
  const risk       = ACTION_RISK[ctx.action] ?? "high";
  const threshold  = CONFIDENCE_THRESHOLDS[risk] ?? 0.90;
  const needsApproval = ALWAYS_REQUIRE_APPROVAL.has(ctx.action);

  // Low confidence — block autonomous action
  if (ctx.confidence < threshold) {
    increment("governance.policies", "low_confidence_blocks", 1, { action: ctx.action });
    return {
      allowed:          false,
      reason:           `Confidence ${ctx.confidence.toFixed(2)} below threshold ${threshold} for ${risk}-risk action`,
      requiresApproval: false,
      auditRequired:    true,
    };
  }

  // Check policy engine for additional governance rules
  const engineCtx: EnginePolicyContext = {
    venueId:   ctx.venueId,
    actorId:   ctx.actorId,
    actorRole: ctx.actorRole,
    action:    ctx.action,
    metadata:  { confidence: ctx.confidence, risk, parameters: ctx.parameters },
  };

  const policyResult = evaluate(engineCtx);

  if (policyResult.decision === "deny") {
    increment("governance.policies", "policy_blocks", 1, { action: ctx.action, policy: policyResult.policyKey });
    return {
      allowed:          false,
      reason:           policyResult.reason,
      requiresApproval: false,
      auditRequired:    true,
    };
  }

  // High-risk actions need human approval
  if (needsApproval || risk === "critical" || policyResult.decision === "require_approval") {
    increment("governance.policies", "approval_required", 1, { action: ctx.action });
    return {
      allowed:          false,
      reason:           `Action '${ctx.action}' requires human approval`,
      requiresApproval: true,
      approverRole:     APPROVAL_ROLES[risk],
      auditRequired:    true,
    };
  }

  increment("governance.policies", "allowed", 1, { action: ctx.action });
  logger.debug({ action: ctx.action, venueId: ctx.venueId, confidence: ctx.confidence }, "orchestrationPolicies: action allowed");

  return { allowed: true, reason: "policy_check_passed", requiresApproval: false, auditRequired: risk !== "low" };
}

export function getActionRisk(action: OrchestrationAction): string {
  return ACTION_RISK[action] ?? "high";
}

export function getConfidenceThreshold(action: OrchestrationAction): number {
  const risk = ACTION_RISK[action] ?? "high";
  return CONFIDENCE_THRESHOLDS[risk] ?? 0.90;
}
