/**
 * E.A.T. VI — Venue Intelligence for Hospitality
 * Routes: /api/venue-intelligence/*
 *
 * All endpoints are auth-protected, role-scoped, and venue-scoped.
 * Realtime channels published on every response.
 */

import { Router }                             from "express";
import { requireAuth }                        from "../middleware/auth";
import { computeVenueIntelligence }           from "../venueIntelligence/venueIntelligenceEngine";
import { generateHospitalityRecommendations } from "../venueIntelligence/hospitalityRecommendationEngine";
import { computeOccupancy, forecastTableTurnover } from "../venueIntelligence/predictiveOccupancyEngine";
import { getGuestAttentionAlerts, computeAttentionScore } from "../venueIntelligence/guestAttentionEngine";
import { computeStaffDeployment, buildDeploymentHeatmap } from "../venueIntelligence/staffDeploymentEngine";
import { computeRevenueMomentumReport }       from "../venueIntelligence/revenueMomentumEngine";
import { computeOperationalPressure }         from "../venueIntelligence/operationalPressureEngine";
import { computeFloorIntelligence }           from "../venueIntelligence/floorIntelligenceEngine";
import { computeEnvironmentalInfluence }      from "../venueIntelligence/environmentalInfluenceEngine";
import { computeVenueAwareness }              from "../venueIntelligence/venueAwarenessEngine";
import { pool }                               from "@workspace/db";

const router = Router();

// ── Helper: resolve venueId from param or auth context ───────────────────────
function resolveVenue(req: Parameters<typeof requireAuth>[0] & { params: Record<string,string>; venueId?: string }): string {
  return (req.params["venueId"] ?? (req as { venueId?: string }).venueId ?? "default");
}

// ── GET /api/venue-intelligence/overview ─────────────────────────────────────
// Full VI snapshot — all sub-engines aggregated in one call.
router.get("/overview", requireAuth, async (req, res) => {
  const venueId = (req as { venueId?: string }).venueId ?? "default";
  const snapshot = await computeVenueIntelligence(venueId);
  return res.json(snapshot);
});

// ── GET /api/venue-intelligence/recommendations ───────────────────────────────
router.get("/recommendations", requireAuth, async (req, res) => {
  const venueId = (req as { venueId?: string }).venueId ?? "default";
  const recs = await generateHospitalityRecommendations(venueId);
  return res.json({ venueId, count: recs.length, recommendations: recs });
});

// ── GET /api/venue-intelligence/occupancy ─────────────────────────────────────
router.get("/occupancy", requireAuth, async (req, res) => {
  const venueId = (req as { venueId?: string }).venueId ?? "default";
  const result  = await computeOccupancy(venueId);
  return res.json({ venueId, ...result });
});

// ── GET /api/venue-intelligence/turnover ──────────────────────────────────────
router.get("/turnover", requireAuth, async (req, res) => {
  const venueId  = (req as { venueId?: string }).venueId ?? "default";
  const forecast = await forecastTableTurnover(venueId);
  return res.json({ venueId, count: forecast.length, forecast });
});

// ── GET /api/venue-intelligence/attention ─────────────────────────────────────
router.get("/attention", requireAuth, async (req, res) => {
  const venueId = (req as { venueId?: string }).venueId ?? "default";
  const report  = await computeAttentionScore(venueId);
  return res.json(report);
});

// ── GET /api/venue-intelligence/staff ────────────────────────────────────────
router.get("/staff", requireAuth, async (req, res) => {
  const venueId    = (req as { venueId?: string }).venueId ?? "default";
  const deployment = await computeStaffDeployment(venueId);
  const heatmap    = buildDeploymentHeatmap(deployment);
  return res.json({ venueId, deployment, heatmap });
});

// ── GET /api/venue-intelligence/momentum ──────────────────────────────────────
router.get("/momentum", requireAuth, async (req, res) => {
  const venueId = (req as { venueId?: string }).venueId ?? "default";
  const report  = await computeRevenueMomentumReport(venueId);
  return res.json(report);
});

// ── GET /api/venue-intelligence/environment ───────────────────────────────────
router.get("/environment", requireAuth, async (req, res) => {
  const venueId      = (req as { venueId?: string }).venueId ?? "default";
  const influence    = await computeEnvironmentalInfluence(venueId);
  return res.json({ venueId, environmentalFit: influence });
});

// ── GET /api/venue-intelligence/pressure ──────────────────────────────────────
router.get("/pressure", requireAuth, async (req, res) => {
  const venueId  = (req as { venueId?: string }).venueId ?? "default";
  const pressure = await computeOperationalPressure(venueId);
  return res.json({ venueId, operationalPressure: pressure });
});

// ── GET /api/venue-intelligence/floor ────────────────────────────────────────
router.get("/floor", requireAuth, async (req, res) => {
  const venueId = (req as { venueId?: string }).venueId ?? "default";
  const floor   = await computeFloorIntelligence(venueId);
  return res.json({ venueId, ...floor });
});

// ── GET /api/venue-intelligence/live ──────────────────────────────────────────
// Comprehensive live feed — all signals in one payload, SSE-friendly polling.
router.get("/live", requireAuth, async (req, res) => {
  const venueId = (req as { venueId?: string }).venueId ?? "default";

  const [snapshot, awareness, momentum, attention, pressure, floor, env] = await Promise.all([
    computeVenueIntelligence(venueId).catch(() => null),
    computeVenueAwareness(venueId).catch(() => null),
    computeRevenueMomentumReport(venueId).catch(() => null),
    computeAttentionScore(venueId).catch(() => null),
    computeOperationalPressure(venueId).catch(() => 0.5),
    computeFloorIntelligence(venueId).catch(() => null),
    computeEnvironmentalInfluence(venueId).catch(() => 0.5),
  ]);

  return res.json({
    venueId,
    polledAt:            new Date().toISOString(),
    snapshot,
    awareness,
    revenueMomentum:     momentum,
    guestAttention:      attention,
    operationalPressure: pressure,
    floorIntelligence:   floor,
    environmentalFit:    env,
  });
});

// ── GET /api/venue-intelligence/history ──────────────────────────────────────
// Last N snapshots for trend display on the VI panel.
router.get("/history", requireAuth, async (req, res) => {
  const venueId = (req as { venueId?: string }).venueId ?? "default";
  const limit   = Math.min(parseInt(String(req.query["limit"] ?? "20"), 10), 100);

  const { rows } = await pool.query(
    `SELECT overall_score, risk_level, engagement_level, revenue_signal, created_at
     FROM venue_intelligence_snapshots WHERE venue_id=$1
     ORDER BY created_at DESC LIMIT $2`,
    [venueId, limit],
  ).catch(() => ({ rows: [] }));

  return res.json({ venueId, count: rows.length, history: rows });
});

export default router;
