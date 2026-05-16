/**
 * /api/cognitive — cognition sub-system routes:
 *   staff context, social engagement, temporal patterns,
 *   operational awareness, adaptive optimization, orchestration events.
 */

import { Router }          from "express";
import { pool }            from "@workspace/db";
import { requireAuth }     from "../middleware/auth";
import { getStaffContext, upsertStaffContext }                           from "../intelligence/staff/staffContextEngine";
import { runSocialEngagementCycle }                                      from "../intelligence/social/socialEngagementEngine";
import { runTemporalLearningCycle, getCurrentTemporalAlignment }         from "../intelligence/temporal/temporalPatternEngine";
import { runAwarenessCycle, computeAwarenessReport }                     from "../intelligence/awareness/operationalAwarenessEngine";
import { runAdaptiveCycle, generateOptimizations }                       from "../intelligence/adaptive/adaptiveOptimizer";
import { aggregateContext }                                               from "../cognition/context/contextAggregator";
import { scoreContext }                                                   from "../cognition/context/contextScoring";
import { replayContextWindow }                                            from "../cognition/context/contextReplay";
import { predictMomentum }                                               from "../cognition/predictive/momentumPrediction";
import { forecastEngagement }                                            from "../cognition/predictive/engagementForecasting";
import { forecastConversions }                                           from "../cognition/predictive/conversionForecasting";
import { forecastTraffic }                                               from "../cognition/predictive/trafficPrediction";
import { predictOptimalEnvironment }                                     from "../cognition/predictive/environmentalPrediction";
import { getVenueState, updateVenueState, replayVenueState }             from "../cognition/state/venueStateEngine";
import { getGuestState, updateGuestState, getActiveGuests }              from "../cognition/state/guestStateEngine";
import { getSceneEffectiveness, recordSceneOutcome }                     from "../cognition/environment/environmentalMemory";
import { optimizeAtmosphere }                                            from "../cognition/environment/atmosphereOptimization";
import { buildPreferenceVector }                                         from "../intelligence/behavior/preferenceEvolution";
import { scoreBehavior }                                                 from "../intelligence/behavior/behavioralScoring";
import {
  enqueue, getQueueStatus, pauseQueue, resumeQueue, flushQueue,
}                                                                        from "../intelligence/orchestration/orchestrationQueue";
import { replayOrchestrationSequence }                                   from "../intelligence/orchestration/orchestrationReplay";
import { rollback }                                                      from "../intelligence/orchestration/orchestrationRollback";
import { computeHeatmap }                                                from "../realtime/telemetry/loungeHeatmap";
import { computeLiveMetrics }                                            from "../realtime/telemetry/liveMetrics";
import { summarizeSessions }                                             from "../realtime/telemetry/activeSessions";

const router = Router();

// ── Operational Awareness ────────────────────────────────────────────────────

router.get("/awareness/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const report = await computeAwarenessReport(venueId);
    res.json({ ok: true, report });
  } catch (err) {
    req.log.error({ err }, "awareness GET failed");
    res.status(500).json({ error: "failed" });
  }
});

router.post("/awareness/:venueId/run", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const report = await runAwarenessCycle(venueId);
    res.json({ ok: true, report });
  } catch (err) {
    req.log.error({ err }, "awareness run failed");
    res.status(500).json({ error: "failed" });
  }
});

// ── Staff Context ─────────────────────────────────────────────────────────────

router.get("/staff/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const staff = await getStaffContext(venueId);
    res.json({ ok: true, staff });
  } catch (err) {
    req.log.error({ err }, "staff context GET failed");
    res.status(500).json({ error: "failed" });
  }
});

router.post("/staff/:venueId/context", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const body = req.body as Record<string, unknown>;
    await upsertStaffContext({
      venueId,
      staffId:          String(body["staffId"] ?? ""),
      role:             String(body["role"] ?? "server"),
      zone:             body["zone"] != null ? String(body["zone"]) : null,
      isOnFloor:        Boolean(body["isOnFloor"] ?? false),
      activeGuests:     Number(body["activeGuests"] ?? 0),
      interactionRate:  Number(body["interactionRate"] ?? 0),
      upsellRate:       Number(body["upsellRate"] ?? 0),
      satisfactionScore:Number(body["satisfactionScore"] ?? 0),
      recommendations:  Number(body["recommendations"] ?? 0),
      conversions:      Number(body["conversions"] ?? 0),
      energyLevel:      Number(body["energyLevel"] ?? 0.5),
    });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "staff context POST failed");
    res.status(500).json({ error: "failed" });
  }
});

// ── Social Engagement ─────────────────────────────────────────────────────────

