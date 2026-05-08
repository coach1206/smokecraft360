/**
 * environmentalMode — Phase 4: Environmental AI Modes routes.
 *
 * GET  /api/env-mode/configs            — all mode configurations
 * GET  /api/env-mode/venue/:venueId     — current active mode for venue
 * POST /api/env-mode/venue/:venueId     — activate a mode
 * POST /api/env-mode/venue/:venueId/mood-shift — activate from mood shift signal
 */

import { Router } from "express";
import { z }      from "zod";
import { EnvironmentalModeEngine, type EnvironmentMode } from "../services/environmentalModeEngine";

const router = Router();

const VALID_MODES: EnvironmentMode[] = [
  "lounge","vip","peak_hour","relaxed_luxury","social","exploration","investor_shadow","default",
];

const activateSchema = z.object({
  mode:         z.enum(["lounge","vip","peak_hour","relaxed_luxury","social","exploration","investor_shadow","default"]),
  triggeredBy:  z.string().default("staff"),
  transitionMs: z.number().positive().max(8000).optional(),
});

const moodShiftSchema = z.object({
  suggestedMode: z.string(),
  guestId:       z.string().optional(),
});

router.get("/configs", (_req, res) => {
  res.json({ modes: EnvironmentalModeEngine.getAllConfigs(), count: VALID_MODES.length });
});

router.get("/venue/:venueId", (req, res) => {
  const state = EnvironmentalModeEngine.getVenueMode(req.params["venueId"]!);
  const config = EnvironmentalModeEngine.getConfig(state.mode);
  res.json({ ...state, config });
});

router.post("/venue/:venueId", async (req, res) => {
  const parsed = activateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid mode payload", issues: parsed.error.issues }); return; }
  const config = await EnvironmentalModeEngine.activateMode(
    req.params["venueId"]!, parsed.data.mode, parsed.data.triggeredBy, parsed.data.transitionMs,
  );
  res.json({ activated: true, config });
});

router.post("/venue/:venueId/mood-shift", async (req, res) => {
  const parsed = moodShiftSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid mood shift payload" }); return; }
  const config = await EnvironmentalModeEngine.activateFromMoodShift(req.params["venueId"]!, parsed.data.suggestedMode);
  res.json({ activated: true, config, triggeredBy: "mood_shift" });
});

export default router;
