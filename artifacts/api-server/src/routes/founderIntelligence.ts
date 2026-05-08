/**
 * founderIntelligence — Phase 6: Founder Intelligence routes.
 *
 * GET  /api/founder/heatmap/:venueId           — emotional heatmap snapshot
 * GET  /api/founder/opportunities/:venueId     — mapped opportunity zones
 * POST /api/founder/simulate/:venueId          — What-If energy simulation
 * GET  /api/founder/overview/:venueId          — composite god-view summary
 */

import { Router } from "express";
import { z }      from "zod";
import { EmotionalHeatmapEngine }  from "../services/emotionalHeatmapEngine";
import { OpportunityZoneMapper }   from "../services/opportunityZoneMapper";
import { EnvironmentalModeEngine } from "../services/environmentalModeEngine";
import { ChaosAnalyticsService }   from "../services/chaosAnalyticsService";
import { pool } from "@workspace/db";

const router = Router();

router.get("/heatmap/:venueId", async (req, res) => {
  const heatmap = await EmotionalHeatmapEngine.generate(req.params["venueId"]!);
  res.json(heatmap);
});

router.get("/opportunities/:venueId", async (req, res) => {
  const heatmap      = await EmotionalHeatmapEngine.generate(req.params["venueId"]!);
  const opportunities = OpportunityZoneMapper.map(heatmap);
  res.json({ opportunities, count: opportunities.length, generatedAt: heatmap.generatedAt });
});

const simulateSchema = z.object({
  energyDelta: z.number().min(-50).max(50),
});

router.post("/simulate/:venueId", async (req, res) => {
  const parsed = simulateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "energyDelta required (-50 to +50)" }); return; }
  const heatmap    = await EmotionalHeatmapEngine.generate(req.params["venueId"]!);
  const simulation = OpportunityZoneMapper.simulate(heatmap, parsed.data.energyDelta);
  res.json(simulation);
});

router.get("/overview/:venueId", async (req, res) => {
  const venueId = req.params["venueId"]!;

  const [heatmap, baseline, activeMode, liveStats] = await Promise.all([
    EmotionalHeatmapEngine.generate(venueId),
    ChaosAnalyticsService.getLatestBaseline(venueId),
    Promise.resolve(EnvironmentalModeEngine.getVenueMode(venueId)),
    pool.query<{ active: string; vip: string; handoff: string }>(`
      SELECT
        COUNT(*)                                        AS active,
        COUNT(*) FILTER (WHERE session_score >= 72)     AS vip,
        COUNT(*) FILTER (WHERE in_handoff = true)       AS handoff
      FROM guest_sessions
      WHERE status = 'active' AND created_at > NOW() - INTERVAL '4 hours'
    `).catch(() => ({ rows: [{ active: "0", vip: "0", handoff: "0" }] })),
  ]);

  const opportunities = OpportunityZoneMapper.map(heatmap);
  const ls = liveStats.rows[0]!;

  res.json({
    venueId,
    liveFloor: {
      activeGuests: parseInt(ls.active, 10),
      vipGuests:    parseInt(ls.vip,    10),
      inHandoff:    parseInt(ls.handoff, 10),
    },
    activeMode: {
      mode:        activeMode.mode,
      activatedAt: activeMode.activatedAt,
      triggeredBy: activeMode.triggeredBy,
    },
    heatmap: {
      globalTemp: heatmap.globalTemp,
      peakZone:   heatmap.peakZone,
      coldZone:   heatmap.coldZone,
      zoneCount:  heatmap.zones.length,
    },
    opportunities: {
      total:    opportunities.length,
      critical: opportunities.filter(o => o.priority === "critical").length,
      high:     opportunities.filter(o => o.priority === "high").length,
      topAction: opportunities[0]?.action ?? null,
    },
    axiomLift: baseline
      ? {
          conversionLift:  baseline.axiomLiftConversion,
          engagementLift:  baseline.axiomLiftEngagement,
        }
      : null,
    generatedAt: new Date().toISOString(),
  });
});

export default router;