router.get("/social/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM social_engagement_state
       WHERE venue_id = $1 AND updated_at > NOW() - INTERVAL '2 hours'
       ORDER BY social_energy DESC LIMIT 20`,
      [venueId],
    );
    res.json({ ok: true, clusters: rows });
  } catch (err) {
    req.log.error({ err }, "social GET failed");
    res.status(500).json({ error: "failed" });
  }
});

router.post("/social/:venueId/run", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const result = await runSocialEngagementCycle(venueId);
    res.json({ ok: true, ...result });
  } catch (err) {
    req.log.error({ err }, "social run failed");
    res.status(500).json({ error: "failed" });
  }
});

// ── Temporal Patterns ─────────────────────────────────────────────────────────

router.get("/temporal/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const { rows } = await pool.query(
      `SELECT * FROM temporal_behavior_patterns
       WHERE venue_id = $1
       ORDER BY hour_of_day, day_of_week`,
      [venueId],
    );
    const alignment = await getCurrentTemporalAlignment(venueId);
    res.json({ ok: true, patterns: rows, currentAlignment: alignment });
  } catch (err) {
    req.log.error({ err }, "temporal GET failed");
    res.status(500).json({ error: "failed" });
  }
});

router.post("/temporal/:venueId/learn", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    await runTemporalLearningCycle(venueId);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "temporal learn failed");
    res.status(500).json({ error: "failed" });
  }
});

// ── Adaptive Optimizer ────────────────────────────────────────────────────────

router.get("/adaptive/:venueId/preview", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const opts = await generateOptimizations(venueId);
    res.json({ ok: true, optimizations: opts });
  } catch (err) {
    req.log.error({ err }, "adaptive preview failed");
    res.status(500).json({ error: "failed" });
  }
});

router.post("/adaptive/:venueId/run", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const result = await runAdaptiveCycle(venueId);
    res.json({ ok: true, ...result });
  } catch (err) {
    req.log.error({ err }, "adaptive run failed");
    res.status(500).json({ error: "failed" });
  }
});

router.get("/adaptive/:venueId/history", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const { rows } = await pool.query(
      `SELECT id, venue_id, optimization_type, trigger, delta_score, confidence,
              applied, rolled_back, outcome, outcome_score, created_at
       FROM adaptive_optimization_logs
       WHERE venue_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [venueId],
    );
    res.json({ ok: true, logs: rows });
  } catch (err) {
    req.log.error({ err }, "adaptive history failed");
    res.status(500).json({ error: "failed" });
  }
});

// ── Context Aggregation + Scoring ────────────────────────────────────────────

router.get("/context/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const ctx   = await aggregateContext(venueId);
    const score = scoreContext(ctx);
    res.json({ ok: true, context: ctx, score });
  } catch (err) {
    req.log.error({ err }, "context GET failed");
    res.status(500).json({ error: "failed" });
  }
});

router.post("/context/:venueId/replay", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const { fromTs, toTs } = req.body as { fromTs?: string; toTs?: string };
  try {
    const from = fromTs ? new Date(fromTs) : new Date(Date.now() - 60 * 60 * 1000);
    const to   = toTs   ? new Date(toTs)   : new Date();
    const window = await replayContextWindow(venueId, from, to);
    res.json({ ok: true, window });
  } catch (err) {
    req.log.error({ err }, "context replay failed");
    res.status(500).json({ error: "failed" });
  }
});

// ── Predictive Engines ────────────────────────────────────────────────────────

router.get("/predict/momentum/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const vector = await predictMomentum(venueId);
    res.json({ ok: true, vector });
  } catch (err) {
    req.log.error({ err }, "momentum prediction failed");
    res.status(500).json({ error: "failed" });
  }
});

router.get("/predict/engagement/:venueId", requireAuth, async (req, res) => {
  const venueId   = req.params["venueId"] as string;
  const horizon   = Math.min(Number(req.query["horizon"] ?? 30), 120);
  try {
    const forecast = await forecastEngagement(venueId, horizon);
    res.json({ ok: true, forecast });
  } catch (err) {
    req.log.error({ err }, "engagement forecast failed");
    res.status(500).json({ error: "failed" });
  }
});

router.get("/predict/conversion/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const window  = Math.min(Number(req.query["window"] ?? 30), 120);
  try {
    const forecast = await forecastConversions(venueId, window);
    res.json({ ok: true, forecast });
  } catch (err) {
    req.log.error({ err }, "conversion forecast failed");
    res.status(500).json({ error: "failed" });
  }
});

