/**
 * Experience layer routes — /api/experience/*
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { generateTransition, ambientBreathParams, operationalFlashParams } from "../experience/cinematicTransitions";
import { buildMotionDirective, emitMotion } from "../experience/orchestrationMotion";
import { generateDirective, getLatestContext } from "../experience/adaptiveExperienceEngine";
import { predictNextScreen, getTopPredictions, updateTransitionModel } from "../experience/predictiveUI";
import { getLatestAmbientState } from "../experience/ambientInterfaceSync";
import { OPERATIONAL_TOKENS, getTokenForScore, buildMetricBadge, riskToState } from "../experience/operationalVisualLanguage";

const router = Router();

// ── Cinematic transitions ────────────────────────────────────────────────────

router.post("/transition", requireAuth, (req, res) => {
  const ctx = req.body as Parameters<typeof generateTransition>[0];
  res.json(generateTransition(ctx));
});

router.post("/transition/breathe", requireAuth, (req, res) => {
  const { intensity } = req.body as { intensity?: number };
  res.json(ambientBreathParams(intensity ?? 0.5));
});

router.post("/transition/flash", requireAuth, (req, res) => {
  const { severity } = req.body as { severity?: "info" | "warn" | "critical" };
  res.json(operationalFlashParams(severity ?? "info"));
});

// ── Motion directives ────────────────────────────────────────────────────────

router.post("/motion/:venueId", requireAuth, async (req, res) => {
  const { event, overrides } = req.body as { event: string; overrides?: Record<string, unknown> };
  if (!event) { res.status(400).json({ error: "event required" }); return; }
  await emitMotion(event as Parameters<typeof emitMotion>[0], req.params.venueId as string, overrides as Parameters<typeof emitMotion>[2]);
  res.json({ ok: true });
});

router.post("/motion/preview", requireAuth, (req, res) => {
  const { event, venueId } = req.body as { event: string; venueId: string };
  if (!event || !venueId) { res.status(400).json({ error: "event and venueId required" }); return; }
  const directive = buildMotionDirective(event as Parameters<typeof buildMotionDirective>[0], venueId);
  res.json(directive);
});

// ── Adaptive experience engine ───────────────────────────────────────────────

router.post("/directive/:venueId", requireAuth, async (req, res) => {
  const venueId = req.params.venueId as string;
  const { mode, context } = req.body as { mode?: string; context?: Record<string, unknown> };
  const ctx = context ?? await getLatestContext(venueId);
  if (!ctx) { res.status(404).json({ error: "no context data" }); return; }
  const directive = await generateDirective(venueId, (mode ?? "staff") as Parameters<typeof generateDirective>[1], ctx as Parameters<typeof generateDirective>[2]);
  res.json(directive);
});

// ── Predictive UI ────────────────────────────────────────────────────────────

router.get("/predict/:screen", requireAuth, (req, res) => {
  const { loyaltyTier, cartSize } = req.query as { loyaltyTier?: string; cartSize?: string };
  const prediction = predictNextScreen(
    req.params.screen as Parameters<typeof predictNextScreen>[0],
    { loyaltyTier: loyaltyTier ? parseInt(loyaltyTier) : undefined, cartSize: cartSize ? parseInt(cartSize) : undefined },
  );
  if (!prediction) { res.status(404).json({ error: "no prediction for screen" }); return; }
  res.json(prediction);
});

router.get("/predict/:screen/top", requireAuth, (req, res) => {
  const n = parseInt(String((req.query as { n?: string }).n ?? "3"));
  res.json(getTopPredictions(req.params.screen as Parameters<typeof getTopPredictions>[0], n));
});

router.post("/transition-log", requireAuth, async (req, res) => {
  const { venueId, from, to } = req.body as { venueId: string; from: string; to: string };
  if (!venueId || !from || !to) { res.status(400).json({ error: "venueId, from, to required" }); return; }
  await updateTransitionModel(venueId, from as Parameters<typeof updateTransitionModel>[1], to as Parameters<typeof updateTransitionModel>[2]);
  res.json({ ok: true });
});

// ── Ambient interface ────────────────────────────────────────────────────────

router.get("/ambient/:venueId", requireAuth, (req, res) => {
  const state = getLatestAmbientState(req.params.venueId as string);
  if (!state) { res.status(404).json({ error: "no ambient state" }); return; }
  res.json(state);
});

// ── Visual language ──────────────────────────────────────────────────────────

router.get("/tokens", requireAuth, (req, res) => {
  res.json(OPERATIONAL_TOKENS);
});

router.get("/token/score/:score", requireAuth, (req, res) => {
  const score = parseInt(req.params.score as string);
  res.json(getTokenForScore(score));
});

router.get("/token/risk/:risk", requireAuth, (req, res) => {
  const risk  = req.params.risk as Parameters<typeof riskToState>[0];
  const state = riskToState(risk);
  res.json(OPERATIONAL_TOKENS[state]);
});

router.post("/token/metric", requireAuth, (req, res) => {
  const { value, label, warn, danger, suffix } = req.body as { value: number; label: string; warn: number; danger: number; suffix?: string };
  res.json(buildMetricBadge(value, label, { warn, danger }, suffix));
});

export default router;
