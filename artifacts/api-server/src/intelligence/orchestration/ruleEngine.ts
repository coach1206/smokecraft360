/**
 * ruleEngine — configurable if/then orchestration rule evaluator.
 *
 * Rules are stored in orchestration_rules and evaluated against a VenueContext.
 * Matching rules produce Action objects that the orchestrationEngine applies.
 */

import { pool } from "@workspace/db";
import { logger } from "../../lib/logger";

export interface VenueContext {
  venueId:          string;
  activeGuests:     number;
  activeSessions:   number;
  vipCount:         number;
  engagementLevel:  number;
  socialEnergy:     number;
  moodScore:        number;
  operationalLoad:  number;
  inventoryPressure:number;
  revenueMomentum:  number;
  ambientScene:     string | null;
  trafficTrend:     string;
  anomalyDetected:  boolean;
}

export interface OrchestrationAction {
  type:       string;
  payload:    Record<string, unknown>;
  priority:   number;
  confidence: number;
}

interface RuleRow {
  id:               string;
  name:             string;
  trigger_type:     string;
  conditions:       Record<string, unknown>;
  actions:          Record<string, unknown>[];
  priority:         number;
  confidence_min:   string;
  cooldown_seconds: string;
  max_fires_per_hour: string;
  last_fired_at:    Date | null;
  fire_count:       string;
}

type ConditionOp = "gt" | "lt" | "gte" | "lte" | "eq" | "neq" | "in" | "contains";

interface Condition {
  field:    keyof VenueContext;
  op:       ConditionOp;
  value:    unknown;
}

function evaluateCondition(ctx: VenueContext, cond: Condition): boolean {
  const actual = ctx[cond.field] as unknown;
  switch (cond.op) {
    case "gt":       return (actual as number) > (cond.value as number);
    case "lt":       return (actual as number) < (cond.value as number);
    case "gte":      return (actual as number) >= (cond.value as number);
    case "lte":      return (actual as number) <= (cond.value as number);
    case "eq":       return actual === cond.value;
    case "neq":      return actual !== cond.value;
    case "in":       return Array.isArray(cond.value) && cond.value.includes(actual);
    case "contains": return typeof actual === "string" && actual.includes(cond.value as string);
    default:         return false;
  }
}

function matchesConditions(
  ctx:        VenueContext,
  conditions: Record<string, unknown>,
): boolean {
  const list = (conditions["and"] ?? conditions["conditions"] ?? []) as Condition[];
  if (!Array.isArray(list) || list.length === 0) return true;
  return list.every((c) => evaluateCondition(ctx, c));
}

function isOnCooldown(rule: RuleRow): boolean {
  if (!rule.last_fired_at) return false;
  const cooldownMs = parseInt(rule.cooldown_seconds, 10) * 1000;
  return Date.now() - rule.last_fired_at.getTime() < cooldownMs;
}

export async function evaluateRules(ctx: VenueContext): Promise<OrchestrationAction[]> {
  let rules: RuleRow[];
  try {
    const { rows } = await pool.query<RuleRow>(
      `SELECT id, name, trigger_type, conditions, actions, priority,
              confidence_min, cooldown_seconds, max_fires_per_hour,
              last_fired_at, fire_count
       FROM orchestration_rules
       WHERE venue_id = $1 AND is_enabled = true
       ORDER BY priority DESC`,
      [ctx.venueId],
    );
    rules = rows;
  } catch (err) {
    logger.warn({ err }, "ruleEngine: failed to load rules");
    return [];
  }

  const actions: OrchestrationAction[] = [];

  for (const rule of rules) {
    if (isOnCooldown(rule)) continue;
    if (!matchesConditions(ctx, rule.conditions)) continue;

    const confidence = computeConfidence(ctx, rule);
    if (confidence < parseFloat(rule.confidence_min)) continue;

    for (const rawAction of rule.actions) {
      actions.push({
        type:       (rawAction["type"] as string) ?? "UNKNOWN",
        payload:    (rawAction["payload"] as Record<string, unknown>) ?? {},
        priority:   rule.priority,
        confidence,
      });
    }

    // Update fire tracking
    try {
      await pool.query(
        `UPDATE orchestration_rules
         SET last_fired_at = NOW(), fire_count = fire_count + 1, updated_at = NOW()
         WHERE id = $1`,
        [rule.id],
      );
    } catch { /* non-critical */ }
  }

  // Sort by priority desc
  return actions.sort((a, b) => b.priority - a.priority);
}