router.get("/predict/traffic/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const horizon = Math.min(Number(req.query["horizon"] ?? 60), 240);
  try {
    const forecast = await forecastTraffic(venueId, horizon);
    res.json({ ok: true, forecast });
  } catch (err) {
    req.log.error({ err }, "traffic forecast failed");
    res.status(500).json({ error: "failed" });
  }
});

router.get("/predict/environment/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const recommendation = await predictOptimalEnvironment(venueId);
    res.json({ ok: true, recommendation });
  } catch (err) {
    req.log.error({ err }, "environment prediction failed");
    res.status(500).json({ error: "failed" });
  }
});

// ── Venue State Engine ────────────────────────────────────────────────────────

router.get("/state/venue/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const state = await getVenueState(venueId);
    res.json({ ok: true, state });
  } catch (err) {
    req.log.error({ err }, "venue state GET failed");
    res.status(500).json({ error: "failed" });
  }
});

router.patch("/state/venue/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const state = await updateVenueState(venueId, req.body as Record<string, unknown>);
    res.json({ ok: true, state });
  } catch (err) {
    req.log.error({ err }, "venue state PATCH failed");
    res.status(500).json({ error: "failed" });
  }
});

router.post("/state/venue/:venueId/replay", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const { asOf } = req.body as { asOf?: string };
  try {
    const state = await replayVenueState(venueId, asOf ? new Date(asOf) : new Date());
    res.json({ ok: true, state });
  } catch (err) {
    req.log.error({ err }, "venue state replay failed");
    res.status(500).json({ error: "failed" });
  }
});

// ── Guest State Engine ────────────────────────────────────────────────────────

router.get("/state/guests/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const guests = getActiveGuests(venueId);
    res.json({ ok: true, guests });
  } catch (err) {
    req.log.error({ err }, "guest state GET failed");
    res.status(500).json({ error: "failed" });
  }
});

router.get("/state/guest/:venueId/:guestId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const guestId = req.params["guestId"] as string;
  try {
    const state = getGuestState(venueId, guestId);
    res.json({ ok: true, state });
  } catch (err) {
    req.log.error({ err }, "guest state GET failed");
    res.status(500).json({ error: "failed" });
  }
});

router.patch("/state/guest/:venueId/:guestId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const guestId = req.params["guestId"] as string;
  try {
    const state = await updateGuestState(venueId, guestId, req.body as Record<string, unknown>);
    res.json({ ok: true, state });
  } catch (err) {
    req.log.error({ err }, "guest state PATCH failed");
    res.status(500).json({ error: "failed" });
  }
});

// ── Environmental Memory + Atmosphere ─────────────────────────────────────────

router.get("/environment/:venueId/effectiveness", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const scenes = await getSceneEffectiveness(venueId);
    res.json({ ok: true, scenes });
  } catch (err) {
    req.log.error({ err }, "env effectiveness GET failed");
    res.status(500).json({ error: "failed" });
  }
});

router.post("/environment/:venueId/record", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    await recordSceneOutcome(venueId, req.body);
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "env record POST failed");
    res.status(500).json({ error: "failed" });
  }
});

router.post("/environment/:venueId/optimize", requireAuth, async (req, res) => {
  const venueId   = req.params["venueId"] as string;
  const autoApply = Boolean((req.body as { autoApply?: boolean }).autoApply ?? false);
  try {
    const result = await optimizeAtmosphere(venueId, autoApply);
    res.json({ ok: true, result });
  } catch (err) {
    req.log.error({ err }, "atmosphere optimize failed");
    res.status(500).json({ error: "failed" });
  }
});

// ── Behavioral Intelligence ───────────────────────────────────────────────────

router.get("/behavior/preferences/:venueId/:guestId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const guestId = req.params["guestId"] as string;
  try {
    const vector = await buildPreferenceVector(guestId, venueId);
    res.json({ ok: true, vector });
  } catch (err) {
    req.log.error({ err }, "preference vector GET failed");
    res.status(500).json({ error: "failed" });
  }
});

router.get("/behavior/score/:venueId/:guestId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const guestId = req.params["guestId"] as string;
  try {
    const score = await scoreBehavior(guestId, venueId);
    res.json({ ok: true, score });
  } catch (err) {
    req.log.error({ err }, "behavioral score GET failed");
    res.status(500).json({ error: "failed" });
  }
});

// ── Orchestration Queue ───────────────────────────────────────────────────────

router.get("/queue/:venueId/status", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const status = getQueueStatus(venueId);
    res.json({ ok: true, status });
  } catch (err) {
    req.log.error({ err }, "queue status failed");
    res.status(500).json({ error: "failed" });
  }
});

