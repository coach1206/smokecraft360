/**
 * /api/intelligence — Real-time intelligence layer API.
 *
 * POST /api/intelligence/event              — ingest a behavior event
 * GET  /api/intelligence/profile/:guestId   — get guest preference profile
 * GET  /api/intelligence/venue/:venueId     — venue intelligence score
 * GET  /api/intelligence/engagement/:venueId— engagement summary
 * GET  /api/intelligence/context/:venueId   — current operational context
 * GET  /api/intelligence/twin/:venueId      — digital twin state
 * GET  /api/intelligence/hospitality/:venueId — unified VI panel payload
 * POST /api/intelligence/evaluate/:venueId  — trigger orchestration evaluation
 * GET  /api/intelligence/scenes             — ambient scene library
 * POST /api/intelligence/scene             — activate a scene
 */

import { Router } from "express";
import { z } from "zod";
import { ingestBehaviorEvent, getGuestProfile } from "../intelligence/behavior/aiMemoryEngine";
import { evaluateVenue, updateVenueContext } from "../intelligence/orchestration/orchestrationEngine";
import { activateScene, getSceneLibrary, getEffectivenessMap } from "../intelligence/ambient/ambientOrchestrator";
import { getVenueEngagementSummary } from "../intelligence/telemetry/engagementScoring";
import { buildOperationalContext } from "../cognition/context/contextEngine";
import { getTwinState } from "../cognition/digitalTwin/venueTwin";
import { computeAwarenessReport } from "../intelligence/awareness/operationalAwarenessEngine";
import { pool } from "@workspace/db";

const router = Router();

// ── POST /api/intelligence/event ──────────────────────────────────────────────
const behaviorEventSchema = z.object({
  guestId:   z.string(),
  venueId:   z.string(),
  sessionId: z.string().optional(),
  eventType: z.enum(["swipe_add","swipe_skip","purchase","upsell_accept","upsell_decline",
                      "session_start","session_end","product_view","pairing_click"]),
  craftType: z.string().optional(),
  productId: z.string().optional(),
  tags:      z.array(z.string()).optional(),
  context:   z.record(z.unknown()).optional(),
});

router.post("/event", async (req, res) => {
  const parsed = behaviorEventSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  await ingestBehaviorEvent(parsed.data);
  return res.json({ ok: true });
});

// ── GET /api/intelligence/profile/:guestId ────────────────────────────────────
router.get("/profile/:guestId", async (req, res) => {
  const venueId = req.query["venueId"] as string | undefined;
  const guestId = req.params["guestId"] as string;
  if (!venueId) return res.status(400).json({ error: "venueId required" });
  const profile = await getGuestProfile(guestId, venueId);
  return res.json({ profile });
});

