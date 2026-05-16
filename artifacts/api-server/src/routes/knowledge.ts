/**
 * Knowledge graph routes — /api/knowledge/*
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole }  from "../middleware/roles";
import { behavioralGraph, recordGuestOrder, recordSocialPairing, findSimilarGuests, loadFromDB as loadBehavioral } from "../knowledge/behavioralGraph";
import { venueGraph, registerVenue, linkGuestToVenue, findRelatedVenues, loadVenueNetwork } from "../knowledge/venueGraph";
import { recommendationGraph, recordRecommendation, recordPairing, getProductPairings, getGuestAcceptanceRate, loadPairings } from "../knowledge/recommendationGraph";
import { environmentalGraph, recordSceneTransition, recordSceneOutcome, graphStats as envGraphStats } from "../knowledge/environmentalGraph";
import { operationalGraph, recordOrchestrationDecision, recordStaffAction, getEffectiveActions, loadFromDB as loadOperational } from "../knowledge/operationalGraph";
import { registryStats, resolve, getEntity, registerEntity, warmFromDB } from "../knowledge/entityResolver";

const router = Router();

// ── Graph stats ──────────────────────────────────────────────────────────────

router.get("/stats", requireAuth, (req, res) => {
  res.json({
    behavioral:     behavioralGraph.stats(),
    venue:          venueGraph.stats(),
    recommendation: recommendationGraph.stats(),
    environmental:  environmentalGraph.stats(),
    operational:    operationalGraph.stats(),
    entityRegistry: registryStats(),
  });
});

// ── Behavioral graph ─────────────────────────────────────────────────────────

router.post("/behavioral/order", requireAuth, (req, res) => {
  const { guestId, productId, sessionId, strength } = req.body as Record<string, string | number>;
  if (!guestId || !productId || !sessionId) { res.status(400).json({ error: "guestId, productId, sessionId required" }); return; }
  recordGuestOrder(String(guestId), String(productId), String(sessionId), Number(strength ?? 0.7));
  res.json({ ok: true });
});

router.post("/behavioral/social", requireAuth, (req, res) => {
  const { guestId1, guestId2, strength } = req.body as Record<string, string | number>;
  if (!guestId1 || !guestId2) { res.status(400).json({ error: "guestId1 and guestId2 required" }); return; }
  recordSocialPairing(String(guestId1), String(guestId2), Number(strength ?? 0.6));
  res.json({ ok: true });
});

router.get("/behavioral/similar/:guestId", requireAuth, (req, res) => {
  const limit = parseInt(String((req.query as { limit?: string }).limit ?? "5"));
  res.json(findSimilarGuests(req.params.guestId as string, limit));
});

router.post("/behavioral/load/:venueId", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  await loadBehavioral(req.params.venueId as string);
  res.json(behavioralGraph.stats());
});

// ── Venue graph ──────────────────────────────────────────────────────────────

router.post("/venue/register", requireAuth, requireRole("admin", "super_admin"), (req, res) => {
  const { venueId, name, props } = req.body as { venueId: string; name: string; props?: Record<string, unknown> };
  if (!venueId || !name) { res.status(400).json({ error: "venueId and name required" }); return; }
  registerVenue(venueId, name, props);
  res.json({ ok: true });
});

router.get("/venue/related/:venueId", requireAuth, (req, res) => {
  res.json({ relatedVenues: findRelatedVenues(req.params.venueId as string) });
});

router.post("/venue/load", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  await loadVenueNetwork();
  res.json(venueGraph.stats());
});

// ── Recommendation graph ─────────────────────────────────────────────────────

router.post("/recommendation/outcome", requireAuth, (req, res) => {
  const { productId, productName, guestId, accepted, confidence } = req.body as Record<string, unknown>;
  if (!productId || !guestId) { res.status(400).json({ error: "productId and guestId required" }); return; }
  recordRecommendation(String(productId), String(productName ?? productId), String(guestId), Boolean(accepted), Number(confidence ?? 0.7));
  res.json({ ok: true });
});

router.post("/recommendation/pairing", requireAuth, (req, res) => {
  const { productAId, productAName, productBId, productBName, coOccurrences } = req.body as Record<string, unknown>;
  if (!productAId || !productBId) { res.status(400).json({ error: "productAId and productBId required" }); return; }
  recordPairing(String(productAId), String(productAName ?? productAId), String(productBId), String(productBName ?? productBId), Number(coOccurrences ?? 1));
  res.json({ ok: true });
});

router.get("/recommendation/pairings/:productId", requireAuth, (req, res) => {
  const limit = parseInt(String((req.query as { limit?: string }).limit ?? "5"));
  res.json(getProductPairings(req.params.productId as string, limit));
});

router.get("/recommendation/acceptance/:guestId", requireAuth, (req, res) => {
  res.json({ guestId: req.params.guestId, acceptanceRate: getGuestAcceptanceRate(req.params.guestId as string) });
});

router.post("/recommendation/load/:venueId", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  await loadPairings(req.params.venueId as string);
  res.json(recommendationGraph.stats());
});

// ── Environmental graph ──────────────────────────────────────────────────────

router.post("/environmental/transition", requireAuth, (req, res) => {
  const { fromScene, toScene, trigger, deltaEngagement } = req.body as Record<string, unknown>;
  if (!fromScene || !toScene || !trigger) { res.status(400).json({ error: "fromScene, toScene, trigger required" }); return; }
  recordSceneTransition(String(fromScene), String(toScene), String(trigger), Number(deltaEngagement ?? 0));
  res.json({ ok: true });
});

router.post("/environmental/outcome", requireAuth, (req, res) => {
  const { scene, craftType, hour, engagement } = req.body as Record<string, unknown>;
  if (!scene) { res.status(400).json({ error: "scene required" }); return; }
  recordSceneOutcome(String(scene), String(craftType ?? "smoke"), Number(hour ?? new Date().getHours()), Number(engagement ?? 0.5));
  res.json({ ok: true });
});

router.get("/environmental/stats", requireAuth, (req, res) => {
  res.json(envGraphStats());
});

// ── Operational graph ────────────────────────────────────────────────────────

router.post("/operational/decision", requireAuth, (req, res) => {
  const { ruleId, ruleName, trigger, actions, outcome, venueId } = req.body as Record<string, unknown>;
  if (!ruleId || !venueId) { res.status(400).json({ error: "ruleId and venueId required" }); return; }
  recordOrchestrationDecision(String(ruleId), String(ruleName ?? ruleId), String(trigger ?? "unknown"), (actions as string[]) ?? [], outcome as "success" | "partial" | "failure" ?? "success", String(venueId));
  res.json({ ok: true });
});

router.get("/operational/actions/:trigger", requireAuth, (req, res) => {
  res.json({ trigger: req.params.trigger, actions: getEffectiveActions(req.params.trigger as string) });
});

router.post("/operational/load/:venueId", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  await loadOperational(req.params.venueId as string);
  res.json(operationalGraph.stats());
});

// ── Entity resolver ──────────────────────────────────────────────────────────

router.get("/entity/:system/:externalId", requireAuth, (req, res) => {
  const { system, externalId } = req.params as { system: string; externalId: string };
  const canonicalId = resolve(system as Parameters<typeof resolve>[0], externalId);
  if (!canonicalId) { res.status(404).json({ error: "entity not found" }); return; }
  res.json({ canonicalId, entity: getEntity(canonicalId) });
});

router.post("/entity/warm", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  await warmFromDB();
  res.json(registryStats());
});

export default router;
