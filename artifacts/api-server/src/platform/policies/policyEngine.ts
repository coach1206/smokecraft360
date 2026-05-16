/**
 * policyEngine — evaluates operational policies before actions are executed.
 *
 * Separates RULES from LOGIC. Instead of hardcoding business rules inside
 * services, services call `policyEngine.evaluate(action, context)` and
 * receive ALLOW/DENY/REQUIRE_APPROVAL with reasoning.
 *
 * Policy evaluation chain:
 *   1. Safety policies (checked first — can block everything)
 *   2. Operational policies (revenue, inventory, staff)
 *   3. Venue-specific policies (loaded from DB overrides)
 *   4. AI governance policies (constrain autonomous actions)
 *   5. Compliance policies (regulatory)
 *
 * Returns the MOST RESTRICTIVE result across all matching policies.
 */

import { logger }      from "../../lib/logger";
import { isEnabled, getFlagValue } from "../featureFlags/featureFlagEngine";

export type PolicyDecision = "allow" | "deny" | "require_approval";
export type PolicyDomain   = "safety" | "inventory" | "payment" | "ai" | "staff" | "venue" | "compliance";

export interface PolicyContext {
  venueId:      string;
  actorId:      string;
  actorRole:    string;
  action:       string;
  resource?:    string;
  resourceId?:  string;
  metadata?:    Record<string, unknown>;
}

export interface PolicyResult {
  decision:   PolicyDecision;
  policyKey:  string;
  reason:     string;
  conditions: string[];
  ts:         number;
}

export interface PolicyDefinition {
  key:        string;
  domain:     PolicyDomain;
  description:string;
  evaluate:   (ctx: PolicyContext) => PolicyResult | null;  // null = abstain
}

// ─── Built-in policies ────────────────────────────────────────────────────────

