/**
 * /api/data-intelligence — Data Intelligence + Market Reports
 *
 *   GET  /api/data-intelligence/overview         KPI summary          [ANALYTICS]
 *   GET  /api/data-intelligence/insights         AI insights          [ADVANCED_ANALYTICS]
 *   POST /api/data-intelligence/insights/refresh regenerate + save    [ADVANCED_ANALYTICS]
 *   GET  /api/data-intelligence/top-products     product funnel       [ANALYTICS]
 *   GET  /api/data-intelligence/flavors          flavor trends        [ANALYTICS]
 *   GET  /api/data-intelligence/strengths        strength trends      [ANALYTICS]
 *   GET  /api/data-intelligence/categories       category breakdown   [ANALYTICS]
 *   GET  /api/data-intelligence/hourly           activity heatmap     [ANALYTICS]
 *   GET  /api/data-intelligence/funnel           session funnel       [ANALYTICS]
 *   GET  /api/data-intelligence/revenue          daily revenue trend  [ANALYTICS]
 *   GET  /api/data-intelligence/optimizations    action recs          [ADVANCED_ANALYTICS]
 *   GET  /api/data-intelligence/market-report    distributor report   [NETWORK_INSIGHTS]
 */

import { Router, type Response }            from "express";
import { eq }                               from "drizzle-orm";
import { db, aiInsightsTable }              from "@workspace/db";
import { requireAuth, type AuthRequest }    from "../middleware/auth";
import { requireFeature }                   from "../middleware/requireFeature";
import {
  getVenueAnalytics,
  getRevenueOverview,
  getDailyRevenueTrend,
  getTopProducts,
  getFlavorTrends,
  getStrengthTrends,
  getCategoryBreakdown,
  getHourlyActivity,
  getSessionFunnel,
} from "../services/analyticsAggregationService";
import { generateVenueInsights, saveVenueInsights } from "../services/aiInsightService";
import { generateOptimizationRecommendations }       from "../services/optimizationService";
import { generateMarketReport }                      from "../services/marketReportService";

const router = Router();

// ── Resolve venueId ──────────────────────────────────────────────────────────

function resolveVenueId(req: AuthRequest): string | null {
  if (req.user?.role === "super_admin" && typeof req.query["venueId"] === "string") {
    return req.query["venueId"];
  }
  return req.user?.venueId ?? null;
}

const days = (req: AuthRequest) =>
  Math.max(1, Math.min(90, parseInt(String(req.query["days"] ?? "30"), 10)));

// ── KPI Overview ─────────────────────────────────────────────────────────────

router.get(
  "/overview",
  requireAuth,
  requireFeature("ANALYTICS"),
  async (req: AuthRequest, res: Response) => {
    const venueId = resolveVenueId(req);
    if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
    try {
      const [analytics, revenue] = await Promise.all([
        getVenueAnalytics(venueId, days(req)),
        getRevenueOverview(venueId, days(req)),
      ]);
      res.json({ analytics, revenue, venueId, days: days(req) });
    } catch (err) {
      req.log.error({ err }, "data-intelligence.overview failed");
      res.status(500).json({ error: "Failed to load overview" });
    }
  },
);

// ── AI Insights ───────────────────────────────────────────────────────────────

router.get(
  "/insights",
  requireAuth,
  requireFeature("ADVANCED_ANALYTICS"),
  async (req: AuthRequest, res: Response) => {
    const venueId = resolveVenueId(req);
    if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
    try {
      // Return stored insights if available, otherwise generate on-the-fly
      const stored = await db
        .select()
        .from(aiInsightsTable)
        .where(eq(aiInsightsTable.venueId, venueId));
      if (stored.length > 0) {
        res.json({ insights: stored, source: "cached" });
        return;
      }
      const fresh = await generateVenueInsights(venueId);
      res.json({ insights: fresh.map(i => ({ ...i, venueId })), source: "live" });
    } catch (err) {
      req.log.error({ err }, "data-intelligence.insights failed");
      res.status(500).json({ error: "Failed to load insights" });
    }
  },
);

// ── Regenerate insights ───────────────────────────────────────────────────────

router.post(
  "/insights/refresh",
  requireAuth,
  requireFeature("ADVANCED_ANALYTICS"),
  async (req: AuthRequest, res: Response) => {
    const venueId = resolveVenueId(req);
    if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
    try {
      await saveVenueInsights(venueId);
      const saved = await db.select().from(aiInsightsTable).where(eq(aiInsightsTable.venueId, venueId));
      res.json({ insights: saved, refreshed: true });
    } catch (err) {
      req.log.error({ err }, "insights.refresh failed");
      res.status(500).json({ error: "Failed to refresh insights" });
    }
  },
);

