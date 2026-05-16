/**
 * /api/intelligence — Real-time intelligence layer API.
 *
 * POST /api/intelligence/event          — ingest a behavior event
 * GET  /api/intelligence/profile/:guestId — get guest preference profile
 * GET  /api/intelligence/venue/:venueId  — venue intelligence score
 * GET  /api/intelligence/engagement/:venueId — engagement summary
 * GET  /api/intelligence/context/:venueId — current operational context
 * GET  /api/intelligence/twin/:venueId   — digital twin state
 * POST /api/intelligence/evaluate/:venueId — trigger orchestration evaluation
 * GET  /api/intelligence/scenes          — ambient scene library
 * POST /api/intelligence/scene           — activate a scene
 */

import { Router } from "express";
import { z } from "zod";
import { ingestBehaviorEvent, getGuestProfile } from "../intelligence/behavior/aiMemoryEngine";
import { evaluateVenue, updateVenueContext } from "../intelligence/orchestration/orchestrationEngine";
import { activateScene, getSceneLibrary, getEffectivenessMap } from "../intelligence/ambient/ambientOrchestrator";
import { getVenueEngagementSummary } from "../intelligence/telemetry/engagementScoring";
import { buildOperationalContext } from "../cognition/context/contextEngine";
import { getTwinState } from "../cognition/digitalTwin/venueTwin";
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
    `SELECT * FROM venue_intelligence_scores
     WHERE venue_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [venueId],
  ).catch(() => ({ rows: [] }));
  return res.json({ score: rows[0] ?? null });
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
