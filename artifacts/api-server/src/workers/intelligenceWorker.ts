/**
 * intelligenceWorker — background orchestration + context refresh loop.
 *
 * Runs every 30 seconds per active venue:
 *   1. Builds operational context
 *   2. Syncs digital twin
 *   3. Runs orchestration evaluation (triggers decisions if rules match)
 *   4. Detects anomalies
 *   5. Updates behavioral momentum
 *
 * Also runs a 5-minute memory decay pass.
 */

import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { buildOperationalContext, detectAnomaly } from "../cognition/context/contextEngine";
import { syncTwinFromContext } from "../cognition/digitalTwin/venueTwin";
import { evaluateVenue, updateVenueContext } from "../intelligence/orchestration/orchestrationEngine";
import { applyAction } from "../intelligence/ambient/ambientOrchestrator";
import { decayMemory } from "../intelligence/behavior/aiMemoryEngine";
import { pgPubSub } from "../realtime/pgPubSub";

let evaluationTimer: ReturnType<typeof setInterval> | null = null;
let decayTimer:      ReturnType<typeof setInterval> | null = null;
let isRunning        = false;

async function getActiveVenues(): Promise<string[]> {
  try {
    const { rows } = await pool.query<{ venue_id: string }>(
      `SELECT DISTINCT venue_id FROM venue_context_state
       WHERE updated_at > NOW() - INTERVAL '2 hours'
       LIMIT 50`,
    );
    if (rows.length > 0) return rows.map((r) => r.venue_id);

    // Bootstrap: pull from venues table if it exists
    const { rows: venueRows } = await pool.query<{ id: string }>(
      `SELECT id FROM venues LIMIT 10`,
    ).catch(() => ({ rows: [] }));
    return venueRows.map((r) => r.id);
  } catch {
    return [];
  }
}

async function runEvaluationCycle(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  try {
    const venues = await getActiveVenues();
    for (const venueId of venues) {
      try {
        // 1. Build context
        const ctx = await buildOperationalContext(venueId);

        // 2. Sync digital twin
        await syncTwinFromContext(ctx);

        // 3. Anomaly detection
        const anomaly = await detectAnomaly(venueId);
        if (anomaly !== ctx.anomalyDetected) {
          await updateVenueContext(venueId, { anomalyDetected: anomaly });
        }

        // 4. Orchestration evaluation
        const decisions = await evaluateVenue(venueId);

        // 5. Apply ambient actions from decisions
        for (const decision of decisions) {
          if (decision.status !== "applied") continue;
          for (const action of decision.actions) {
            await applyAction(venueId, action.type, action.payload, decision.id);
          }
        }

        // 6. Update behavioral momentum
        await updateBehavioralMomentum(venueId, ctx.engagementLevel, ctx.socialEnergy);

      } catch (err) {
        logger.warn({ err, venueId }, "intelligenceWorker: venue evaluation failed");
      }
    }
  } finally {
    isRunning = false;
  }
}

async function updateBehavioralMomentum(
  venueId:    string,
  engagement: number,
  social:     number,
): Promise<void> {
  const momentum = engagement * 0.6 + social * 0.4;
  try {
    await pool.query(
      `INSERT INTO behavioral_momentum
         (venue_id, momentum_type, momentum, trend, updated_at)
       VALUES ($1, 'venue', $2, $3, NOW())
       ON CONFLICT (venue_id, momentum_type) DO UPDATE
         SET momentum   = EXCLUDED.momentum,
             velocity   = EXCLUDED.momentum - behavioral_momentum.momentum,
             trend      = CASE
               WHEN EXCLUDED.momentum > behavioral_momentum.momentum + 0.05 THEN 'rising'
               WHEN EXCLUDED.momentum < behavioral_momentum.momentum - 0.05 THEN 'declining'
               ELSE 'stable' END,
             updated_at = NOW()`,
      [venueId, momentum, momentum > 0.6 ? "rising" : momentum < 0.3 ? "declining" : "stable"],
    );
  } catch { /* non-critical */ }
}

export function startIntelligenceWorker(): void {
  logger.info("intelligenceWorker: starting");

  // Main evaluation loop: every 30 seconds
  evaluationTimer = setInterval(() => {
    runEvaluationCycle().catch((err) => {
      logger.error({ err }, "intelligenceWorker: evaluation cycle error");
    });
  }, 30_000);

  // Memory decay: every 5 minutes
  decayTimer = setInterval(() => {
    decayMemory().catch((err) => {
      logger.warn({ err }, "intelligenceWorker: memory decay error");
    });
  }, 300_000);

  // Run immediately on start
  setTimeout(() => {
    runEvaluationCycle().catch(() => {});
  }, 5000);

  logger.info("intelligenceWorker: evaluation loop running (30s interval)");
}

export function stopIntelligenceWorker(): void {
  if (evaluationTimer) { clearInterval(evaluationTimer); evaluationTimer = null; }
  if (decayTimer)      { clearInterval(decayTimer);      decayTimer      = null; }
  logger.info("intelligenceWorker: stopped");
}