router.post("/queue/:venueId/enqueue", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const { actionType, payload, priority, idempotencyKey } = req.body as {
    actionType: string; payload?: Record<string, unknown>;
    priority?: number; idempotencyKey?: string;
  };
  try {
    const action = enqueue(venueId, actionType, payload ?? {}, { priority, idempotencyKey });
    res.json({ ok: true, action });
  } catch (err) {
    req.log.error({ err }, "queue enqueue failed");
    res.status(500).json({ error: "failed" });
  }
});

router.post("/queue/:venueId/pause", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try { pauseQueue(venueId); res.json({ ok: true }); }
  catch (err) { req.log.error({ err }); res.status(500).json({ error: "failed" }); }
});

router.post("/queue/:venueId/resume", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try { resumeQueue(venueId); res.json({ ok: true }); }
  catch (err) { req.log.error({ err }); res.status(500).json({ error: "failed" }); }
});

router.post("/queue/:venueId/flush", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try { const count = flushQueue(venueId); res.json({ ok: true, count }); }
  catch (err) { req.log.error({ err }); res.status(500).json({ error: "failed" }); }
});

// ── Orchestration Replay ──────────────────────────────────────────────────────

router.post("/replay/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const { fromTs, toTs, limit } = req.body as { fromTs?: string; toTs?: string; limit?: number };
  try {
    const from = fromTs ? new Date(fromTs) : new Date(Date.now() - 60 * 60 * 1000);
    const to   = toTs   ? new Date(toTs)   : new Date();
    const sequence = await replayOrchestrationSequence(venueId, from, to, limit ?? 200);
    res.json({ ok: true, sequence });
  } catch (err) {
    req.log.error({ err }, "orchestration replay failed");
    res.status(500).json({ error: "failed" });
  }
});

// ── Orchestration Rollback ────────────────────────────────────────────────────

router.post("/rollback/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const { rollbackType, targetEventId, reason, requestedBy, compensating } = req.body as {
    rollbackType: string; targetEventId: string; reason: string;
    requestedBy?: string; compensating?: Record<string, unknown>;
  };
  try {
    const result = await rollback({
      venueId, rollbackType: rollbackType as "ambient_scene" | "feature_flag" | "orchestration_pause" | "adaptive_optimization" | "custom",
      targetEventId, reason,
      requestedBy: requestedBy ?? "admin",
      compensating: compensating ?? {},
    });
    res.json({ ok: true, result });
  } catch (err) {
    req.log.error({ err }, "rollback failed");
    res.status(500).json({ error: "failed" });
  }
});

// ── Live Telemetry ────────────────────────────────────────────────────────────

router.get("/telemetry/heatmap/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const heatmap = await computeHeatmap(venueId);
    res.json({ ok: true, heatmap });
  } catch (err) {
    req.log.error({ err }, "heatmap GET failed");
    res.status(500).json({ error: "failed" });
  }
});

router.get("/telemetry/metrics/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const window  = Math.min(Number(req.query["window"] ?? 30), 120);
  try {
    const metrics = await computeLiveMetrics(venueId, window);
    res.json({ ok: true, metrics });
  } catch (err) {
    req.log.error({ err }, "live metrics GET failed");
    res.status(500).json({ error: "failed" });
  }
});

router.get("/telemetry/sessions/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  try {
    const summary = await summarizeSessions(venueId);
    res.json({ ok: true, summary });
  } catch (err) {
    req.log.error({ err }, "sessions summary GET failed");
    res.status(500).json({ error: "failed" });
  }
});

// ── Orchestration Events (replay-safe event log) ─────────────────────────────

router.post("/events/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const { eventType, craftType, sessionId, guestId, payload, score } = req.body as {
    eventType: string; craftType?: string; sessionId?: string;
    guestId?: string; payload?: Record<string, unknown>; score?: number;
  };
  try {
    const { rows } = await pool.query(
      `INSERT INTO orchestration_events
         (venue_id, event_type, craft_type, session_id, guest_id, payload, score)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [venueId, eventType, craftType ?? null, sessionId ?? null,
       guestId ?? null, JSON.stringify(payload ?? {}), score ?? null],
    );
    res.json({ ok: true, id: (rows[0] as { id: string })?.id });
  } catch (err) {
    req.log.error({ err }, "event POST failed");
    res.status(500).json({ error: "failed" });
  }
});

router.get("/events/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const limit = Math.min(Number(req.query["limit"] ?? 100), 500);
  try {
    const { rows } = await pool.query(
      `SELECT * FROM orchestration_events
       WHERE venue_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [venueId, limit],
    );
    res.json({ ok: true, events: rows });
  } catch (err) {
    req.log.error({ err }, "events GET failed");
    res.status(500).json({ error: "failed" });
  }
});

export default router;