const POLICIES: PolicyDefinition[] = [

  // Safety
  {
    key: "safety.kill_switch",
    domain: "safety",
    description: "Blocks all autonomous actions when kill switch is active",
    evaluate: (ctx) => {
      if (!isEnabled("safety.kill_switch")) return null;
      return { decision:"deny", policyKey:"safety.kill_switch", reason:"Global kill switch is active", conditions:[], ts:Date.now() };
    },
  },
  {
    key: "safety.readonly_mode",
    domain: "safety",
    description: "Blocks all write actions in readonly mode",
    evaluate: (ctx) => {
      if (!isEnabled("safety.readonly_mode")) return null;
      const isWrite = ["create","update","delete","refund","transfer","mutate"].some(w => ctx.action.includes(w));
      if (!isWrite) return null;
      return { decision:"deny", policyKey:"safety.readonly_mode", reason:"System is in readonly mode", conditions:[], ts:Date.now() };
    },
  },

  // AI governance
  {
    key: "ai.confidence_gate",
    domain: "ai",
    description: "Blocks AI autonomous actions below confidence threshold",
    evaluate: (ctx) => {
      if (!ctx.action.startsWith("ai.")) return null;
      const threshold = getFlagValue("ai.confidence_threshold") as number;
      const confidence = ctx.metadata?.["confidence"] as number | undefined;
      if (confidence === undefined) return null;
      if (confidence < threshold) {
        return { decision:"require_approval", policyKey:"ai.confidence_gate", reason:`AI confidence ${confidence.toFixed(2)} below threshold ${threshold}`, conditions:["human_review_required"], ts:Date.now() };
      }
      return null;
    },
  },
  {
    key: "ai.autonomous_gate",
    domain: "ai",
    description: "Requires human approval for fully autonomous actions unless flag enabled",
    evaluate: (ctx) => {
      if (!ctx.action.startsWith("ai.autonomous")) return null;
      if (isEnabled("orchestration.autonomous.enabled", ctx.venueId)) return null;
      return { decision:"require_approval", policyKey:"ai.autonomous_gate", reason:"Autonomous orchestration not enabled for this venue", conditions:["venue_admin_approval"], ts:Date.now() };
    },
  },

  // Inventory
  {
    key: "inventory.large_adjustment",
    domain: "inventory",
    description: "Requires manager approval for large stock adjustments",
    evaluate: (ctx) => {
      if (ctx.action !== "inventory.adjust") return null;
      const delta = Math.abs(ctx.metadata?.["delta"] as number ?? 0);
      if (delta <= 20) return null;
      if (["manager","venue_owner","super_admin"].includes(ctx.actorRole)) return null;
      return { decision:"require_approval", policyKey:"inventory.large_adjustment", reason:`Stock adjustment of ${delta} units requires manager approval`, conditions:["manager_approval"], ts:Date.now() };
    },
  },

  // Payment
  {
    key: "payment.large_refund",
    domain: "payment",
    description: "Requires manager approval for refunds over $100",
    evaluate: (ctx) => {
      if (ctx.action !== "payment.refund") return null;
      const amountCents = ctx.metadata?.["amountCents"] as number ?? 0;
      if (amountCents <= 10_000) return null;
      if (["venue_owner","super_admin"].includes(ctx.actorRole)) return null;
      return { decision:"require_approval", policyKey:"payment.large_refund", reason:`Refund of $${(amountCents/100).toFixed(2)} requires owner approval`, conditions:["owner_approval"], ts:Date.now() };
    },
  },
  {
    key: "payment.void_timeout",
    domain: "payment",
    description: "Blocks void of authorized payments beyond configured timeout",
    evaluate: (ctx) => {
      if (ctx.action !== "payment.void") return null;
      const authorizedAtMs = ctx.metadata?.["authorizedAtMs"] as number | undefined;
      if (!authorizedAtMs) return null;
      const timeoutH  = getFlagValue("payments.auto_void_timeout_h") as number;
      const ageH      = (Date.now() - authorizedAtMs) / 3_600_000;
      if (ageH < timeoutH) return null;
      if (["venue_owner","super_admin"].includes(ctx.actorRole)) return null;
      return { decision:"require_approval", policyKey:"payment.void_timeout", reason:`Payment authorized ${ageH.toFixed(1)}h ago — void requires owner sign-off`, conditions:["owner_approval"], ts:Date.now() };
    },
  },

  // Staff
  {
    key: "staff.handoff_approval",
    domain: "staff",
    description: "Emergency staff reassignments require manager approval",
    evaluate: (ctx) => {
      if (ctx.action !== "staff.handoff") return null;
      const reason = ctx.metadata?.["reason"] as string ?? "";
      if (reason !== "emergency") return null;
      if (["manager","venue_owner","super_admin"].includes(ctx.actorRole)) return null;
      return { decision:"require_approval", policyKey:"staff.handoff_approval", reason:"Emergency handoff requires manager on-call", conditions:["manager_approval"], ts:Date.now() };
    },
  },
];

// ─── Engine ───────────────────────────────────────────────────────────────────

const policyMap = new Map<string, PolicyDefinition>(POLICIES.map(p => [p.key, p]));

// Venue-specific policy overrides (loaded from DB)
const venueOverrides = new Map<string, Partial<PolicyDefinition>>();

export function evaluate(ctx: PolicyContext): PolicyResult {
  const results: PolicyResult[] = [];

  for (const policy of POLICIES) {
    try {
      const result = policy.evaluate(ctx);
      if (result) results.push(result);
    } catch (err) {
      logger.warn({ err, policyKey: policy.key }, "policyEngine: policy evaluation threw");
    }
  }

  if (results.length === 0) {
    return { decision:"allow", policyKey:"default", reason:"No applicable policies", conditions:[], ts:Date.now() };
  }

  // Most restrictive: deny > require_approval > allow
  const denied  = results.find(r => r.decision === "deny");
  if (denied)   return denied;

  const approval = results.find(r => r.decision === "require_approval");
  if (approval) return approval;

  return results[0]!;
}

export function isAllowed(ctx: PolicyContext): boolean {
  return evaluate(ctx).decision === "allow";
}

export function getAllPolicies(): PolicyDefinition[] {
  return POLICIES;
}

export function getPoliciesByDomain(domain: PolicyDomain): PolicyDefinition[] {
  return POLICIES.filter(p => p.domain === domain);
}

/** Register a custom policy at runtime (e.g. loaded from DB) */
export function registerPolicy(policy: PolicyDefinition): void {
  POLICIES.push(policy);
  policyMap.set(policy.key, policy);
  logger.info({ key: policy.key, domain: policy.domain }, "policyEngine: custom policy registered");
}
