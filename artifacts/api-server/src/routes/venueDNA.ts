/**
 * venueDNA — Phase 1: Venue DNA Profile routes.
 *
 * POST /api/venue-dna/signal                — absorb a behavioral signal
 * GET  /api/venue-dna/:venueId              — get DNA profile
 * GET  /api/venue-dna/:venueId/traits       — get individual trait scores
 * GET  /api/venue-dna/:venueId/patterns     — get detected behavior patterns
 * GET  /api/venue-dna/:venueId/directive    — get behavioral directive
 * POST /api/venue-dna/:venueId/detect-patterns — trigger pattern detection
 * POST /api/venue-dna/:venueId/refresh      — force DNA profile refresh
 * GET  /api/venue-dna/:venueId/personality  — get personality description
 */

import { Router } from "express";
import { z } from "zod";
import { VenueDNAService } from "../services/venueDNAService";
import { VenueBehaviorEngine } from "../services/venueBehaviorEngine";
import { PersonalityClassifierService } from "../services/personalityClassifierService";

const router = Router();

// ── Signal schema ─────────────────────────────────────────────────────────────

const signalSchema = z.object({
  venueId:    z.string().uuid(),
  signalType: z.enum(["swipe","challenge","handoff","reward","session","purchase","hesitation"]),
  craftType:  z.string().optional(),
  value:      z.number().default(1),
  metadata:   z.record(z.unknown()).optional(),
});

// ── POST /api/venue-dna/signal ────────────────────────────────────────────────

router.post("/signal", async (req, res) => {
  const parsed = signalSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid signal", issues: parsed.error.issues }); return; }
  await VenueDNAService.absorbSignal(parsed.data);
  res.status(202).json({ absorbed: true });
});

// ── GET /api/venue-dna/:venueId ───────────────────────────────────────────────

router.get("/:venueId", async (req, res) => {
  const profile = await VenueDNAService.getProfile(req.params["venueId"]!);
  if (!profile) { res.status(404).json({ error: "No DNA profile yet — absorb signals to initialize" }); return; }
  res.json(profile);
});

// ── GET /api/venue-dna/:venueId/traits ───────────────────────────────────────

router.get("/:venueId/traits", async (req, res) => {
  const traits = await VenueDNAService.getTraits(req.params["venueId"]!);
  res.json({ traits, count: traits.length });
});

// ── GET /api/venue-dna/:venueId/patterns ─────────────────────────────────────

router.get("/:venueId/patterns", async (req, res) => {
  const patterns = await VenueBehaviorEngine.getPatterns(req.params["venueId"]!);
  res.json({ patterns, count: patterns.length });
});

// ── GET /api/venue-dna/:venueId/directive ────────────────────────────────────

router.get("/:venueId/directive", async (req, res) => {
  const directive = await VenueBehaviorEngine.getDirective(req.params["venueId"]!);
  res.json(directive);
});

// ── POST /api/venue-dna/:venueId/detect-patterns ─────────────────────────────

router.post("/:venueId/detect-patterns", async (req, res) => {
  await VenueBehaviorEngine.detectPatterns(req.params["venueId"]!);
  res.json({ detected: true });
});

// ── POST /api/venue-dna/:venueId/refresh ─────────────────────────────────────

router.post("/:venueId/refresh", async (req, res) => {
  await VenueDNAService.refreshProfile(req.params["venueId"]!);
  const profile = await VenueDNAService.getProfile(req.params["venueId"]!);
  res.json({ refreshed: true, profile });
});

// ── GET /api/venue-dna/:venueId/personality ──────────────────────────────────

router.get("/:venueId/personality", async (req, res) => {
  const profile = await VenueDNAService.getProfile(req.params["venueId"]!);
  if (!profile) { res.status(404).json({ error: "No DNA profile yet" }); return; }
  const desc = PersonalityClassifierService.describePersonality(
    profile.personality_type as Parameters<typeof PersonalityClassifierService.describePersonality>[0]
  );
  const evLabel = PersonalityClassifierService.getEvolutionLabel(profile.evolution_stage);
  res.json({ ...desc, evolutionStage: profile.evolution_stage, evolutionLabel: evLabel, dnaSignature: profile.dna_signature });
});

export default router;
