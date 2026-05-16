/**
 * Learning layer routes — /api/learning/*
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole }  from "../middleware/roles";
import {
  scheduleTraining, getJob, listJobs, pruneJobs,
} from "../learning/modelTrainingPipeline";
import { getWeights, recordRewardSignal } from "../learning/reinforcementLearning";
import { processOutcome, batchTrain, getRecommendationWeights } from "../learning/recommendationTraining";
import { getRulePerformance, bootstrapFromHistory } from "../learning/orchestrationLearning";
import { recommendScene, persistModels } from "../learning/environmentalLearning";
import { generateBehavioralEmbedding, persistEmbedding, loadEmbedding, cosineSimilarity } from "../learning/behavioralEmbeddings";
import { buildFromDB as buildVenueEmbedding, persistVenueEmbedding } from "../learning/venueEmbeddings";

const router = Router();

// ── Training pipeline ────────────────────────────────────────────────────────

router.post("/train", requireAuth, requireRole("admin", "super_admin"), (req, res) => {
  const { domain, venueId } = req.body as { domain?: string; venueId?: string };
  if (!domain) { res.status(400).json({ error: "domain required" }); return; }
  const id = scheduleTraining(
    domain as Parameters<typeof scheduleTraining>[0],
    venueId,
  );
  res.status(202).json({ jobId: id, status: "pending" });
});

router.get("/jobs", requireAuth, requireRole("admin", "super_admin"), (req, res) => {
  const { domain } = req.query as { domain?: string };
  pruneJobs();
  res.json(listJobs(domain as Parameters<typeof listJobs>[0]));
});

router.get("/jobs/:id", requireAuth, requireRole("admin", "super_admin"), (req, res) => {
  const job = getJob(req.params.id as string);
  if (!job) { res.status(404).json({ error: "job not found" }); return; }
  res.json(job);
});

// ── Reinforcement learning ───────────────────────────────────────────────────

router.get("/weights/:domain/:venueId", requireAuth, (req, res) => {
  const { domain, venueId } = req.params as { domain: string; venueId: string };
  const wv = getWeights(domain as Parameters<typeof getWeights>[0], venueId);
  res.json(wv);
});

router.post("/reward", requireAuth, async (req, res) => {
  const signal = req.body as Parameters<typeof recordRewardSignal>[0];
  if (!signal.domain || !signal.venueId) { res.status(400).json({ error: "domain and venueId required" }); return; }
  const wv = await recordRewardSignal(signal);
  res.json(wv);
});

// ── Recommendation training ──────────────────────────────────────────────────

router.get("/rec-weights/:venueId", requireAuth, (req, res) => {
  res.json(getRecommendationWeights(req.params.venueId as string));
});

router.post("/rec-outcome", requireAuth, async (req, res) => {
  const outcome = req.body as Parameters<typeof processOutcome>[0];
  if (!outcome.venueId || !outcome.productId) { res.status(400).json({ error: "venueId + productId required" }); return; }
  await processOutcome(outcome);
  res.json({ ok: true });
});

router.post("/rec-batch/:venueId", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  const venueId    = req.params.venueId as string;
  const windowDays = Number((req.query as { window?: string }).window ?? 7);
  const weights    = await batchTrain(venueId, windowDays);
  res.json(weights);
});

// ── Orchestration learning ───────────────────────────────────────────────────

router.get("/orch-performance", requireAuth, requireRole("admin", "super_admin"), (req, res) => {
  res.json(getRulePerformance());
});

router.get("/orch-performance/:ruleId", requireAuth, (req, res) => {
  const perf = getRulePerformance(req.params.ruleId as string);
  if (!perf) { res.status(404).json({ error: "rule not found" }); return; }
  res.json(perf);
});

router.post("/orch-bootstrap/:venueId", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  await bootstrapFromHistory(req.params.venueId as string);
  res.json({ ok: true });
});

// ── Environmental learning ───────────────────────────────────────────────────

router.get("/env-scene/:venueId", requireAuth, (req, res) => {
  const { hour, day } = req.query as { hour?: string; day?: string };
  const now     = new Date();
  const h       = hour ? parseInt(hour) : now.getHours();
  const d       = day  ? parseInt(day)  : now.getDay();
  const rec     = recommendScene(req.params.venueId as string, h, d);
  if (!rec) { res.status(404).json({ error: "no model data yet" }); return; }
  res.json(rec);
});

router.post("/env-persist/:venueId", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  await persistModels(req.params.venueId as string);
  res.json({ ok: true });
});

// ── Embeddings ───────────────────────────────────────────────────────────────

router.post("/embeddings/behavioral", requireAuth, async (req, res) => {
  const profile = req.body as Parameters<typeof generateBehavioralEmbedding>[0];
  if (!profile.guestId) { res.status(400).json({ error: "guestId required" }); return; }
  const embedding = generateBehavioralEmbedding(profile);
  await persistEmbedding(profile.guestId, embedding);
  res.json({ guestId: profile.guestId, dims: embedding.length });
});

router.get("/embeddings/behavioral/:guestId", requireAuth, async (req, res) => {
  const embedding = await loadEmbedding(req.params.guestId as string);
  if (!embedding) { res.status(404).json({ error: "no embedding" }); return; }
  res.json({ guestId: req.params.guestId, embedding });
});

router.post("/embeddings/venue/:venueId", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  const venueId   = req.params.venueId as string;
  const embedding = await buildVenueEmbedding(venueId);
  if (!embedding) { res.status(404).json({ error: "no venue data" }); return; }
  await persistVenueEmbedding(venueId, embedding);
  res.json({ venueId, dims: embedding.length });
});

router.post("/embeddings/similarity", requireAuth, (req, res) => {
  const { a, b } = req.body as { a: number[]; b: number[] };
  if (!a || !b) { res.status(400).json({ error: "a and b required" }); return; }
  res.json({ similarity: cosineSimilarity(a, b) });
});

export default router;