// ── GET /api/intelligence/venue/:venueId ─────────────────────────────────────
router.get("/venue/:venueId", async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const { rows } = await pool.query(
    `SELECT * FROM operational_awareness_scores
     WHERE venue_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [venueId],
  ).catch(() => ({ rows: [] }));
  return res.json({ score: rows[0] ?? null });
});

// ── GET /api/intelligence/hospitality/:venueId ────────────────────────────────
// Unified E.A.T. VI payload — aggregates awareness, twin, engagement into one
// pre-shaped response that the VI panel can consume without field-name guessing.
router.get("/hospitality/:venueId", async (req, res) => {
  const venueId = req.params["venueId"] as string;

  const [report, twin, engagement] = await Promise.all([
    computeAwarenessReport(venueId).catch(() => null),
    getTwinState(venueId).catch(() => null),
    getVenueEngagementSummary(venueId).catch(() => null),
  ]);

  if (!report) return res.status(500).json({ error: "awareness engine unavailable" });

  // Engagement level label from guestSatisfaction
  const sat = report.guestSatisfaction;
  const engagementLevel =
    sat >= 0.75 ? "HIGH" :
    sat >= 0.50 ? "BUILDING" :
    sat >= 0.30 ? "LOW" : "CRITICAL";

  // Service signals derived from individual sub-scores
  type Urgency = "HIGH" | "MED" | "LOW";
  const serviceSignals: { table: string; signal: string; urgency: Urgency }[] = [];
  if (report.staffReadiness    < 0.40) serviceSignals.push({ table:"Main Floor",  signal:"Coverage thin — tables unattended",             urgency:"HIGH" });
  if (report.guestSatisfaction < 0.40) serviceSignals.push({ table:"VIP Section", signal:"Low satisfaction signals — check-in needed",     urgency:"HIGH" });
  if (report.socialMomentum    > 0.70) serviceSignals.push({ table:"Group Zone",  signal:"Peak social momentum — upsell window open",      urgency:"MED"  });
  if (report.inventoryHealth   < 0.50) serviceSignals.push({ table:"Bar Area",    signal:"Stock pressure detected — inform your server",   urgency:"MED"  });
  if (report.temporalAlignment > 0.75) serviceSignals.push({ table:"All Zones",   signal:"Prime-time window — maximise recommendation velocity", urgency:"MED" });
  if (serviceSignals.length === 0)     serviceSignals.push({ table:"All Tables",  signal:"Service levels nominal — no action required",   urgency:"LOW"  });

  // Staff deployment derived from staffReadiness + satisfaction
  type Priority = "URGENT" | "STANDARD" | "NOMINAL";
  const staffDeployment: { zone: string; action: string; priority: Priority }[] = [];
  staffDeployment.push({
    zone:     "Main Lounge",
    action:   report.staffReadiness < 0.35 ? "Deploy server immediately — floor understaffed" :
              report.staffReadiness < 0.60 ? "Consider additional coverage — readiness below threshold" :
              "Maintain current coverage",
    priority: report.staffReadiness < 0.35 ? "URGENT" : report.staffReadiness < 0.60 ? "STANDARD" : "NOMINAL",
  });
  staffDeployment.push({
    zone:     "VIP Section",
    action:   report.guestSatisfaction < 0.40 ? "Sommelier check-in recommended — satisfaction low" : "Standard VIP monitoring",
    priority: report.guestSatisfaction < 0.40 ? "URGENT" : "STANDARD",
  });
  staffDeployment.push({
    zone:     "Humidor Bar",
    action:   report.inventoryHealth < 0.40 ? "Inventory check needed — low stock signals" : "Coverage nominal",
    priority: report.inventoryHealth < 0.40 ? "STANDARD" : "NOMINAL",
  });

  // Occupancy forecast from twin trafficHeatmap
  const heatmap = (twin as { trafficHeatmap?: number[][] } | null)?.trafficHeatmap ?? [];
  const peakTraffic = heatmap.length ? Math.max(...heatmap.flat()) : 0;
  const occupancyForecast = [
    {
      table:    "Table 1",
      forecast: peakTraffic > 0.4 ? "High traffic zone — turnover imminent" : "Steady occupancy",
      eta:      peakTraffic > 0.4 ? "~10 min" : "~30 min",
    },
    {
      table:    "VIP 1",
      forecast: report.socialMomentum > 0.6 ? "Extended stay likely — group in full momentum" : "Departure possible",
      eta:      report.socialMomentum > 0.6 ? ">60 min" : "~20 min",
    },
    {
      table:    "Table 6",
      forecast: engagement?.trend === "declining" ? "Disengagement detected — guest may leave soon" : "Stable session",
      eta:      engagement?.trend === "declining" ? "~8 min" : "~35 min",
    },
  ];

  // Revenue signal from temporal alignment + social momentum
  const revenueSignal =
    report.temporalAlignment > 0.70 && report.socialMomentum > 0.50 ? "PRIME UPSELL WINDOW" :
    report.overallScore      > 0.65                                  ? "UPSELL WINDOW"       :
    report.overallScore      < 0.40                                  ? "RETENTION MODE"      : "STANDARD";

  // Active session count from twin guest map
  const twinGuests = (twin as { guestMap?: Record<string, unknown> } | null)?.guestMap;
  const activeSessions = twinGuests ? Object.keys(twinGuests).length : 0;

  return res.json({
    score:               report.overallScore,
    risk:                report.riskLevel,
    activeSessions,
    engagementLevel,
    staffReadiness:      report.staffReadiness,
    inventoryHealth:     report.inventoryHealth,
    socialMomentum:      report.socialMomentum,
    recommendations:     report.recommendations,
    serviceSignals,
    staffDeployment,
    occupancyForecast,
    activeScene:         "Smokecraft Dimmed Lounge",
    sceneOptions:        ["Deep Lounge", "VIP Reserve", "Bright Service", "Closing Ritual"],
    orchestrationStatus: report.riskLevel === "critical" ? "CRITICAL" : "ACTIVE",
    revenueSignal,
    lastSync:            new Date().toISOString(),
  });
});

// ── GET /api/intelligence/engagement/:venueId ─────────────────────────────────
router.get("/engagement/:venueId", async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const summary = await getVenueEngagementSummary(venueId);
  return res.json(summary);
});

// ── GET /api/intelligence/context/:venueId ────────────────────────────────────
router.get("/context/:venueId", async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const ctx = await buildOperationalContext(venueId);
  return res.json(ctx);
});

// ── GET /api/intelligence/twin/:venueId ──────────────────────────────────────
router.get("/twin/:venueId", async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const twin = await getTwinState(venueId);
  return res.json(twin);
});

// ── POST /api/intelligence/evaluate/:venueId ─────────────────────────────────
router.post("/evaluate/:venueId", async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const decisions = await evaluateVenue(venueId);
  return res.json({ decisions: decisions.length, results: decisions });
});

// ── GET /api/intelligence/scenes ──────────────────────────────────────────────
router.get("/scenes", (_req, res) => {
  return res.json({ scenes: getSceneLibrary() });
});

// ── POST /api/intelligence/scene ──────────────────────────────────────────────
const activateSceneSchema = z.object({
  venueId:     z.string(),
  sceneId:     z.string(),
  triggeredBy: z.string().default("operator"),
});

router.post("/scene", async (req, res) => {
  const parsed = activateSceneSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const scene = await activateScene(parsed.data.venueId, parsed.data.sceneId, parsed.data.triggeredBy);
  if (!scene) return res.status(404).json({ error: "Unknown scene" });
  return res.json({ scene });
});

// ── GET /api/intelligence/effectiveness/:venueId ─────────────────────────────
router.get("/effectiveness/:venueId", async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const map = await getEffectivenessMap(venueId);
  return res.json({ effectiveness: map });
});

// ── PATCH /api/intelligence/context/:venueId ─────────────────────────────────
router.patch("/context/:venueId", async (req, res) => {
  const venueId = req.params["venueId"] as string;
  await updateVenueContext(venueId, req.body as Record<string, unknown>);
  return res.json({ ok: true });
});

export default router;
