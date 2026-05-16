/**
 * intelligenceWorker — background orchestration + full cognition loop.
 *
 * 30-second tick (per active venue):
 *   1. Build operational context
 *   2. Sync digital twin
 *   3. Anomaly detection
 *   4. Orchestration evaluation + ambient actions
 *   5. Behavioral momentum update
 *   6. Social engagement cycle
 *   7. Operational awareness synthesis
 *
 * 5-minute tick (per active venue):
 *   8. Temporal pattern learning
 *   9. Adaptive optimization cycle
 *
 * 5-minute tick (global):
 *   10. AI memory decay
 */

import { pool }                               from "@workspace/db";
import { logger }                             from "../lib/logger";
import { buildOperationalContext, detectAnomaly } from "../cognition/context/contextEngine";
import { syncTwinFromContext }                from "../cognition/digitalTwin/venueTwin";
import { evaluateVenue, updateVenueContext }  from "../intelligence/orchestration/orchestrationEngine";
import { applyAction }                        from "../intelligence/ambient/ambientOrchestrator";
import { decayMemory }                        from "../intelligence/behavior/aiMemoryEngine";
import { runSocialEngagementCycle }           from "../intelligence/social/socialEngagementEngine";
import { runTemporalLearningCycle }           from "../intelligence/temporal/temporalPatternEngine";
import { runAwarenessCycle }                  from "../intelligence/awareness/operationalAwarenessEngine";
import { runAdaptiveCycle }                   from "../intelligence/adaptive/adaptiveOptimizer";

// New cognition + telemetry services
import { aggregateContext }                   from "../cognition/context/contextAggregator";
import { scoreAndPersist }                    from "../cognition/context/contextScoring";
import { predictMomentum }                    from "../cognition/predictive/momentumPrediction";
import { forecastEngagement }                 from "../cognition/predictive/engagementForecasting";
import { forecastConversions }                from "../cognition/predictive/conversionForecasting";
import { forecastTraffic }                    from "../cognition/predictive/trafficPrediction";
import { predictOptimalEnvironment }          from "../cognition/predictive/environmentalPrediction";
import { evictStaleVenueState }               from "../cognition/state/venueStateEngine";
import { evictStaleGuestState }               from "../cognition/state/guestStateEngine";
import { optimizeAtmosphere }                 from "../cognition/environment/atmosphereOptimization";
import { startQueueDrain }                    from "../intelligence/orchestration/orchestrationQueue";
import { computeHeatmap }                     from "../realtime/telemetry/loungeHeatmap";
import { computeLiveMetrics }                 from "../realtime/telemetry/liveMetrics";
import { summarizeSessions, evictExpiredSessions } from "../realtime/telemetry/activeSessions";

let evaluationTimer:  ReturnType<typeof setInterval> | null = null;
let slowCycleTimer:   ReturnType<typeof setInterval> | null = null;
let decayTimer:       ReturnType<typeof setInterval> | null = null;
let isRunning         = false;
let isSlowRunning     = false;

async function getActiveVenues(): Promise<string[]> {
  try {
    const { rows } = await pool.query<{ venue_id: string }>(
      `SELECT DISTINCT venue_id FROM venue_context_state
       WHERE updated_at > NOW() - INTERVAL '2 hours'
       LIMIT 50`,
    );
    if (rows.length > 0) return rows.map((r) => r.venue_id);

    const { rows: venueRows } = await pool.query<{ id: string }>(
      `SELECT id FROM venues LIMIT 10`,
    ).catch(() => ({ rows: [] }));
    return venueRows.map((r) => r.id);
  } catch { return []; }
}

// ── 30-second evaluation cycle ────────────────────────────────────────────────

async function runEvaluationCycle(): Promise<void> {
  if (isRunning) return;
  isRunning = true;
  try {
    const venues = await getActiveVenues();
    await Promise.allSettled(venues.map(evaluateVenueFull));
  } finally {
    isRunning = false;
  }
}

