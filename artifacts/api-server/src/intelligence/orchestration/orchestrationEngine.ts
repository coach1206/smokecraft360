/**
 * orchestrationEngine — the autonomous venue intelligence core.
 *
 * Continuously evaluates venue state and fires decisions.
 * Called on-demand by the orchestration worker and via API triggers.
 */

import { pool } from "@workspace/db";
import { pgPubSub } from "../../realtime/pgPubSub";
import { logger } from "../../lib/logger";
import { makeDecision, type Decision } from "./decisionEngine";
import type { VenueContext } from "./ruleEngine";

interface LiveMetrics {
  active_guests:     string;
  active_sessions:   string;
  vip_count:         string;
  engagement_level:  string;
  social_energy:     string;
  mood_score:        string;
  operational_load:  string;
  inventory_pressure:string;
  revenue_momentum:  string;
  ambient_scene:     string | null;
  traffic_trend:     string;
  anomaly_detected:  boolean;
}

async function buildVenueContext(venueId: string): Promise<VenueContext | null> {
  try {
    const { rows } = await pool.query<LiveMetrics>(
      `SELECT
         active_guests, active_sessions, vip_count,
         engagement_level, social_energy, mood_score,
         operational_load, inventory_pressure, revenue_momentum,
         ambient_scene, traffic_trend, anomaly_detected
       FROM venue_context_state
       WHERE venue_id = $1
       ORDER BY updated_at DESC LIMIT 1`,
      [venueId],
    );
    if (!rows[0]) {
      // Bootstrap context from scratch
      return {
        venueId,
        activeGuests:      0,
        activeSessions:    0,
        vipCount:          0,
        engagementLevel:   0.5,
        socialEnergy:      0.5,
        moodScore:         0.5,
        operationalLoad:   0.2,
        inventoryPressure: 0.2,
        revenueMomentum:   0,
        ambientScene:      null,
        trafficTrend:      "stable",
        anomalyDetected:   false,
      };
    }
    const r = rows[0];
    return {
      venueId,
      activeGuests:      parseInt(r.active_guests, 10),
      activeSessions:    parseInt(r.active_sessions, 10),
      vipCount:          parseInt(r.vip_count, 10),
      engagementLevel:   parseFloat(r.engagement_level),
      socialEnergy:      parseFloat(r.social_energy),
      moodScore:         parseFloat(r.mood_score),
      operationalLoad:   parseFloat(r.operational_load),
      inventoryPressure: parseFloat(r.inventory_pressure),
      revenueMomentum:   parseFloat(r.revenue_momentum),
      ambientScene:      r.ambient_scene,
      trafficTrend:      r.traffic_trend,
      anomalyDetected:   r.anomaly_detected,
    };
  } catch (err) {
    logger.warn({ err, venueId }, "orchestrationEngine: failed to build venue context");
    return null;
  }
}

function detectTriggers(ctx: VenueContext): string[] {
  const triggers: string[] = [];
  if (ctx.vipCount > 0)                   triggers.push("VIP_DETECTED");
  if (ctx.engagementLevel < 0.3)          triggers.push("LOW_ENGAGEMENT");
  if (ctx.engagementLevel > 0.8)          triggers.push("HIGH_ENGAGEMENT");
  if (ctx.socialEnergy > 0.75)            triggers.push("HIGH_SOCIAL");
  if (ctx.inventoryPressure > 0.8)        triggers.push("INVENTORY_PRESSURE");
  if (ctx.anomalyDetected)               triggers.push("ANOMALY_DETECTED");
  if (ctx.revenueMomentum < -0.2)         triggers.push("REVENUE_DECLINING");
  if (ctx.revenueMomentum > 0.3)          triggers.push("REVENUE_SURGING");
  if (ctx.operationalLoad > 0.85)         triggers.push("HIGH_LOAD");
  if (ctx.trafficTrend === "declining")   triggers.push("TRAFFIC_DECLINE");
  if (ctx.trafficTrend === "surging")     triggers.push("TRAFFIC_SURGE");
  return triggers;
}

export async function evaluateVenue(venueId: string): Promise<Decision[]> {
  const ctx = await buildVenueContext(venueId);
  if (!ctx) return [];

  const triggers = detectTriggers(ctx);
  if (triggers.length === 0) return [];

  const decisions: Decision[] = [];
  for (const trigger of triggers) {
    const decision = await makeDecision(ctx, trigger, { detectedAt: Date.now() });
    if (decision) decisions.push(decision);
  }

  // Update venue intelligence score
  await updateIntelligenceScore(ctx, decisions.length);

  return decisions;
}

async function updateIntelligenceScore(
  ctx:           VenueContext,
  decisionCount: number,
): Promise<void> {
  const overall = (
    ctx.engagementLevel * 0.3 +
    ctx.socialEnergy    * 0.2 +
    (1 - ctx.inventoryPressure) * 0.15 +
    (1 - ctx.operationalLoad)   * 0.15 +
    ctx.moodScore               * 0.1 +
    Math.min(decisionCount / 5, 1) * 0.1
  );

  try {
    const now = new Date();
    await pool.query(
      `INSERT INTO venue_intelligence_scores
         (venue_id, overall_score, engagement_score, social_energy,
          inventory_health, active_guests, active_sessions,
          window_start, window_end, period)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'5m')`,
      [
        ctx.venueId,
        overall,
        ctx.engagementLevel,
        ctx.socialEnergy,
        1 - ctx.inventoryPressure,
        ctx.activeGuests,
        ctx.activeSessions,
        new Date(Date.now() - 300_000),
        now,
      ],
    );
  } catch { /* non-critical */ }

  await pgPubSub.publish("intelligence", {
    event:            "INTELLIGENCE_SCORE_UPDATED",
    venueId:          ctx.venueId,
    overallScore:     overall,
    engagementLevel:  ctx.engagementLevel,
    socialEnergy:     ctx.socialEnergy,
    activeGuests:     ctx.activeGuests,
    decisionCount,
  });
}

export async function updateVenueContext(
  venueId: string,
  patch:   Partial<Omit<VenueContext, "venueId">>,
): Promise<void> {
  if (Object.keys(patch).length === 0) return;

  // Map camelCase keys to snake_case columns
  const toCol = (k: string) => k.replace(/([A-Z])/g, "_$1").toLowerCase();

  const cols   = Object.keys(patch).map(toCol);
  const vals   = Object.values(patch);
  const setClauses = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");

  try {
    // Try upsert first (requires unique constraint on venue_id)
    await pool.query(
      `INSERT INTO venue_context_state (venue_id, ${cols.join(", ")}, updated_at)
       VALUES ($1, ${vals.map((_, i) => `$${i + 2}`).join(", ")}, NOW())
       ON CONFLICT (venue_id) DO UPDATE SET ${setClauses}, updated_at = NOW()`,
      [venueId, ...vals],
    );
  } catch {
    try {
      await pool.query(
        `UPDATE venue_context_state SET ${setClauses}, updated_at = NOW() WHERE venue_id = $1`,
        [venueId, ...vals],
      );
    } catch { /* non-critical */ }
  }

  await pgPubSub.publish("intelligence", {
    event: "CONTEXT_UPDATED",
    venueId,
    patch,
  });
}