function computeConfidence(ctx: VenueContext, rule: RuleRow): number {
  let score = 0.7;
  if (ctx.activeGuests > 5)    score += 0.05;
  if (ctx.engagementLevel > 0.7) score += 0.1;
  if (ctx.vipCount > 0)        score += 0.1;
  if (ctx.socialEnergy > 0.6)  score += 0.05;
  if (ctx.anomalyDetected)     score -= 0.3;
  return Math.min(1.0, Math.max(0.0, score));
}

export async function createDefaultRules(venueId: string): Promise<void> {
  const defaults = [
    {
      name: "VIP Guest Detection — Premium Scene",
      triggerType: "VIP_DETECTED",
      conditions: { and: [{ field: "vipCount", op: "gt", value: 0 }] },
      actions: [
        { type: "ACTIVATE_AMBIENT_SCENE", payload: { sceneId: "premium-lounge", intensity: 0.9 } },
        { type: "NOTIFY_STAFF", payload: { message: "VIP guest detected — premium service mode", urgency: "high" } },
        { type: "BOOST_RECOMMENDATIONS", payload: { category: "whiskey", boost: 0.3 } },
        { type: "INCREASE_PAIRING_VISIBILITY", payload: { premium: true } },
      ],
      priority: 90,
      confidenceMin: 0.7,
      cooldownSeconds: 600,
    },
    {
      name: "Low Engagement — Ambient Shift",
      triggerType: "LOW_ENGAGEMENT",
      conditions: { and: [
        { field: "engagementLevel", op: "lt", value: 0.3 },
        { field: "activeGuests",    op: "gt", value: 0 },
      ]},
      actions: [
        { type: "ACTIVATE_AMBIENT_SCENE", payload: { sceneId: "energize", intensity: 0.7 } },
        { type: "INCREASE_UPSELL_PRESSURE", payload: { delta: 0.2, maxPressure: 0.7 } },
        { type: "SEND_PUSH_RECOMMENDATION", payload: { style: "bold" } },
      ],
      priority: 70,
      confidenceMin: 0.6,
      cooldownSeconds: 900,
    },
    {
      name: "High Social Energy — Communal Scene",
      triggerType: "HIGH_SOCIAL",
      conditions: { and: [{ field: "socialEnergy", op: "gt", value: 0.75 }] },
      actions: [
        { type: "ACTIVATE_AMBIENT_SCENE", payload: { sceneId: "social-lounge", intensity: 0.8 } },
        { type: "PROMOTE_GROUP_PAIRINGS", payload: { enabled: true } },
      ],
      priority: 60,
      confidenceMin: 0.65,
      cooldownSeconds: 1200,
    },
    {
      name: "Inventory Pressure — Menu Rebalance",
      triggerType: "INVENTORY_PRESSURE",
      conditions: { and: [{ field: "inventoryPressure", op: "gt", value: 0.8 }] },
      actions: [
        { type: "REWEIGHT_RECOMMENDATIONS", payload: { strategy: "availability-first" } },
        { type: "ALERT_OPERATIONS", payload: { message: "Low inventory detected — recommendations adjusted" } },
      ],
      priority: 80,
      confidenceMin: 0.6,
      cooldownSeconds: 1800,
    },
  ];

  for (const rule of defaults) {
    try {
      await pool.query(
        `INSERT INTO orchestration_rules
           (venue_id, name, trigger_type, conditions, actions, priority,
            confidence_min, cooldown_seconds, is_enabled)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true)
         ON CONFLICT DO NOTHING`,
        [
          venueId,
          rule.name,
          rule.triggerType,
          JSON.stringify(rule.conditions),
          JSON.stringify(rule.actions),
          rule.priority,
          rule.confidenceMin,
          rule.cooldownSeconds,
        ],
      );
    } catch { /* non-critical */ }
  }
}
