/**
 * GET /api/analytics/venue/:id
 *
 * Rich per-venue analytics engine.  Returns:
 *   - topCigars        — most recommended + selected products
 *   - topSkipped       — most swiped-left products
 *   - topPairings      — most selected spirit pairings
 *   - topFood          — most selected food pairings
 *   - flavorTrends     — most requested flavor notes over time
 *   - boostedPerformance   — boosted product impression / selection data
 *   - sponsoredPerformance — sponsored product view + selection data
 *   - orderConversion  — order volume + cigar / pairing / food breakdown
 *
 * Requires: venue_owner, manager, or super_admin.
 * The requesting user must belong to the venue (or be super_admin).
 */

import { Router, type IRouter, type Response } from "express";
import { eq, inArray, sql, desc }               from "drizzle-orm";
import {
  db,
  analyticsEventsTable,
  userPreferencesTable,
  ordersTable,
} from "@workspace/db";
import { getAllInventory }              from "../services/boostService";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole }                 from "../middleware/roles";

const router: IRouter = Router();

// Helper: cast COUNT(*) to integer for clean JSON
const countInt = sql<number>`cast(count(*) as integer)`;

router.get(
  "/venue/:id",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response) => {

    const venueId  = req.params.id;
    const user     = req.user!;

    // Non-super_admin users may only query their own venue
    if (user.role !== "super_admin" && user.venueId !== venueId) {
      res.status(403).json({ error: "Access denied to this venue" });
      return;
    }

    // ── 1. Fetch event aggregates ──────────────────────────────────────────
    const [
      recommendRows,
      swipeRightRows,
      swipeLeftRows,
      pairingRows,
      foodRows,
      sponsoredRows,
    ] = await Promise.all([

      // Recommendations + product_selected views → top cigars
      db.select({ productId: analyticsEventsTable.productId, cnt: countInt })
        .from(analyticsEventsTable)
        .where(inArray(analyticsEventsTable.eventType, ["recommendation", "recommendation_view", "product_selected"]))
        .groupBy(analyticsEventsTable.productId)
        .orderBy(desc(sql`count(*)`))
        .limit(15),

      // Swipe rights → engagement signal
      db.select({ productId: analyticsEventsTable.productId, cnt: countInt })
        .from(analyticsEventsTable)
        .where(eq(analyticsEventsTable.eventType, "swipe_right"))
        .groupBy(analyticsEventsTable.productId)
        .orderBy(desc(sql`count(*)`))
        .limit(15),

      // Swipe lefts → skip / rejection signal
      db.select({ productId: analyticsEventsTable.productId, cnt: countInt })
        .from(analyticsEventsTable)
        .where(eq(analyticsEventsTable.eventType, "swipe_left"))
        .groupBy(analyticsEventsTable.productId)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      // Pairing selections
      db.select({ productId: analyticsEventsTable.productId, cnt: countInt })
        .from(analyticsEventsTable)
        .where(eq(analyticsEventsTable.eventType, "pairing_selected"))
        .groupBy(analyticsEventsTable.productId)
        .orderBy(desc(sql`count(*)`))
        .limit(8),

      // Food selections
      db.select({ productId: analyticsEventsTable.productId, cnt: countInt })
        .from(analyticsEventsTable)
        .where(eq(analyticsEventsTable.eventType, "food_selected"))
        .groupBy(analyticsEventsTable.productId)
        .orderBy(desc(sql`count(*)`))
        .limit(8),

      // Sponsored views
      db.select({ productId: analyticsEventsTable.productId, cnt: countInt })
        .from(analyticsEventsTable)
        .where(eq(analyticsEventsTable.eventType, "sponsored_view"))
        .groupBy(analyticsEventsTable.productId),
    ]);

    // ── 2. Flavor trends from user_preferences ─────────────────────────────
    // Unnest the JSON array of flavor strings and count occurrences.
    const flavorResult = await db.execute<{ flavor: string; cnt: number }>(sql`
      SELECT
        elem.value::text          AS flavor,
        cast(count(*) as integer) AS cnt
      FROM   user_preferences   up,
             json_array_elements_text(up.flavor_preferences) AS elem(value)
      WHERE  (up.venue_id = ${venueId}::uuid OR up.venue_id IS NULL)
      GROUP  BY elem.value
      ORDER  BY cnt DESC
      LIMIT  12
    `);
    const flavorRows = flavorResult.rows ?? [];

    // ── 3. Order conversion ─────────────────────────────────────────────────
    const orderResult = await db.execute<{
      total_orders: number;
      with_cigar:   number;
      with_pairing: number;
      with_food:    number;
    }>(sql`
      SELECT
        cast(count(*)                                              as integer) AS total_orders,
        cast(count(*) FILTER (WHERE cigar_id IS NOT NULL)         as integer) AS with_cigar,
        cast(count(*) FILTER (WHERE drink_id IS NOT NULL)         as integer) AS with_pairing,
        cast(count(*) FILTER (WHERE food_id  IS NOT NULL)         as integer) AS with_food
      FROM orders
      WHERE (venue_id = ${venueId}::uuid OR venue_id IS NULL)
    `);
    const orderStats = orderResult.rows?.[0];

    // ── 4. Build product lookup from in-memory inventory ───────────────────
    const inventory   = getAllInventory();
    const productMap  = new Map(inventory.map((p) => [p.id, p]));
    const swipeRightM = new Map(swipeRightRows.map((r) => [r.productId, r.cnt]));
    const swipeLeftM  = new Map(swipeLeftRows.map((r)  => [r.productId, r.cnt]));
    const sponsoredM  = new Map(sponsoredRows.map((r)  => [r.productId, r.cnt]));

    // ── 5. Assemble response ───────────────────────────────────────────────

    const topCigars = recommendRows
      .filter((r) => r.productId)
      .map((r) => {
        const p = productMap.get(r.productId!);
        return {
          productId:   r.productId,
          name:        p?.name ?? r.productId,
          impressions: r.cnt,
          swipeRights: swipeRightM.get(r.productId!) ?? 0,
          swipeLefts:  swipeLeftM.get(r.productId!)  ?? 0,
          tier:        p?.tier,
          boostLevel:  p?.boostLevel ?? 0,
          sponsored:   p?.sponsored ?? false,
        };
      });

    const topSkipped = swipeLeftRows
      .filter((r) => r.productId)
      .map((r) => ({
        productId: r.productId,
        name:      productMap.get(r.productId!)?.name ?? r.productId,
        skips:     r.cnt,
      }));

    const topPairings = pairingRows
      .filter((r) => r.productId)
      .map((r) => ({
        productId:  r.productId,
        name:       productMap.get(r.productId!)?.name ?? r.productId,
        selections: r.cnt,
      }));

    const topFood = foodRows
      .filter((r) => r.productId)
      .map((r) => ({
        productId:  r.productId,
        name:       r.productId,   // food items aren't in product map — use id as fallback
        selections: r.cnt,
      }));

    const flavorTrends = flavorRows.map((r) => ({
      flavor: String(r.flavor),
      count:  Number(r.cnt),
    }));

    const boostedPerformance = inventory
      .filter((p) => p.boostLevel > 0)
      .map((p) => {
        const recRow = recommendRows.find((r) => r.productId === p.id);
        return {
          productId:   p.id,
          name:        p.name,
          boostLevel:  p.boostLevel,
          impressions: recRow?.cnt ?? 0,
          swipeRights: swipeRightM.get(p.id) ?? 0,
          swipeLefts:  swipeLeftM.get(p.id)  ?? 0,
        };
      })
      .sort((a, b) => b.impressions - a.impressions);

    const sponsoredPerformance = inventory
      .filter((p) => p.sponsored)
      .map((p) => ({
        productId:       p.id,
        name:            p.name,
        totalImpressions: recommendRows.find((r) => r.productId === p.id)?.cnt ?? 0,
        sponsoredViews:  sponsoredM.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.totalImpressions - a.totalImpressions);

    const stats = orderStats ?? { total_orders: 0, with_cigar: 0, with_pairing: 0, with_food: 0 };

    res.json({
      venueId,
      period: "all_time",
      topCigars,
      topSkipped,
      topPairings,
      topFood,
      flavorTrends,
      boostedPerformance,
      sponsoredPerformance,
      orderConversion: {
        totalOrders:  Number(stats.total_orders),
        withCigar:    Number(stats.with_cigar),
        withPairing:  Number(stats.with_pairing),
        withFood:     Number(stats.with_food),
        conversionRate: stats.total_orders > 0
          ? Math.round((Number(stats.with_cigar) / Number(stats.total_orders)) * 100)
          : 0,
      },
    });
  },
);

export default router;
