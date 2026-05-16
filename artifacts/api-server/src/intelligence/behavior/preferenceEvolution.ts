/**
 * preferenceEvolution — models how guest flavor and craft preferences
 * evolve longitudinally across sessions.
 *
 * Tracks:
 *   - Flavor trajectory (bold → mellow, sweet → dry, etc.)
 *   - Craft drift (started on smoke, now exploring pour)
 *   - VIP progression milestones
 *   - Recommendation acceptance rate over time
 *
 * Persists to: ai_behavior_memory (entity_type='guest', memory_type='preference_evolution')
 * Consumed by: behavioralScoring, adaptiveOptimizer, recommendation engine
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";

export interface PreferenceVector {
  guestId:       string;
  venueId:       string;
  craftHistory:  CraftPreference[];
  dominantCraft: string | null;
  craftDrift:    number;        // 0=loyal, 1=explorer
  flavorArc:     FlavorArc;
  acceptanceRate:number;        // recommendation acceptance 0–1
  sessionCount:  number;
  evolutionScore:number;        // 0–1 maturity of preference model
  confidence:    number;
  updatedAt:     number;
}

export interface CraftPreference {
  craft:       string;
  weight:      number;    // 0–1 relative preference
  orderCount:  number;
  swipeCount:  number;
  trend:       "growing" | "stable" | "declining";
}

export interface FlavorArc {
  strength:    "bold" | "medium" | "light" | "unknown";
  sweetness:   "sweet" | "balanced" | "dry" | "unknown";
  complexity:  "complex" | "approachable" | "unknown";
  trajectory:  "exploring" | "refining" | "loyal" | "dormant";
}

const CRAFT_TYPES = ["smoke", "pour", "brew", "vape"] as const;

export async function buildPreferenceVector(
  guestId: string,
  venueId: string,
): Promise<PreferenceVector> {
  try {
    // Aggregate craft interactions from swipe_order_items
    const { rows: craftRows } = await pool.query(
      `SELECT
         COALESCE(oi.craft_type, 'unknown') AS craft,
         COUNT(*)                            AS swipe_count,
         COUNT(CASE WHEN s.status='confirmed' THEN 1 END) AS order_count
       FROM swipe_orders s
       JOIN swipe_order_items oi ON oi.order_id = s.id
       WHERE s.user_id = $1 AND s.venue_id = $2
       GROUP BY oi.craft_type`,
      [guestId, venueId],
    ).catch(() => ({ rows: [] }));

    const typedCraftRows = craftRows as Record<string, unknown>[];
    const totalSwipes = typedCraftRows.reduce((s: number, r) =>
      s + Number(r["swipe_count"] ?? 0), 0);
    const totalOrders = typedCraftRows.reduce((s: number, r) =>
      s + Number(r["order_count"] ?? 0), 0);

    const craftHistory: CraftPreference[] = CRAFT_TYPES.map(craft => {
      const row = typedCraftRows.find(r => String(r["craft"]) === craft);
      const sw  = Number(row?.["swipe_count"]  ?? 0);
      const ord = Number(row?.["order_count"]  ?? 0);
      const weight = totalSwipes > 0 ? sw / totalSwipes : 0;
      const trend: CraftPreference["trend"] = ord > 2 ? "growing" : ord > 0 ? "stable" : "declining";
      return {
        craft, weight: Math.round(weight * 1000) / 1000,
        orderCount: ord, swipeCount: sw, trend,
      };
    }).sort((a, b) => b.weight - a.weight);

    const dominantCraft = craftHistory[0]?.weight > 0.3 ? craftHistory[0].craft : null;

    // Entropy as craft drift measure
    const entropy = craftHistory.reduce((s, c) =>
      c.weight > 0 ? s - c.weight * Math.log2(c.weight) : s, 0);
    const craftDrift = Math.min(1, entropy / Math.log2(CRAFT_TYPES.length));

    // Pull memory for behavioral enrichment
    const { rows: memRows } = await pool.query(
      `SELECT memory_type, value, metadata FROM ai_behavior_memory
       WHERE entity_id = $1 AND venue_id = $2 AND entity_type = 'guest'
       LIMIT 20`,
      [guestId, venueId],
    ).catch(() => ({ rows: [] }));

    const sessionCount = (memRows as Record<string, unknown>[])
      .filter(r => String(r.memory_type) === 'session_state').length;

    const acceptanceRate = totalSwipes > 0
      ? Math.min(1, totalOrders / totalSwipes)
      : 0;

    const evolutionScore = Math.min(1,
      (craftHistory.filter(c => c.swipeCount > 0).length / 4) * 0.4 +
      Math.min(sessionCount / 10, 1) * 0.4 +
      craftDrift * 0.2,
    );

    const vector: PreferenceVector = {
      guestId, venueId,
      craftHistory,
      dominantCraft,
      craftDrift:    Math.round(craftDrift    * 1000) / 1000,
      acceptanceRate:Math.round(acceptanceRate * 1000) / 1000,
      sessionCount,
      evolutionScore:Math.round(evolutionScore * 1000) / 1000,
      confidence:    Math.min(1, (totalSwipes + 1) / 20),
      updatedAt:     Date.now(),
      flavorArc: {
        strength:   totalOrders > 5 ? "bold"    : totalOrders > 2 ? "medium" : "unknown",
        sweetness:  craftDrift   > 0.5 ? "balanced" : "unknown",
        complexity: evolutionScore > 0.6 ? "complex" : "approachable",
        trajectory: craftDrift > 0.6 ? "exploring" : sessionCount > 5 ? "refining" : "loyal",
      },
    };

    // Persist preference vector
    await pool.query(
      `INSERT INTO ai_behavior_memory
         (venue_id, entity_id, entity_type, memory_type, value, confidence, last_occurrence, metadata)
       VALUES ($1,$2,'guest','preference_evolution',$3,$4,NOW(),$5)
       ON CONFLICT (venue_id, entity_id, memory_type) DO UPDATE SET
         value          = EXCLUDED.value,
         confidence     = EXCLUDED.confidence,
         last_occurrence= NOW(),
         metadata       = EXCLUDED.metadata`,
      [
        venueId, guestId, evolutionScore, vector.confidence,
        JSON.stringify({
          dominantCraft, craftDrift, acceptanceRate,
          sessionCount, craftHistory: craftHistory.slice(0, 3),
        }),
      ],
    );

    return vector;
  } catch (err) {
    logger.warn({ err, guestId, venueId }, "preferenceEvolution: build failed");
    return {
      guestId, venueId, craftHistory: [], dominantCraft: null,
      craftDrift: 0, acceptanceRate: 0, sessionCount: 0,
      evolutionScore: 0, confidence: 0, updatedAt: Date.now(),
      flavorArc: { strength:"unknown", sweetness:"unknown", complexity:"unknown", trajectory:"dormant" },
    };
  }
}
