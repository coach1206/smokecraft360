/**
 * neuralSubstrate — Phase 0: Neural Substrate routes.
 *
 * POST /api/neural/ingest          — ingest a single raw event
 * POST /api/neural/ingest-bulk     — ingest batch of raw events
 * GET  /api/neural/stats/:venueId  — ingestion stats per venue
 * GET  /api/neural/pending/:venueId — pending (unprocessed) events
 * POST /api/neural/baseline/:venueId — trigger chaos baseline computation
 * GET  /api/neural/baseline/:venueId — get latest computed baseline
 * GET  /api/neural/baselines/:venueId — baseline history
 */

import { Router } from "express";
import { z } from "zod";
import { NeuralIngestionEngine } from "../services/neuralIngestionEngine";
import { ChaosAnalyticsService } from "../services/chaosAnalyticsService";

const router = Router();

// ── Ingest schemas ────────────────────────────────────────────────────────────

const ingestionSchema = z.object({
  venueId:       z.string().uuid().optional(),
  sessionId:     z.string().optional(),
  guestId:       z.string().optional(),
  deviceId:      z.string().optional(),
  eventType:     z.string().min(1).max(80),
  rawPayload:    z.record(z.unknown()).optional(),
  dwellMs:       z.number().nonnegative().optional(),
  hesitationMs:  z.number().nonnegative().optional(),
  interactionX:  z.number().optional(),
  interactionY:  z.number().optional(),
  ingestionPhase: z.enum(["shadow", "axiom", "hybrid"]).optional(),
});

const bulkSchema = z.object({
  events: z.array(ingestionSchema).min(1).max(500),
});

// ── POST /api/neural/ingest ───────────────────────────────────────────────────

router.post("/ingest", async (req, res) => {
  const parsed = ingestionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid event", issues: parsed.error.issues }); return; }
  const id = await NeuralIngestionEngine.ingest(parsed.data);
  res.status(201).json({ id, ingested: true });
});

// ── POST /api/neural/ingest-bulk ──────────────────────────────────────────────

router.post("/ingest-bulk", async (req, res) => {
  const parsed = bulkSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid bulk payload" }); return; }
  const count = await NeuralIngestionEngine.bulkIngest(parsed.data.events);
  res.status(201).json({ count, ingested: true });
});

// ── GET /api/neural/stats/:venueId ────────────────────────────────────────────

router.get("/stats/:venueId", async (req, res) => {
  const { venueId } = req.params;
  const stats = await NeuralIngestionEngine.getStats(venueId!);
  res.json(stats);
});

// ── GET /api/neural/pending/:venueId ─────────────────────────────────────────

router.get("/pending/:venueId", async (req, res) => {
  const { venueId } = req.params;
  const limit  = Math.min(500, parseInt(req.query["limit"] as string ?? "100", 10));
  const events = await NeuralIngestionEngine.getPendingBatch(venueId!, limit);
  res.json({ events, count: events.length });
});

// ── POST /api/neural/baseline/:venueId ───────────────────────────────────────

router.post("/baseline/:venueId", async (req, res) => {
  const { venueId } = req.params;
  const windowDays  = parseInt(req.body?.windowDays ?? "7", 10);
  const baseline    = await ChaosAnalyticsService.computeBaseline(venueId!, windowDays);
  res.json(baseline);
});

// ── GET /api/neural/baseline/:venueId ────────────────────────────────────────

router.get("/baseline/:venueId", async (req, res) => {
  const { venueId } = req.params;
  const baseline    = await ChaosAnalyticsService.getLatestBaseline(venueId!);
  if (!baseline) { res.status(404).json({ error: "No baseline computed yet" }); return; }
  res.json(baseline);
});

// ── GET /api/neural/baselines/:venueId ───────────────────────────────────────

router.get("/baselines/:venueId", async (req, res) => {
  const { venueId } = req.params;
  const limit    = Math.min(90, parseInt(req.query["limit"] as string ?? "30", 10));
  const baselines = await ChaosAnalyticsService.getAllBaselines(venueId!, limit);
  res.json({ baselines, count: baselines.length });
});

export default router;
