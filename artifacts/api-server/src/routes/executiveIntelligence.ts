/**
 * Executive Intelligence API
 *
 * POST /api/executive-intelligence/room-energy
 *   Body: { sessions: ActiveSession[] }
 *   Computes energy scores for explicitly supplied session data.
 *   Use from kiosk / front-end real-time pipeline.
 *
 * GET  /api/executive-intelligence/venues/:venueId/room-energy
 *   Derives active sessions from behavior_event_logs (last 2 h window),
 *   computes energy per logical table group, returns ranked results.
 *
 * GET  /api/executive-intelligence/venues/:venueId/revenue-pressure
 *   Pulls venue inventory + trend scores, applies the pressure-point
 *   formula (velocity > 80% of stock), returns prioritised action list.
 *
 * All endpoints require staff, manager, venue_owner, or super_admin.
 */

import { Router, type IRouter, type Response } from "express";
import { sql }                                  from "drizzle-orm";
import { db }                                   from "@workspace/db";
import { z }                                    from "zod";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";
import {
  calculateRoomEnergy,
  identifyRevenuePressure,
  type ActiveSession,
  type PressureInput,
} from "../services/executiveIntelligenceService";
import { getVenueStock }  from "../services/venueInventoryStore";
import { getAllInventory } from "../services/boostService";
import { getTrendMap }    from "../services/trendStore";

const router: IRouter = Router();

const staffGuard = [
  requireAuth,
  requireRole("staff", "manager", "venue_owner", "super_admin"),
];

// ── Input schema for explicit POST ────────────────────────────────────────────

const sessionSchema = z.object({
  tableId:  z.string().min(1),
  sessionId: z.string().optional(),
  interactions: z.object({ perMinute: z.number().nonnegative() }),
  engagement:   z.object({ highTierHoverTime: z.number().nonnegative() }),
  dwell:        z.object({ current: z.number().nonnegative() }),
});

const roomEnergyBodySchema = z.object({
  sessions: z.array(sessionSchema).min(1).max(200),
});

// ── POST /room-energy — explicit session payload ──────────────────────────────

router.post(
  "/room-energy",
  ...staffGuard,
  async (req: AuthRequest, res: Response) => {
    const parsed = roomEnergyBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
      return;
    }

    const results = calculateRoomEnergy(parsed.data.sessions as ActiveSession[]);

    res.json({
      computedAt:  new Date().toISOString(),
      sessionCount: results.length,
      highMomentum: results.filter((r) => r.status === "HIGH_MOMENTUM").length,
      stagnant:     results.filter((r) => r.status === "STAGNATION_RISK").length,
      results,
    });
  },
);

// ── GET /venues/:venueId/room-energy — DB-derived active sessions ─────────────

router.get(
  "/venues/:venueId/room-energy",
  ...staffGuard,
  async (req: AuthRequest, res: Response) => {
    const venueId = String(req.params.venueId ?? "");
    const user    = req.user!;

    if (user.role !== "super_admin" && user.venueId !== venueId) {
      res.status(403).json({ error: "Access denied to this venue" });
      return;
    }

    // Pull behavior events from the last 2 hours, grouped by session_id.
    // Each session becomes one logical "table" entry.
    // swipeVelocity  = events per minute over the active window
    // premiumHover   = cumulative dwell proxy (count of product_selected events * 15s)
    // dwellCurrent   = seconds since session first event
    const rows = await db.execute<{
      session_id:        string;
      event_count:       number;
      premium_count:     number;
      window_minutes:    number;
      dwell_seconds:     number;
    }>(sql`
      SELECT
        session_id,
        cast(count(*)                                                          as integer) AS event_count,
        cast(count(*) FILTER (WHERE event_type IN (
          'PRODUCT_SELECTED', 'UPSELL_ACCEPTED'
        ))                                                                     as integer) AS premium_count,
        greatest(
          extract(epoch FROM (max(created_at) - min(created_at))) / 60.0,
          1
        )::float                                                                           AS window_minutes,
        extract(epoch FROM (now() - min(created_at)))::float                              AS dwell_seconds
      FROM behavior_event_logs
      WHERE venue_id   = ${venueId}
        AND created_at >= now() - interval '2 hours'
      GROUP BY session_id
      HAVING count(*) > 0
      ORDER BY dwell_seconds ASC
      LIMIT 100
    `);

    const sessions: ActiveSession[] = (rows.rows ?? []).map((r) => ({
      tableId:   r.session_id,          // session_id used as logical table identifier
      sessionId: r.session_id,
      interactions: {
        perMinute: Number(r.event_count)   / Math.max(Number(r.window_minutes), 1),
      },
      engagement: {
        highTierHoverTime: Number(r.premium_count) * 15, // 15s proxy per premium interaction
      },
      dwell: {
        current: Number(r.dwell_seconds),
      },
    }));

    const results = calculateRoomEnergy(sessions);

    res.json({
      venueId,
      computedAt:   new Date().toISOString(),
      windowHours:  2,
      sessionCount: results.length,
      highMomentum: results.filter((r) => r.status === "HIGH_MOMENTUM").length,
      stagnant:     results.filter((r) => r.status === "STAGNATION_RISK").length,
      results:      results.sort((a, b) => b.energyScore - a.energyScore),
    });
  },
);

