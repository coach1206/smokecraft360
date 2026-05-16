/**
 * Edge layer routes — /api/edge/*
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole }  from "../middleware/roles";
import { edgeCoordinator } from "../edge/edgeCoordinator";
import { getBufferDepth, replayToCloud, purgeVenueBuffer } from "../edge/localReplay";
import { runOfflineInference, isInferenceReady } from "../edge/offlineInference";
import { edgeQueue } from "../edge/edgeQueue";
import { syncEdgeState, getSyncManifest } from "../edge/edgeStateSync";
import { offlineVenueMode } from "../edge/offlineVenueMode";
import { isLocalMode, getFailoverState } from "../edge/localFailover";

const router = Router();

// ── Status ──────────────────────────────────────────────────────────────────

router.get("/status", requireAuth, (req, res) => {
  const statuses = edgeCoordinator.getAllStatuses();
  res.json({ statuses, inferenceReady: isInferenceReady() });
});

router.get("/status/:venueId", requireAuth, (req, res) => {
  const venueId = req.params.venueId as string;
  const status  = edgeCoordinator.getStatus(venueId);
  res.json({
    status,
    failoverState:  getFailoverState(venueId),
    isLocalMode:    isLocalMode(venueId),
    bufferDepth:    getBufferDepth(venueId),
    queueDepth:     edgeQueue.size(venueId),
    queueStats:     edgeQueue.stats(),
  });
});

// ── Heartbeat / cloud reach ──────────────────────────────────────────────────

router.post("/heartbeat/:venueId", requireAuth, (req, res) => {
  const venueId = req.params.venueId as string;
  edgeCoordinator.markCloudReach(venueId);
  res.json({ ok: true, ts: Date.now() });
});

router.post("/fail/:venueId", requireAuth, requireRole("admin", "super_admin"), (req, res) => {
  const venueId = req.params.venueId as string;
  edgeCoordinator.markCloudFail(venueId);
  res.json({ ok: true, mode: "degraded" });
});

// ── Offline inference ────────────────────────────────────────────────────────

router.post("/infer/:venueId", requireAuth, (req, res) => {
  const venueId = req.params.venueId as string;
  const { task, context } = req.body as {
    task: "recommend" | "ambientScene" | "engagementScore" | "nextAction";
    context: Record<string, unknown>;
  };
  if (!task || !context) { res.status(400).json({ error: "task and context required" }); return; }
  const result = runOfflineInference({ venueId, task, context: context as Parameters<typeof runOfflineInference>[0]["context"] });
  res.json(result);
});

// ── Buffer / replay ──────────────────────────────────────────────────────────

router.get("/buffer/:venueId", requireAuth, (req, res) => {
  const venueId = req.params.venueId as string;
  res.json({ depth: getBufferDepth(venueId) });
});

router.post("/replay/:venueId", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  const venueId = req.params.venueId as string;
  const result  = await replayToCloud(venueId);
  res.json(result);
});

router.delete("/buffer/:venueId", requireAuth, requireRole("admin", "super_admin"), (req, res) => {
  const venueId = req.params.venueId as string;
  const count   = purgeVenueBuffer(venueId);
  res.json({ purged: count });
});

// ── State sync ───────────────────────────────────────────────────────────────

router.post("/sync/:venueId", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  const venueId  = req.params.venueId as string;
  const strategy = (req.body as { strategy?: string }).strategy ?? "merge_latest";
  const manifest = await syncEdgeState(venueId, strategy as Parameters<typeof syncEdgeState>[1]);
  res.json(manifest);
});

router.get("/sync/:venueId/status", requireAuth, (req, res) => {
  const venueId = req.params.venueId as string;
  const manifest = getSyncManifest(venueId);
  if (!manifest) { res.status(404).json({ error: "no sync manifest" }); return; }
  res.json(manifest);
});

// ── Offline venue mode ───────────────────────────────────────────────────────

router.get("/offline", requireAuth, requireRole("admin", "super_admin"), (req, res) => {
  res.json({ activeVenues: offlineVenueMode.getAllActive() });
});

router.get("/offline/:venueId", requireAuth, (req, res) => {
  const venueId = req.params.venueId as string;
  const state   = offlineVenueMode.getState(venueId);
  res.json({ active: !!state, state: state ?? null });
});

export default router;