async function evaluateVenueFull(venueId: string): Promise<void> {
  try {
    // 1. Context
    const ctx = await buildOperationalContext(venueId);

    // 2. Digital twin sync
    await syncTwinFromContext(ctx);

    // 3. Anomaly detection
    const anomaly = await detectAnomaly(venueId);
    if (anomaly !== ctx.anomalyDetected) {
      await updateVenueContext(venueId, { anomalyDetected: anomaly });
    }

    // 4. Orchestration rules + ambient actions
    const decisions = await evaluateVenue(venueId);
    for (const decision of decisions) {
      if (decision.status !== "applied") continue;
      for (const action of decision.actions) {
        await applyAction(venueId, action.type, action.payload, decision.id);
      }
    }

    // 5. Behavioral momentum
    await updateBehavioralMomentum(venueId, ctx.engagementLevel, ctx.socialEnergy);

    // 6. Social engagement (lightweight — detect active clusters)
    await runSocialEngagementCycle(venueId).catch(() => {});

    // 7. Operational awareness synthesis
    await runAwarenessCycle(venueId).catch(() => {});

    // 8. Context aggregation + scoring
    const aggregated = await aggregateContext(venueId).catch(() => null);
    if (aggregated) await scoreAndPersist(aggregated).catch(() => {});

    // 9. Momentum prediction
    await predictMomentum(venueId).catch(() => {});

    // 10. Live metrics
    await computeLiveMetrics(venueId).catch(() => {});

    // 11. Active session summary
    await summarizeSessions(venueId).catch(() => {});

  } catch (err) {
    logger.warn({ err, venueId }, "intelligenceWorker: venue evaluation failed");
  }
}

// ── 5-minute slow cycle (learning + optimization) ─────────────────────────────

async function runSlowCycle(): Promise<void> {
  if (isSlowRunning) return;
  isSlowRunning = true;
  try {
    const venues = await getActiveVenues();
    await Promise.allSettled(venues.map(async (venueId) => {
      try {
        await runTemporalLearningCycle(venueId);
        await runAdaptiveCycle(venueId);

        // New predictive + environmental engines
        await forecastEngagement(venueId).catch(() => {});
        await forecastConversions(venueId).catch(() => {});
        await forecastTraffic(venueId).catch(() => {});
        await predictOptimalEnvironment(venueId).catch(() => {});
        await optimizeAtmosphere(venueId, false).catch(() => {});
        await computeHeatmap(venueId).catch(() => {});
      } catch (err) {
        logger.warn({ err, venueId }, "intelligenceWorker: slow cycle failed");
      }
    }));


    // Global evictions
    evictStaleVenueState();
    evictStaleGuestState();
    evictExpiredSessions();
  } finally {
    isSlowRunning = false;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function updateBehavioralMomentum(
  venueId:    string,
  engagement: number,
  social:     number,
): Promise<void> {
  const momentum = engagement * 0.6 + social * 0.4;
  try {
    await pool.query(
      `INSERT INTO behavioral_momentum
         (venue_id, momentum_type, value, updated_at)
       VALUES ($1, 'venue', $2, NOW())
       ON CONFLICT (venue_id, momentum_type) DO UPDATE
         SET value      = EXCLUDED.value,
             updated_at = NOW()`,
      [venueId, momentum],
    );
  } catch { /* non-critical */ }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

export function startIntelligenceWorker(): void {
  logger.info("intelligenceWorker: starting");

  // Start orchestration queue drain
  startQueueDrain(60_000);

  // 30-second evaluation + cognition loop
  evaluationTimer = setInterval(() => {
    runEvaluationCycle().catch((err) => {
      logger.error({ err }, "intelligenceWorker: evaluation cycle error");
    });
  }, 30_000);

  // 5-minute temporal learning + adaptive optimization
  slowCycleTimer = setInterval(() => {
    runSlowCycle().catch((err) => {
      logger.warn({ err }, "intelligenceWorker: slow cycle error");
    });
  }, 300_000);

  // 5-minute AI memory decay
  decayTimer = setInterval(() => {
    decayMemory().catch((err) => {
      logger.warn({ err }, "intelligenceWorker: memory decay error");
    });
  }, 300_000);

  // Staggered warm-up
  setTimeout(() => { runEvaluationCycle().catch(() => {}); }, 5_000);
  setTimeout(() => { runSlowCycle().catch(() => {}); },       60_000);

  logger.info("intelligenceWorker: all cycles running (30s eval / 5m learn+forecast)");
}

export function stopIntelligenceWorker(): void {
  if (evaluationTimer) { clearInterval(evaluationTimer); evaluationTimer = null; }
  if (slowCycleTimer)  { clearInterval(slowCycleTimer);  slowCycleTimer  = null; }
  if (decayTimer)      { clearInterval(decayTimer);      decayTimer      = null; }
  logger.info("intelligenceWorker: stopped");
}
