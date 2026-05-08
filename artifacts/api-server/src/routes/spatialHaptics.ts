/**
 * spatialHaptics — Phase 2: Spatial Haptics + Sonic DNA routes.
 *
 * POST /api/haptics/trigger              — trigger a haptic event
 * POST /api/haptics/xp-burst            — shortcut: XP burst haptic
 * POST /api/haptics/level-up            — shortcut: level up haptic
 * POST /api/haptics/vip-entrance        — shortcut: VIP entrance haptic
 * POST /api/haptics/craft-reveal        — shortcut: craft reveal haptic
 * GET  /api/haptics/capabilities        — adapter capabilities + deployment tier
 *
 * POST /api/acoustic/emit               — emit an acoustic event
 * POST /api/acoustic/craft/:craftType   — emit craft-specific acoustic
 * POST /api/acoustic/heartbeat/:venueId — emit lounge heartbeat
 *
 * GET  /api/sonic-dna/:venueId          — get venue Sonic DNA
 * POST /api/sonic-dna/:venueId/load     — compute Sonic DNA from venue profile
 * PATCH /api/sonic-dna/:venueId         — update Sonic DNA fields
 */

import { Router } from "express";
import { z } from "zod";
import { HapticResonanceService } from "../services/haptics/HapticResonanceService";
import { SpatialAcousticEngine }  from "../services/haptics/SpatialAcousticEngine";

HapticResonanceService.init();

const router = Router();

// ── Haptic schemas ────────────────────────────────────────────────────────────

const triggerSchema = z.object({
  pattern:    z.enum(["confirmation","success","alert","ambient","xp_burst","level_up","vip_entrance","craft_reveal","transition","error"]),
  intensity:  z.enum(["whisper","subtle","moderate","strong","full"]).optional(),
  targets:    z.array(z.enum(["all_devices","staff_wearables","kiosk_surfaces","floor_system","ambient_speakers","scent_diffusers","wall_displays","ui_feedback"])).optional(),
  durationMs: z.number().positive().max(10000).optional(),
  venueId:    z.string().uuid().optional(),
  zoneId:     z.string().optional(),
  guestId:    z.string().optional(),
  metadata:   z.record(z.unknown()).optional(),
});

const acousticSchema = z.object({
  profile:    z.enum(["heartbeat","crystalline","ember","pour","vapor","social","silence"]),
  intensity:  z.enum(["whisper","subtle","moderate","strong","full"]).optional(),
  durationMs: z.number().positive().max(30000).optional(),
  fadeMs:     z.number().nonnegative().optional(),
  venueId:    z.string().uuid().optional(),
});

// ── Haptic routes ─────────────────────────────────────────────────────────────

router.post("/haptics/trigger", async (req, res) => {
  const parsed = triggerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid haptic event", issues: parsed.error.issues }); return; }
  const result = await HapticResonanceService.trigger(parsed.data.pattern, parsed.data);
  res.json(result);
});

router.post("/haptics/xp-burst", async (req, res) => {
  const result = await HapticResonanceService.triggerXpBurst(req.body?.venueId, req.body?.guestId);
  res.json(result);
});

router.post("/haptics/level-up", async (req, res) => {
  const result = await HapticResonanceService.triggerLevelUp(req.body?.venueId, req.body?.guestId);
  res.json(result);
});

router.post("/haptics/vip-entrance", async (req, res) => {
  const { venueId, zoneId } = req.body ?? {};
  if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
  const result = await HapticResonanceService.triggerVipEntrance(venueId, zoneId);
  res.json(result);
});

router.post("/haptics/craft-reveal", async (req, res) => {
  const { craftType, venueId } = req.body ?? {};
  if (!craftType) { res.status(400).json({ error: "craftType required" }); return; }
  const result = await HapticResonanceService.triggerCraftReveal(craftType, venueId);
  res.json(result);
});

router.get("/haptics/capabilities", (_req, res) => {
  res.json(HapticResonanceService.getCapabilities());
});

// ── Acoustic routes ───────────────────────────────────────────────────────────

router.post("/acoustic/emit", async (req, res) => {
  const parsed = acousticSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid acoustic event" }); return; }
  const result = await SpatialAcousticEngine.emit(parsed.data.profile, parsed.data);
  res.json(result);
});

router.post("/acoustic/craft/:craftType", async (req, res) => {
  const { craftType } = req.params;
  const { venueId }   = req.body ?? {};
  await SpatialAcousticEngine.emitForCraft(craftType!, venueId);
  res.json({ emitted: true, craftType });
});

router.post("/acoustic/heartbeat/:venueId", async (req, res) => {
  const { venueId } = req.params;
  await SpatialAcousticEngine.emitLoungeHeartbeat(venueId!);
  res.json({ emitted: true, venueId });
});

// ── Sonic DNA routes ──────────────────────────────────────────────────────────

router.get("/sonic-dna/:venueId", async (req, res) => {
  const dna = SpatialAcousticEngine.getSonicDNA(req.params["venueId"]!);
  res.json(dna);
});

router.post("/sonic-dna/:venueId/load", async (req, res) => {
  const dna = await SpatialAcousticEngine.loadSonicDNA(req.params["venueId"]!);
  res.json(dna);
});

router.patch("/sonic-dna/:venueId", async (req, res) => {
  const dna = SpatialAcousticEngine.updateSonicDNA(req.params["venueId"]!, req.body);
  res.json(dna);
});

export default router;
