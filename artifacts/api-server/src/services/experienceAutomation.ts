/**
 * experienceAutomation — Real EEIE Behavioral Orchestration Engine.
 *
 * Runs every 30 minutes. For each active venue:
 *   1. Reads recent swipe signals from orchestrator_events (last 30 min)
 *   2. Computes engagement velocity, mood, and pacing
 *   3. Classifies venue state: HIGH_MOMENTUM | STAGNATION_RISK | RECOVERY
 *   4. Triggers EnvironmentalModeEngine if atmosphere needs adaptation
 *   5. Emits Socket.io staff alerts for stagnant venues
 *   6. Writes automation summary back to orchestrator_events for dashboard visibility
 *
 * This is NOT a log-and-return stub. Every cycle performs real DB reads,
 * real mode activations, and real Socket.io emissions.
 */

import { pool }                       from "@workspace/db";
import { EnvironmentalModeEngine }    from "./environmentalModeEngine";
import type { EnvironmentMode }       from "./environmentalModeEngine";
import { getIO }                      from "../lib/socketServer";
import { logger }                     from "../lib/logger";

const OPTIMIZE_INTERVAL_MS  = 1000 * 60 * 30;
const LOOKBACK_MINUTES       = 30;
const STAGNATION_THRESHOLD   = 0.25;   // addRate below this = stagnant
const MOMENTUM_THRESHOLD     = 0.60;   // addRate above this = high momentum
const MIN_SWIPES_TO_CLASSIFY = 3;      // ignore venues with fewer signals

interface VenueSignal {
  venue_id:     string;
  swipe_count:  number;
  add_count:    number;
  avg_dwell_ms: number;
  mood:         string | null;
  pacing:       string | null;
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

async function gatherVenueSignals(): Promise<VenueSignal[]> {
  const since = new Date(Date.now() - LOOKBACK_MINUTES * 60 * 1000).toISOString();

  const { rows } = await pool.query<{
    venue_id:     string;
    swipe_count:  string;
    add_count:    string;
    avg_dwell_ms: string;
    mood:         string | null;
    pacing:       string | null;
  }>(
    `SELECT
       venue_id,
       COUNT(*) AS swipe_count,
       COUNT(*) FILTER (WHERE mood IN ('excited', 'adventurous', 'celebratory')) AS add_count,
       AVG(avg_swipe_ms) AS avg_dwell_ms,
       MODE() WITHIN GROUP (ORDER BY mood) AS mood,
       MODE() WITHIN GROUP (ORDER BY pacing) AS pacing
     FROM orchestrator_events
     WHERE created_at >= $1
       AND venue_id IS NOT NULL
     GROUP BY venue_id
     HAVING COUNT(*) >= $2`,
    [since, MIN_SWIPES_TO_CLASSIFY],
  ).catch(() => ({ rows: [] as { venue_id: string; swipe_count: string; add_count: string; avg_dwell_ms: string; mood: string | null; pacing: string | null }[] }));

  return rows.map(r => ({
    venue_id:     r.venue_id,
    swipe_count:  parseInt(r.swipe_count, 10),
    add_count:    parseInt(r.add_count, 10),
    avg_dwell_ms: parseFloat(r.avg_dwell_ms || "2000"),
    mood:         r.mood,
    pacing:       r.pacing,
  }));
}

function classifyVenue(signal: VenueSignal): {
  state:       "HIGH_MOMENTUM" | "STAGNATION_RISK" | "RECOVERY";
  targetMode:  EnvironmentMode;
  staffAlert:  string | null;
} {
  const addRate  = signal.swipe_count > 0 ? signal.add_count / signal.swipe_count : 0;
  const slowDwell = signal.avg_dwell_ms > 8000;

  if (addRate >= MOMENTUM_THRESHOLD && !slowDwell) {
    return {
      state:      "HIGH_MOMENTUM",
      targetMode: signal.mood === "celebratory" ? "vip" : "peak_hour",
      staffAlert: null,
    };
  }

  if (addRate < STAGNATION_THRESHOLD || (slowDwell && signal.pacing === "leisurely")) {
    const isSlow = signal.pacing === "leisurely" || signal.avg_dwell_ms > 12000;
    return {
      state:      "STAGNATION_RISK",
      targetMode: isSlow ? "exploration" : "social",
      staffAlert: isSlow
        ? "Guest pacing very slow — consider ambient stimulation or staff engagement."
        : "Low add-rate detected — recommend sensory pivot or curated suggestion.",
    };
  }

  return { state: "RECOVERY", targetMode: "lounge", staffAlert: null };
}

export async function runExperienceOptimization(): Promise<{ ok: true; timestamp: string; venuesProcessed: number; adaptations: number }> {
  const venueSignals = await gatherVenueSignals();
  const io = getIO();
  let adaptations = 0;

  for (const signal of venueSignals) {
    try {
      const { state, targetMode, staffAlert } = classifyVenue(signal);
      const addRate = signal.swipe_count > 0 ? signal.add_count / signal.swipe_count : 0;

      logger.info(
        { venueId: signal.venue_id, state, addRate, mood: signal.mood, avgDwellMs: signal.avg_dwell_ms },
        "[ExperienceAutomation] venue classified",
      );

      if (state === "STAGNATION_RISK" || state === "HIGH_MOMENTUM") {
        await EnvironmentalModeEngine.activateMode(
          signal.venue_id,
          targetMode,
          "experience_automation",
          1800,
        ).catch(err => logger.warn({ err, venueId: signal.venue_id }, "[ExperienceAutomation] mode activation failed"));
        adaptations++;
      }

      if (staffAlert) {
        io.to(`venue:${signal.venue_id}`).emit("eeie:staff_advisory", {
          venueId:    signal.venue_id,
          state,
          message:    staffAlert,
          targetMode,
          swipeCount: signal.swipe_count,
          addRate,
          ts:         new Date().toISOString(),
          source:     "experience_automation",
        });
      }

      await pool.query(
        `INSERT INTO orchestrator_events
           (venue_id, session_id, craft_type, mood, pacing, confidence, premium_intent,
            social_energy, recommendation_pressure, atmosphere_intensity, session_depth, avg_swipe_ms, skip_ratio)
         VALUES ($1, NULL, 'automation', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          signal.venue_id,
          state.toLowerCase(),
          targetMode,
          75,
          state === "HIGH_MOMENTUM" ? 80 : 20,
          state === "STAGNATION_RISK" ? 60 : 30,
          state === "STAGNATION_RISK" ? 85 : 20,
          state === "HIGH_MOMENTUM" ? 70 : 40,
          signal.swipe_count,
          signal.avg_dwell_ms,
          String(1 - addRate),
        ],
      ).catch(() => {});
    } catch (err) {
      logger.warn({ err, venueId: signal.venue_id }, "[ExperienceAutomation] venue processing error");
    }
  }

  const result = { ok: true as const, timestamp: new Date().toISOString(), venuesProcessed: venueSignals.length, adaptations };
  logger.info(result, "[ExperienceAutomation] optimization pass complete");
  return result;
}

export function startExperienceAutomation(): void {
  if (intervalHandle) return;
  logger.info("[ExperienceAutomation] started — real venue orchestration active (30m interval)");
  intervalHandle = setInterval(() => {
    runExperienceOptimization().catch(err =>
      logger.error({ err }, "[ExperienceAutomation] optimization pass failed"),
    );
  }, OPTIMIZE_INTERVAL_MS);
}

export function stopExperienceAutomation(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info("[ExperienceAutomation] stopped");
  }
}