// ── GET /venues/:venueId/revenue-pressure ─────────────────────────────────────

router.get(
  "/venues/:venueId/revenue-pressure",
  ...staffGuard,
  async (req: AuthRequest, res: Response) => {
    const venueId = String(req.params.venueId ?? "");
    const user    = req.user!;

    if (user.role !== "super_admin" && user.venueId !== venueId) {
      res.status(403).json({ error: "Access denied to this venue" });
      return;
    }

    const venueStock  = getVenueStock(venueId);
    const allProducts = getAllInventory();
    const trendMap    = getTrendMap();
    const productMap  = new Map(allProducts.map((p) => [p.id, p]));

    // Pull recent demand events (last 7 days) per product
    const demandRows = await db.execute<{
      product_id: string;
      demand_cnt: number;
    }>(sql`
      SELECT
        product_id,
        cast(count(*) as integer) AS demand_cnt
      FROM demand_events
      WHERE venue_id  = ${venueId}
        AND created_at >= now() - interval '7 days'
      GROUP BY product_id
    `);

    const demandMap = new Map(
      (demandRows.rows ?? []).map((r) => [r.product_id, Number(r.demand_cnt)]),
    );

    // Build pressure inputs — velocity = (trend score * 10) + demand events
    const inputs: PressureInput[] = [];

    for (const [productId, stock] of venueStock) {
      if (!stock.available) continue;
      const qty      = stock.quantity ?? 0;
      const trend    = trendMap.get(productId) ?? 0;
      const demand   = demandMap.get(productId) ?? 0;
      const velocity = (trend * 10) + demand;
      const meta     = productMap.get(productId);

      inputs.push({
        id:         productId,
        name:       meta?.name,
        category:   meta?.category,
        stockLevel: qty,
        velocity,
      });
    }

    // Also include products with demand but no venue stock entry
    for (const [productId, demand] of demandMap) {
      if (venueStock.has(productId)) continue;
      const trend  = trendMap.get(productId) ?? 0;
      const meta   = productMap.get(productId);
      inputs.push({
        id:         productId,
        name:       meta?.name,
        category:   meta?.category,
        stockLevel: 0,       // unknown — will be filtered by pressure fn (stockLevel > 0)
        velocity:   (trend * 10) + demand,
      });
    }

    const pressurePoints = identifyRevenuePressure(inputs);

    res.json({
      venueId,
      computedAt:     new Date().toISOString(),
      totalScanned:   inputs.length,
      pressureCount:  pressurePoints.length,
      critical:       pressurePoints.filter((p) => p.urgency === "CRITICAL").length,
      high:           pressurePoints.filter((p) => p.urgency === "HIGH").length,
      watch:          pressurePoints.filter((p) => p.urgency === "WATCH").length,
      pressurePoints,
    });
  },
);

export default router;