// ── Product funnel ────────────────────────────────────────────────────────────

router.get(
  "/top-products",
  requireAuth,
  requireFeature("ANALYTICS"),
  async (req: AuthRequest, res: Response) => {
    const venueId = resolveVenueId(req);
    if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
    try {
      res.json({ topProducts: await getTopProducts(venueId, 10, days(req)) });
    } catch (err) {
      req.log.error({ err }, "top-products failed");
      res.status(500).json({ error: "Failed to query top products" });
    }
  },
);

// ── Flavor trends ─────────────────────────────────────────────────────────────

router.get(
  "/flavors",
  requireAuth,
  requireFeature("ANALYTICS"),
  async (req: AuthRequest, res: Response) => {
    const venueId = resolveVenueId(req);
    if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
    try {
      res.json({ flavors: await getFlavorTrends(venueId, days(req)) });
    } catch (err) {
      req.log.error({ err }, "flavors failed");
      res.status(500).json({ error: "Failed to query flavor trends" });
    }
  },
);

// ── Strength trends ───────────────────────────────────────────────────────────

router.get(
  "/strengths",
  requireAuth,
  requireFeature("ANALYTICS"),
  async (req: AuthRequest, res: Response) => {
    const venueId = resolveVenueId(req);
    if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
    try {
      res.json({ strengths: await getStrengthTrends(venueId, days(req)) });
    } catch (err) {
      req.log.error({ err }, "strengths failed");
      res.status(500).json({ error: "Failed to query strength trends" });
    }
  },
);

// ── Category breakdown ────────────────────────────────────────────────────────

router.get(
  "/categories",
  requireAuth,
  requireFeature("ANALYTICS"),
  async (req: AuthRequest, res: Response) => {
    const venueId = resolveVenueId(req);
    if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
    try {
      res.json({ categories: await getCategoryBreakdown(venueId, days(req)) });
    } catch (err) {
      req.log.error({ err }, "categories failed");
      res.status(500).json({ error: "Failed to query categories" });
    }
  },
);

// ── Hourly activity ───────────────────────────────────────────────────────────

router.get(
  "/hourly",
  requireAuth,
  requireFeature("ANALYTICS"),
  async (req: AuthRequest, res: Response) => {
    const venueId = resolveVenueId(req);
    if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
    try {
      res.json({ hourly: await getHourlyActivity(venueId, days(req)) });
    } catch (err) {
      req.log.error({ err }, "hourly failed");
      res.status(500).json({ error: "Failed to query hourly activity" });
    }
  },
);

// ── Session funnel ────────────────────────────────────────────────────────────

router.get(
  "/funnel",
  requireAuth,
  requireFeature("ANALYTICS"),
  async (req: AuthRequest, res: Response) => {
    const venueId = resolveVenueId(req);
    if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
    try {
      res.json({ funnel: await getSessionFunnel(venueId, days(req)) });
    } catch (err) {
      req.log.error({ err }, "funnel failed");
      res.status(500).json({ error: "Failed to query session funnel" });
    }
  },
);

// ── Daily revenue trend ───────────────────────────────────────────────────────

router.get(
  "/revenue",
  requireAuth,
  requireFeature("ANALYTICS"),
  async (req: AuthRequest, res: Response) => {
    const venueId = resolveVenueId(req);
    if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
    try {
      res.json({ revenue: await getDailyRevenueTrend(venueId, days(req)) });
    } catch (err) {
      req.log.error({ err }, "revenue failed");
      res.status(500).json({ error: "Failed to query revenue" });
    }
  },
);

// ── Optimization recommendations ──────────────────────────────────────────────

router.get(
  "/optimizations",
  requireAuth,
  requireFeature("ADVANCED_ANALYTICS"),
  async (req: AuthRequest, res: Response) => {
    const venueId = resolveVenueId(req);
    if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
    try {
      const recs = await generateOptimizationRecommendations(venueId);
      res.json({ recommendations: recs });
    } catch (err) {
      req.log.error({ err }, "optimizations failed");
      res.status(500).json({ error: "Failed to generate optimizations" });
    }
  },
);

// ── Market report (distributor-facing) ───────────────────────────────────────

router.get(
  "/market-report",
  requireAuth,
  requireFeature("NETWORK_INSIGHTS"),
  async (req: AuthRequest, res: Response) => {
    const region   = String(req.query["region"]   ?? "ALL");
    const category = String(req.query["category"] ?? "ALL");
    try {
      const report = await generateMarketReport(region, category);
      res.json({ success: true, report });
    } catch (err) {
      req.log.error({ err }, "market-report failed");
      res.status(500).json({ error: "Failed to generate market report" });
    }
  },
);

export default router;
