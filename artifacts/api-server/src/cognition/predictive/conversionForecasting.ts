/**
 * conversionForecasting — estimates conversion probability and upsell
 * forecast for the current operational window.
 *
 * Inputs: engagement forecast, AI memory acceptance rates, temporal patterns,
 *         inventory pressure, staff capacity.
 *
 * Output: per-craft conversion probabilities + upsell revenue forecast.
 */

import { pool }             from "@workspace/db";
import { logger }           from "../../lib/logger";
import { aggregateContext } from "../context/contextAggregator";

export interface ConversionForecast {
  venueId:          string;
  ts:               number;
  overallProbability:number;    // 0–1
  byCategory:       CategoryConversion[];
  estimatedRevenue: number;     // cents
  upsellOpportunities: UpsellOpportunity[];
  confidence:       number;
  windowMinutes:    number;
}

export interface CategoryConversion {
  craft:       string;
  probability: number;
  avgValue:    number;    // cents
  volume:      number;    // expected orders
}

export interface UpsellOpportunity {
  type:        string;
  probability: number;
  revenueImpact: number;
  trigger:     string;
}

const CRAFTS = ["smoke", "pour", "brew", "vape"] as const;

export async function forecastConversions(
  venueId:       string,
  windowMinutes = 30,
): Promise<ConversionForecast> {
  try {
    const ctx = await aggregateContext(venueId);

    // Historical conversion rates per craft from swipe_orders
    const { rows: craftRows } = await pool.query(
      `SELECT
         COALESCE(oi.craft_type, 'unknown') AS craft,
         COUNT(DISTINCT s.id)               AS total_orders,
         COUNT(CASE WHEN s.status = 'confirmed' THEN 1 END) AS confirmed,
         COALESCE(AVG(s.subtotal_cents), 0) AS avg_value
       FROM swipe_orders s
       LEFT JOIN swipe_order_items oi ON oi.order_id = s.id
       WHERE s.venue_id = $1
         AND s.created_at > NOW() - INTERVAL '7 days'
       GROUP BY oi.craft_type`,
      [venueId],
    ).catch(() => ({ rows: [] }));

    const histByCategory = new Map<string, { rate: number; avgVal: number }>(
      craftRows.map((r: Record<string, unknown>) => {
        const total   = Number(r.total_orders ?? 1);
        const conf    = Number(r.confirmed    ?? 0);
        return [String(r.craft), { rate: conf / total, avgVal: Number(r.avg_value ?? 500) }];
      }),
    );

    // Context modifiers
    const engMod  = 0.5 + ctx.engagementLevel   * 0.5;
    const socMod  = 0.8 + ctx.socialEnergy       * 0.2;
    const staffMod= 0.7 + ctx.staffResponsiveness * 0.3;
    const contextMod = engMod * socMod * staffMod;

    const byCategory: CategoryConversion[] = CRAFTS.map(craft => {
      const hist  = histByCategory.get(craft) ?? { rate: 0.15, avgVal: 500 };
      const prob  = Math.min(0.95, hist.rate * contextMod);
      const guests = Math.max(1, ctx.activeGuests / CRAFTS.length);
      return {
        craft,
        probability: Math.round(prob * 1000) / 1000,
        avgValue:    Math.round(hist.avgVal),
        volume:      Math.round(guests * prob * (windowMinutes / 30)),
      };
    });

    const overallProb = byCategory.reduce((s, c) => s + c.probability, 0) / byCategory.length;
    const estimatedRevenue = byCategory.reduce((s, c) => s + c.avgValue * c.volume, 0);

    const upsellOps: UpsellOpportunity[] = [];
    if (ctx.socialEnergy > 0.5) {
      upsellOps.push({ type:"group_add_on", probability:0.4, revenueImpact:1500, trigger:"High social energy" });
    }
    if (ctx.engagementLevel > 0.6) {
      upsellOps.push({ type:"premium_tier", probability:0.3, revenueImpact:2000, trigger:"Peak engagement" });
    }
    if (ctx.vipCount > 0) {
      upsellOps.push({ type:"vip_experience", probability:0.6, revenueImpact:5000, trigger:"VIP present" });
    }

    return {
      venueId, ts: Date.now(),
      overallProbability: Math.round(overallProb * 1000) / 1000,
      byCategory,
      estimatedRevenue: Math.round(estimatedRevenue),
      upsellOpportunities: upsellOps,
      confidence: ctx.confidence,
      windowMinutes,
    };
  } catch (err) {
    logger.warn({ err, venueId }, "conversionForecasting: failed");
    return {
      venueId, ts: Date.now(),
      overallProbability: 0, byCategory: [], estimatedRevenue: 0,
      upsellOpportunities: [], confidence: 0.1, windowMinutes,
    };
  }
}
