/**
 * plumbing — Infrastructure Observability & Control routes.
 *
 * GET  /api/plumbing/bus/status          — NeuralEventBus active topics + recent history
 * GET  /api/plumbing/bus/history/:topic  — last N events for a topic
 * GET  /api/plumbing/venue-state/:venueId — full VenueStateEngine snapshot
 * GET  /api/plumbing/blackbox/:venueId   — edge cache snapshot from disk
 * POST /api/plumbing/blackbox/:venueId/snapshot — force a venue soul snapshot
 * GET  /api/plumbing/affiliate/:venueId  — recent affiliate events
 * POST /api/plumbing/affiliate           — record an affiliate event
 * POST /api/plumbing/mqtt/dispatch       — manually dispatch an MQTT message
 * POST /api/plumbing/mqtt/probe/:venueId — hardware probe
 */

import { Router } from "express";
import { z }      from "zod";
import { NeuralEventBus, type BusTopic }  from "../services/neuralEventBus";
import { VenueStateEngine }               from "../services/venueStateEngine";
import { BlackBoxRecovery }               from "../services/blackBoxRecovery";
import { AffiliateService, type AffiliateSource } from "../services/affiliateService";
import { MqttBridgeService }              from "../services/mqttBridgeService";

const router = Router();

// ── Bus ───────────────────────────────────────────────────────────────────────

router.get("/bus/status", (_req, res) => {
  const topics = NeuralEventBus.topics();
  res.json({
    topics,
    recentActivity: topics.map(t => ({
      topic:   t,
      count:   NeuralEventBus.recentHistory(t).length,
      lastTs:  NeuralEventBus.recentHistory(t, 1)[0]?.ts ?? null,
    })),
    dbHealthy: BlackBoxRecovery.isDbHealthy(),
  });
});

router.get("/bus/history/:topic", (req, res) => {
  const topic  = req.params["topic"] as BusTopic;
  const limit  = parseInt(req.query["limit"] as string ?? "10", 10);
  const events = NeuralEventBus.recentHistory(topic, limit);
  res.json({ topic, events, count: events.length });
});

// ── Venue State ───────────────────────────────────────────────────────────────

router.get("/venue-state/:venueId", (req, res) => {
  const snap = VenueStateEngine.snapshot(req.params["venueId"]!);
  res.json(snap);
});

// ── BlackBox ──────────────────────────────────────────────────────────────────

router.get("/blackbox/:venueId", (req, res) => {
  const snap = BlackBoxRecovery.getEdgeSnapshot(req.params["venueId"]!);
  if (!snap) { res.status(404).json({ error: "No edge snapshot found for this venue" }); return; }
  res.json(snap);
});

router.post("/blackbox/:venueId/snapshot", (req, res) => {
  const ok = BlackBoxRecovery.snapshotVenue(req.params["venueId"]!);
  res.json({ success: ok, venueId: req.params["venueId"], ts: new Date().toISOString() });
});

// ── Affiliate ─────────────────────────────────────────────────────────────────

router.get("/affiliate/:venueId", async (req, res) => {
  const limit  = parseInt(req.query["limit"] as string ?? "20", 10);
  const events = await AffiliateService.recentByVenue(req.params["venueId"]!, limit);
  res.json({ events, count: events.length });
});

const affiliateSchema = z.object({
  venueId:            z.string().uuid(),
  guestId:            z.string().optional(),
  source:             z.enum(["esim","insurance","product","experience"]),
  grossCents:         z.number().positive().int(),
  currency:           z.string().length(3).optional(),
  externalProductId:  z.string().optional(),
  metadata:           z.record(z.unknown()).optional(),
});

router.post("/affiliate", async (req, res) => {
  const parsed = affiliateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues }); return; }
  const event = await AffiliateService.record({
    ...parsed.data,
    source: parsed.data.source as AffiliateSource,
  });
  res.status(201).json(event);
});

// ── MQTT ──────────────────────────────────────────────────────────────────────

const mqttSchema = z.object({
  venueId: z.string(),
  topic:   z.string(),
  payload: z.union([z.string(), z.number(), z.boolean()]),
  qos:     z.union([z.literal(0), z.literal(1), z.literal(2)]).optional().default(1),
  retain:  z.boolean().optional().default(false),
});

router.post("/mqtt/dispatch", (req, res) => {
  const parsed = mqttSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid MQTT payload" }); return; }
  const { venueId, ...msg } = parsed.data;
  const result = MqttBridgeService.dispatch(venueId, msg);
  res.json(result);
});

router.post("/mqtt/probe/:venueId", (req, res) => {
  const result = MqttBridgeService.probe(req.params["venueId"]!);
  res.json(result);
});

export default router;
