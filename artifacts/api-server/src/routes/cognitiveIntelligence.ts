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
