/**
 * contextEngine — unified operational awareness model.
 *
 * Aggregates telemetry, AI memory, venue state, guest behavior, social energy,
 * environmental conditions, and temporal patterns into a single OperationalContext.
 * Publishes context snapshots to the cognition channel.
 */

import { pool } from "@workspace/db";
import { pgPubSub } from "../../realtime/pgPubSub";
import { logger } from "../../lib/logger";

export interface OperationalContext {
  venueId:             string;
  ts:                  number;
  // Venue state
  activeGuests:        number;
  activeSessions:      number;
  activeDevices:       number;
  vipCount:            number;
  // Engagement
  engagementLevel:     number;
  socialEnergy:        number;
  socialDensity:       number;
  interactionMomentum: number;
  // Environment
  moodScore:           number;
  ambientScene:        string | null;
  atmosphereScore:     number;
  // Operational
  operationalLoad:     number;
  inventoryPressure:   number;
  revenueMomentum:     number;
  staffResponsiveness: number;
  // Intelligence
  contextConfidence:   number;
  anomalyDetected:     boolean;
  predictedNextState:  string;
  // Temporal
  hourOfDay:           number;
  dayOfWeek:           number;
  isWeekend:           boolean;
  isPeakHour:          boolean;
}

export async function buildOperationalContext(venueId: string): Promise<OperationalContext> {
  const now   = new Date();
  const hour  = now.getHours();
  const dow   = now.getDay();

  // Parallel data fetches
  const [vcsResult, ecResult, momentumResult] = await Promise.allSettled([
    pool.query<{
      active_guests: string; active_sessions: string; active_devices: string;
      vip_count: string; engagement_level: string; social_energy: string;
      mood_score: string; ambient_scene: string | null; atmosphere_score: string;
      operational_load: string; inventory_pressure: string; revenue_momentum: string;
      context_confidence: string; anomaly_detected: boolean; traffic_trend: string;
    }>(
      `SELECT active_guests, active_sessions, active_devices, vip_count,
              engagement_level, social_energy, mood_score, ambient_scene,
              0.7 as atmosphere_score, operational_load, inventory_pressure,
              revenue_momentum, context_confidence, anomaly_detected, traffic_trend
       FROM venue_context_state WHERE venue_id = $1
       ORDER BY updated_at DESC LIMIT 1`,
      [venueId],
    ),
    pool.query<{ atmosphere_score: string; mood_label: string }>(
      `SELECT atmosphere_score, mood_label FROM environmental_context
       WHERE venue_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [venueId],
    ),
    pool.query<{ momentum: string; velocity: string }>(
      `SELECT momentum, velocity FROM behavioral_momentum
       WHERE venue_id = $1 AND guest_id IS NULL ORDER BY updated_at DESC LIMIT 1`,
      [venueId],
    ),
  ]);

  const vcs  = vcsResult.status === "fulfilled" ? vcsResult.value.rows[0] ?? null : null;
  const ec   = ecResult.status  === "fulfilled" ? ecResult.value.rows[0]  ?? null : null;
  const mom  = momentumResult.status === "fulfilled" ? momentumResult.value.rows[0] ?? null : null;

  const isPeakHour = (hour >= 18 && hour <= 23) || (hour >= 12 && hour <= 14);
  const momentum   = mom ? parseFloat(mom.momentum) : 0;
  const velocity   = mom ? parseFloat(mom.velocity)  : 0;
  const predictedNextState = predictNext(vcs, momentum, velocity);

  const ctx: OperationalContext = {
    venueId,
    ts: Date.now(),
    activeGuests:        vcs ? parseInt(vcs.active_guests, 10)       : 0,
    activeSessions:      vcs ? parseInt(vcs.active_sessions, 10)     : 0,
    activeDevices:       vcs ? parseInt(vcs.active_devices ?? "0", 10) : 0,
    vipCount:            vcs ? parseInt(vcs.vip_count, 10)            : 0,
    engagementLevel:     vcs ? parseFloat(vcs.engagement_level)       : 0.5,
    socialEnergy:        vcs ? parseFloat(vcs.social_energy)          : 0.5,
    socialDensity:       computeSocialDensity(vcs ? parseInt(vcs.active_guests, 10) : 0),
    interactionMomentum: momentum,
    moodScore:           vcs ? parseFloat(vcs.mood_score)             : 0.5,
    ambientScene:        vcs?.ambient_scene ?? null,
    atmosphereScore:     ec  ? parseFloat(ec.atmosphere_score)        : 0.5,
    operationalLoad:     vcs ? parseFloat(vcs.operational_load)       : 0.2,
    inventoryPressure:   vcs ? parseFloat(vcs.inventory_pressure)     : 0.2,
    revenueMomentum:     vcs ? parseFloat(vcs.revenue_momentum)       : 0,
    staffResponsiveness: 0.8, // future: derive from staff telemetry
    contextConfidence:   vcs ? parseFloat(vcs.context_confidence)     : 0.5,
    anomalyDetected:     vcs ? vcs.anomaly_detected : false,
    predictedNextState,
    hourOfDay:    hour,
    dayOfWeek:    dow,
    isWeekend:    dow === 0 || dow === 6,
    isPeakHour,
  };

  // Persist context snapshot
  await persistContextSnapshot(ctx);

  // Publish
  await pgPubSub.publish("cognition", {
    event:   "CONTEXT_BUILT",
    venueId,
    context: ctx,
  });

  return ctx;
}

function computeSocialDensity(activeGuests: number): number {
  if (activeGuests === 0)   return 0;
  if (activeGuests <= 5)    return 0.3;
  if (activeGuests <= 15)   return 0.6;
  if (activeGuests <= 30)   return 0.8;
  return 1.0;
}

function predictNext(
  vcs: { traffic_trend: string; engagement_level: string } | null,
  momentum: number,
  velocity: number,
): string {
  if (!vcs) return "stable";
  const trend = vcs.traffic_trend;
  const eng   = parseFloat(vcs.engagement_level);
  if (trend === "surging" && velocity > 0.1)   return "peak-approaching";
  if (trend === "declining" && velocity < -0.1) return "cooldown-entering";
  if (eng > 0.8)                                return "high-engagement-sustained";
  if (eng < 0.3 && momentum < 0)               return "disengagement-risk";
  return "stable";
}

async function persistContextSnapshot(ctx: OperationalContext): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO venue_state_snapshots
         (venue_id, snapshot_type, state, version)
       VALUES ($1, 'context', $2, 1)`,
      [ctx.venueId, JSON.stringify(ctx)],
    );
  } catch { /* non-critical */ }
}

export async function updateGuestContext(
  guestId: string,
  venueId: string,
  patch:   Record<string, unknown>,
): Promise<void> {
  const cols  = Object.keys(patch);
  const vals  = Object.values(patch);
  const sets  = cols.map((c, i) => {
    const col = c.replace(/([A-Z])/g, "_$1").toLowerCase();
    return `${col} = $${i + 3}`;
  });

  try {
    await pool.query(
      `INSERT INTO guest_context_profiles
         (guest_id, venue_id, last_seen_at, updated_at)
       VALUES ($1, $2, NOW(), NOW())
       ON CONFLICT (guest_id, venue_id) DO UPDATE
         SET ${sets.join(", ")}, last_seen_at = NOW(), updated_at = NOW()`,
      [guestId, venueId, ...vals],
    );
  } catch { /* non-critical */ }

  await pgPubSub.publish("cognition", {
    event: "GUEST_CONTEXT_UPDATED",
    venueId, guestId, patch,
  });
}

export async function detectAnomaly(venueId: string): Promise<boolean> {
  try {
    const { rows } = await pool.query<{
      recent_avg: string;
      baseline_avg: string;
    }>(
      `SELECT
         AVG(overall_score) FILTER (WHERE created_at > NOW() - INTERVAL '10 minutes') as recent_avg,
         AVG(overall_score) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as baseline_avg
       FROM venue_intelligence_scores WHERE venue_id = $1`,
      [venueId],
    );
    const r = rows[0];
    if (!r?.recent_avg || !r?.baseline_avg) return false;
    const delta = Math.abs(parseFloat(r.recent_avg) - parseFloat(r.baseline_avg));
    return delta > 0.3;
  } catch {
    return false;
  }
}
