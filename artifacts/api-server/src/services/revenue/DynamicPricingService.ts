/**
 * DynamicPricingService — Pricing Intelligence Layer.
 *
 * Resolves effective price for any plan + venue combination by applying
 * a priority-ordered rule stack:
 *   1. Enterprise custom pricing (highest priority)
 *   2. Active promotion for this specific venue
 *   3. Regional pricing rule
 *   4. Seasonal multiplier
 *   5. Volume discount
 *   6. Base plan price (fallback)
 *
 * Changes propagate instantly — no cache layer between rules and resolution.
 * Super Admin CRUD: create/update/deactivate pricing rules.
 */

import { pool } from "@workspace/db";

export interface PricingRule {
  id:             string;
  planId:         string;
  ruleType:       "override" | "seasonal" | "regional" | "promo" | "enterprise" | "volume";
  targetEntityId?: string;
  priceCents?:    number;
  multiplier?:    number;
  validFrom?:     string;
  validUntil?:    string;
  isActive:       boolean;
  createdBy?:     string;
  notes?:         string;
}

export interface EffectivePrice {
  planId:         string;
  baseCents:      number;
  effectiveCents: number;
  discountCents:  number;
  discountPct:    number;
  appliedRule:    string | null;
  ruleType:       string | null;
}

export class DynamicPricingService {

  static async resolve(planId: string, venueId?: string, regionCode?: string): Promise<EffectivePrice> {
    const { rows: planRows } = await pool.query<{ base_price_cents: number }>(
      `SELECT base_price_cents FROM revenue_plans WHERE id = $1 AND is_active = true`,
      [planId],
    ).catch(() => ({ rows: [] as { base_price_cents: number }[] }));

    const base = planRows[0]?.base_price_cents ?? 0;

    const now = new Date().toISOString();
    const { rows: rules } = await pool.query<{
      id: string; rule_type: string; target_entity_id: string | null;
      price_cents: number | null; multiplier: number | null; notes: string | null;
    }>(
      `SELECT id, rule_type, target_entity_id, price_cents, multiplier, notes
       FROM dynamic_pricing_rules
       WHERE plan_id = $1
         AND is_active = true
         AND (valid_from IS NULL OR valid_from <= $2)
         AND (valid_until IS NULL OR valid_until >= $2)
       ORDER BY
         CASE rule_type
           WHEN 'enterprise' THEN 1
           WHEN 'override'   THEN 2
           WHEN 'promo'      THEN 3
           WHEN 'regional'   THEN 4
           WHEN 'seasonal'   THEN 5
           WHEN 'volume'     THEN 6
           ELSE 7
         END
       LIMIT 10`,
      [planId, now],
    ).catch(() => ({ rows: [] as { id: string; rule_type: string; target_entity_id: string | null; price_cents: number | null; multiplier: number | null; notes: string | null }[] }));

    let effectiveCents = base;
    let appliedRule:  string | null = null;
    let ruleType:     string | null = null;

    for (const rule of rules) {
      const entityMatch = !rule.target_entity_id
        || rule.target_entity_id === venueId
        || rule.target_entity_id === regionCode;

      if (!entityMatch) continue;

      if (rule.price_cents !== null) {
        effectiveCents = rule.price_cents;
      } else if (rule.multiplier !== null) {
        effectiveCents = Math.round(base * rule.multiplier);
      }

      appliedRule = rule.id;
      ruleType    = rule.rule_type;
      break;
    }

    const discountCents = base - effectiveCents;
    return {
      planId,
      baseCents:      base,
      effectiveCents: Math.max(0, effectiveCents),
      discountCents:  Math.max(0, discountCents),
      discountPct:    base > 0 ? Math.round((discountCents / base) * 100) : 0,
      appliedRule,
      ruleType,
    };
  }

  static async createRule(rule: Omit<PricingRule, "id">): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO dynamic_pricing_rules
         (plan_id, rule_type, target_entity_id, price_cents, multiplier, valid_from, valid_until, is_active, created_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        rule.planId, rule.ruleType, rule.targetEntityId ?? null,
        rule.priceCents ?? null, rule.multiplier ?? null,
        rule.validFrom ?? null, rule.validUntil ?? null,
        rule.isActive, rule.createdBy ?? null, rule.notes ?? null,
      ],
    );
    return rows[0]!.id;
  }

  static async deactivateRule(ruleId: string): Promise<void> {
    await pool.query(`UPDATE dynamic_pricing_rules SET is_active = false WHERE id = $1`, [ruleId]);
  }

  static async listRules(planId?: string): Promise<PricingRule[]> {
    const { rows } = await pool.query<{
      id: string; plan_id: string; rule_type: string; target_entity_id: string | null;
      price_cents: number | null; multiplier: number | null; valid_from: string | null;
      valid_until: string | null; is_active: boolean; created_by: string | null; notes: string | null;
    }>(
      planId
        ? `SELECT * FROM dynamic_pricing_rules WHERE plan_id = $1 ORDER BY created_at DESC`
        : `SELECT * FROM dynamic_pricing_rules ORDER BY created_at DESC LIMIT 100`,
      planId ? [planId] : [],
    ).catch(() => ({ rows: [] as never[] }));

    return rows.map(r => ({
      id:             r.id,
      planId:         r.plan_id,
      ruleType:       r.rule_type as PricingRule["ruleType"],
      targetEntityId: r.target_entity_id ?? undefined,
      priceCents:     r.price_cents ?? undefined,
      multiplier:     r.multiplier ?? undefined,
      validFrom:      r.valid_from ?? undefined,
      validUntil:     r.valid_until ?? undefined,
      isActive:       r.is_active,
      createdBy:      r.created_by ?? undefined,
      notes:          r.notes ?? undefined,
    }));
  }
}
