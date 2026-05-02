/**
 * GET /api/demand/insights — lightweight demand insights per venue.
 *
 * Returns the four key aggregates:
 *   topRequestedProducts   — highest demand score products
 *   topMissingProducts     — from missingDemand table (not stocked, most requested)
 *   topFlavors             — most requested flavor notes
 *   topCategories          — cigar vs alcohol session distribution
 *
 * Demand Score = views×0.5 + selections×1 + oos_requests×2 + orders×3 + blend_uses×2
 *
 * Requires: venue_owner, manager, or super_admin.
 */

import { Router, type IRouter, type Response } from "express";
import { desc, sql }                            from "drizzle-orm";
import {
  db,
  demandEventsTable,
  missingDemandTable,
  analyticsEventsTable,
  ordersTable,
  userPreferencesTable,
}                                               from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";
import { getAllInventory }                       from "../services/boostService";
import { getTrendMap }                          from "../services/trendStore";

const router: IRouter = Router();

router.get(
  "/insights",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const user    = req.user!;
    const venueId = (req.query.venueId as string | undefined)
                 ?? (user.role !== "super_admin" ? user.venueId : undefined);

    const inventory = getAllInventory();
    const productMap = new Map(inventory.map((p) => [p.id, p]));
    const trendMap   = getTrendMap();

    const venueClause = venueId
      ? sql`WHERE (venue_id = ${venueId}::uuid OR venue_id IS NULL)`
      : sql``;

    const [
      demandRows,
      missingRows,
      flavorRows,
      categoryRows,
      orderRows,
      analyticsRows,
    ] = await Promise.all([

      // Demand events by product × event_type
      db.execute<{ product_id: string; product_name: string | null; category: string | null; event_type: string; cnt: number }>(sql`
        SELECT
          product_id,
          MAX(product_name)         AS product_name,
          MAX(category)             AS category,
          event_type,
          cast(count(*) as integer) AS cnt
        FROM   demand_events
        ${venueClause}
        GROUP  BY product_id, event_type
        ORDER  BY cnt DESC
        LIMIT  300
      `),

      // missingDemand table — already aggregated
      db.select().from(missingDemandTable)
        .orderBy(desc(missingDemandTable.requestCount))
        .limit(10),

      // Flavor trends from user_preferences
      db.execute<{ flavor: string; cnt: number }>(sql`
        SELECT
          elem.value::text          AS flavor,
          cast(count(*) as integer) AS cnt
        FROM   user_preferences up,
               json_array_elements_text(up.flavor_preferences) AS elem(value)
        GROUP  BY elem.value
        ORDER  BY cnt DESC
        LIMIT  10
      `),

      // Category distribution
      db.select({
        category: userPreferencesTable.category,
        cnt:      sql<number>`cast(count(*) as integer)`,
      }).from(userPreferencesTable).groupBy(userPreferencesTable.category),

      // Orders
      db.execute<{ cigar_id: string | null; drink_id: string | null; cnt: number }>(sql`
        SELECT cigar_id, drink_id, cast(count(*) as integer) AS cnt
        FROM   orders
        ${venueId ? sql`WHERE venue_id = ${venueId}::uuid` : sql``}
        GROUP  BY cigar_id, drink_id
        LIMIT  100
      `),

      // Analytics selections / swipe_right
      db.execute<{ product_id: string; cnt: number }>(sql`
        SELECT product_id, cast(count(*) as integer) AS cnt
        FROM   analytics_events
        WHERE  event_type IN ('swipe_right', 'product_selected')
          AND  product_id IS NOT NULL
        GROUP  BY product_id
        LIMIT  200
      `),
    ]);

    // ── Build demand score map ────────────────────────────────────────────────

    type ScoreEntry = {
      productId: string; productName: string; category: string;
      views: number; selections: number; oosRequests: number;
      orders: number; blendUses: number; score: number; trendScore: number;
    };

    const scoreMap = new Map<string, ScoreEntry>();

    const ensureEntry = (productId: string, productName: string | null, cat: string | null): ScoreEntry => {
      if (!scoreMap.has(productId)) {
        const meta = productMap.get(productId);
        scoreMap.set(productId, {
          productId,
          productName: productName ?? meta?.name ?? productId,
          category:    cat         ?? meta?.category ?? "unknown",
          views: 0, selections: 0, oosRequests: 0,
          orders: 0, blendUses: 0, score: 0,
          trendScore: trendMap.get(productId) ?? 0,
        });
      }
      return scoreMap.get(productId)!;
    };

    const weights: Record<string, number> = {
      view: 0.5, selection: 1, oos_request: 2, order: 3, blend_use: 2, search: 1,
    };

    for (const row of demandRows.rows ?? []) {
      const entry = ensureEntry(row.product_id, row.product_name, row.category);
      const cnt   = Number(row.cnt);
      entry.score += cnt * (weights[row.event_type] ?? 1);
      if (row.event_type === "view")        entry.views       += cnt;
      if (row.event_type === "selection")   entry.selections  += cnt;
      if (row.event_type === "oos_request") entry.oosRequests += cnt;
      if (row.event_type === "blend_use")   entry.blendUses   += cnt;
    }

    // Analytics selections supplement
    for (const row of analyticsRows.rows ?? []) {
      if (!row.product_id) continue;
      const entry = ensureEntry(row.product_id, null, null);
      entry.selections += Number(row.cnt);
      entry.score      += Number(row.cnt) * weights.selection;
    }

    // Orders supplement
    for (const row of orderRows.rows ?? []) {
      if (row.cigar_id) {
        const e = ensureEntry(row.cigar_id, null, "cigar");
        e.orders += Number(row.cnt);
        e.score  += Number(row.cnt) * weights.order;
      }
      if (row.drink_id) {
        const e = ensureEntry(row.drink_id, null, "alcohol");
        e.orders += Number(row.cnt);
        e.score  += Number(row.cnt) * weights.order;
      }
    }

    const ranked = Array.from(scoreMap.values()).sort((a, b) => b.score - a.score);

    // ── Top missing products (from persisted missingDemand table) ─────────────
    const topMissingProducts = missingRows.map((row) => ({
      productId:       row.productId,
      productName:     row.productName ?? productMap.get(row.productId)?.name ?? row.productId,
      category:        row.category ?? productMap.get(row.productId)?.category ?? "unknown",
      requestCount:    row.requestCount,
      lastRequestedAt: row.lastRequestedAt,
      trendScore:      trendMap.get(row.productId) ?? 0,
    }));

    // ── Flavors ───────────────────────────────────────────────────────────────
    const topFlavors = (flavorRows.rows ?? []).map((r) => ({
      flavor: String(r.flavor),
      count:  Number(r.cnt),
    }));

    // ── Category distribution ─────────────────────────────────────────────────
    const totalCat = categoryRows.reduce((s, r) => s + r.cnt, 0) || 1;
    const topCategories = categoryRows.map((r) => ({
      category: r.category,
      count:    r.cnt,
      percent:  Math.round((r.cnt / totalCat) * 100),
    })).sort((a, b) => b.count - a.count);

    // ── Insight statements ────────────────────────────────────────────────────
    const insights: string[] = [];

    if (topMissingProducts.length > 0) {
      const top = topMissingProducts[0]!;
      insights.push(`Customers are requesting "${top.productName}" frequently — ${top.requestCount} unfulfilled request${top.requestCount > 1 ? "s" : ""}`);
    }
    if (topFlavors.length > 0) {
      insights.push(`"${topFlavors[0]!.flavor}" flavor profiles are trending — most requested tasting note`);
    }
    if (topMissingProducts.length > 0) {
      insights.push(`High demand for items not in stock — ${topMissingProducts.length} product${topMissingProducts.length > 1 ? "s" : ""} missing from inventory`);
    }
    if (ranked[0]) {
      insights.push(`"${ranked[0].productName}" is the most demanded product (score: ${Math.round(ranked[0].score)})`);
    }
    if (topCategories[0]) {
      insights.push(`${topCategories[0].category === "cigar" ? "Cigars" : "Spirits"} dominate ${topCategories[0].percent}% of guest sessions`);
    }

    res.json({
      generatedAt:         new Date().toISOString(),
      venueId:             venueId ?? null,
      topRequestedProducts: ranked.slice(0, 10),
      topMissingProducts,
      topFlavors,
      topCategories,
      insightStatements:   insights,
    });
  },
);

export default router;
