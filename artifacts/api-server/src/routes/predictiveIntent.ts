/**
 * predictiveIntent — Phase 5: Predictive Intent Engine routes.
 *
 * POST /api/intent/predict     — compute intent prediction for a guest session
 * POST /api/intent/nudge       — execute a nudge from a prediction
 * POST /api/intent/auto        — predict + nudge in one call (most common)
 */

import { Router } from "express";
import { z }      from "zod";
import { IntentProbabilityEngine } from "../services/intentProbabilityEngine";
import { PredictiveNudgeService }  from "../services/predictiveNudgeService";

const router = Router();

const predictSchema = z.object({
  guestId:      z.string().optional(),
  sessionId:    z.string().optional(),
  venueId:      z.string().uuid().optional(),
  craftType:    z.string().optional(),
  moodShift:    z.object({ mood: z.string(), intensity: z.number() }).optional(),
  recentSwipes: z.array(z.object({ action: z.string(), ts: z.string() })).optional(),
});

router.post("/predict", async (req, res) => {
  const parsed = predictSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues }); return; }
  const prediction = await IntentProbabilityEngine.predict(parsed.data);
  res.json(prediction);
});

router.post("/nudge", async (req, res) => {
  const { prediction, context } = req.body ?? {};
  if (!prediction) { res.status(400).json({ error: "prediction required" }); return; }
  const result = await PredictiveNudgeService.execute(prediction, context ?? {});
  res.json(result);
});

router.post("/auto", async (req, res) => {
  const parsed = predictSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }
  const prediction = await IntentProbabilityEngine.predict(parsed.data);
  const nudge = prediction.confidence >= 55
    ? await PredictiveNudgeService.execute(prediction, {
        venueId:   parsed.data.venueId,
        guestId:   parsed.data.guestId,
        sessionId: parsed.data.sessionId,
      })
    : { executed: false, nudgeType: "none", action: "Below threshold", delayMs: 0 };
  res.json({ prediction, nudge });
});

export default router;
