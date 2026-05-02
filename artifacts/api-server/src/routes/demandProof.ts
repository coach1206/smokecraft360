/**
 * Demand Proof Routes — revenue proof and opportunity engine for brands/distributors.
 *
 * GET /api/demand/proof            — full proof payload (scores, insights, opportunities, export)
 * GET /api/demand/opportunities    — cross-venue distributor opportunity signals
 *
 * Demand Score = selections×1 + oos_requests×2 + orders×3 + blend_uses×2
 *
 * Requires: venue_owner, manager, or super_admin.
 */

import { Router, type IRouter, type Response } from "express";
import { sql, desc }                           from "drizzle-orm";
import {
  db,
  demandEventsTable,
  demandRequestsTable,
  ordersTable,
  analyticsEventsTable,
  userPreferencesTable,
}                                              from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";
import { getAllInventory }                      from "../services/boostService";
import { getVenueStock }                       from "../services/venueInventoryStore";
import { getTrendMap }                         from "../services/trendStore";

const router: IRouter = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

interface DemandScore {
  productId:   string;
  productName: string;
  category:    string;
  score:       number;
  selections:  number;
  oosRequests: number;
  orders:      number;
  blendUses:   number;
  trendScore:  number;
  inStock:     boolean;
}

interface Opportunity {
  productId:    string;
  productName:  string;
  category:     string;
  totalRequests: number;
  venuesMissing: number;
  urgency:      "high" | "medium" | "low";
  statement:    string;
}

/** Generate natural-language insight statements from analytics data. */
function generateInsights(params: {
  topCigar?:          { name: string };
  topAlcohol?:        { name: string };
  missedSalesCount:   number;
  totalDemand:        number;
  totalOrders:        number;
  topFlavors:         { flavor: string; count: number }[];
  cigarPct:           number;
  alcoholPct:         number;
  trendMap:           Map<string, number>;
  topDemanded:        DemandScore[];
}): string[] {
  const lines: string[] = [];
  const {
    topCigar, topAlcohol, missedSalesCount, totalDemand, totalOrders,
    topFlavors, cigarPct, alcoholPct, topDemanded,
  } = params;

  // Conversion
  if (totalDemand > 0 && totalOrders > 0) {
    const convPct = Math.round((totalOrders / totalDemand) * 100);
    lines.push(`${convPct}% of customer demand signals convert to orders`);
  }

  // Missed revenue
  if (missedSalesCount > 0) {
    lines.push(`${missedSalesCount} product${missedSalesCount > 1 ? "s" : ""} generating demand with no inventory — missed revenue opportunity`);
  }

  // Category preference
  if (cigarPct > 0 && alcoholPct > 0) {
    if (cigarPct > alcoholPct) {
      lines.push(`Cigar demand leads spirits by ${cigarPct - alcoholPct}% across sessions`);
    } else if (alcoholPct > cigarPct) {
      lines.push(`Spirits demand leads cigars by ${alcoholPct - cigarPct}% across sessions`);
    }
  }

  // Top flavor
  if (topFlavors.length >= 2) {
    const top   = topFlavors[0];
    const second = topFlavors[1];
    if (top && second) {
      lines.push(`"${top.flavor}" is the top requested flavor profile — ${Math.round((top.count / (top.count + second.count)) * 100)}% more popular than "${second.flavor}"`);
    }
  } else if (topFlavors.length === 1 && topFlavors[0]) {
    lines.push(`"${topFlavors[0].flavor}" dominates flavor preference requests`);
  }

  // Top product
  if (topCigar) {
    lines.push(`"${topCigar.name}" is the most in-demand cigar on the platform`);
  }
  if (topAlcohol) {
    lines.push(`"${topAlcohol.name}" leads spirit demand this period`);
  }

  // High-score items with no stock
  const highDemandOos = topDemanded.filter((d) => !d.inStock && d.score >= 3).slice(0, 2);
  for (const item of highDemandOos) {
    lines.push(`"${item.productName}" has a demand score of ${item.score} but zero inventory — customers are being turned away`);
  }

  // Blend usage
  const blendTotal = topDemanded.reduce((s, d) => s + d.blendUses, 0);
  if (blendTotal > 0) {
    lines.push(`${blendTotal} custom blend creation${blendTotal > 1 ? "s" : ""} recorded — guests are engaging deeply with the experience`);
  }

  return lines.slice(0, 8); // cap at 8 insights
}

// ── GET /api/demand/proof ─────────────────────────────────────────────────────

router.get(
  "/proof",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const user    = req.user!;
    const venueId = req.query.venueId as string | undefined;

    // Managers/owners must scope to their venue unless super_admin
    const scopedVenueId =
      user.role === "super_admin" ? (venueId ?? null) : user.venueId;

    const inventory = getAllInventory();
    const productMap = new Map(inventory.map((p) => [p.id, p]));
    const trendMap   = getTrendMap();

    // ── Demand events: selections, OOS requests, orders, blend uses ─────────
    const [
      demandEventRows,
      demandRequestRows,
      orderRows,
      flavorRows,
      categoryRows,
    ] = await Promise.all([

      // demand_events table (new comprehensive capture)
      db.execute<{
        product_id:   string;
        product_name: string | null;
        category:     string | null;
        event_type:   string;
        cnt:          number;
      }>(sql`
        SELECT
          product_id,
          MAX(product_name)         AS product_name,
          MAX(category)             AS category,
          event_type,
          cast(count(*) as integer) AS cnt
        FROM   demand_events
        ${scopedVenueId ? sql`WHERE venue_id = ${scopedVenueId}::uuid` : sql``}
        GROUP BY product_id, event_type
        ORDER BY cnt DESC
        LIMIT 500
      `),

      // demand_requests table (legacy OOS requests)
      db.execute<{
        product_id:   string;
        product_name: string | null;
        category:     string | null;
        cnt:          number;
      }>(sql`
        SELECT
          product_id,
          MAX(product_name)         AS product_name,
          MAX(category)             AS category,
          cast(count(*) as integer) AS cnt
        FROM   demand_requests
        ${scopedVenueId ? sql`WHERE venue_id = ${scopedVenueId}::uuid` : sql``}
        GROUP BY product_id
        ORDER BY cnt DESC
        LIMIT 200
      `),

      // orders
      db.execute<{ cigar_id: string | null; drink_id: string | null; cnt: number }>(sql`
        SELECT
          cigar_id,
          drink_id,
          cast(count(*) as integer) AS cnt
        FROM   orders
        ${scopedVenueId ? sql`WHERE venue_id = ${scopedVenueId}::uuid` : sql``}
        GROUP BY cigar_id, drink_id
        LIMIT 200
      `),

      // trending flavors from user_preferences
      db.execute<{ flavor: string; cnt: number }>(sql`
        SELECT
          elem.value::text          AS flavor,
          cast(count(*) as integer) AS cnt
        FROM   user_preferences up,
               json_array_elements_text(up.flavor_preferences) AS elem(value)
        ${scopedVenueId ? sql`WHERE up.venue_id = ${scopedVenueId}::uuid` : sql``}
        GROUP  BY elem.value
        ORDER  BY cnt DESC
        LIMIT  15
      `),

      // category distribution from user_preferences
      db.execute<{ category: string; cnt: number }>(sql`
        SELECT
          category,
          cast(count(*) as integer) AS cnt
        FROM   user_preferences
        ${scopedVenueId ? sql`WHERE venue_id = ${scopedVenueId}::uuid` : sql``}
        GROUP  BY category
      `),
    ]);

    // ── Build demand score map ─────────────────────────────────────────────

    // Weights: selection=1, oos_request=2, order=3, blend_use=2, search=1
    const weights: Record<string, number> = {
      selection:   1,
      oos_request: 2,
      order:       3,
      blend_use:   2,
      search:      1,
    };

    const scoreMap = new Map<string, {
      productId: string; productName: string; category: string;
      selections: number; oosRequests: number; orders: number; blendUses: number; score: number;
    }>();

    const ensureEntry = (productId: string, productName: string | null, category: string | null) => {
      if (!scoreMap.has(productId)) {
        const meta = productMap.get(productId);
        scoreMap.set(productId, {
          productId,
          productName: productName ?? meta?.name ?? productId,
          category:    category    ?? meta?.category ?? "unknown",
          selections: 0, oosRequests: 0, orders: 0, blendUses: 0, score: 0,
        });
      }
      return scoreMap.get(productId)!;
    };

    // Aggregate demand_events
    for (const row of demandEventRows.rows ?? []) {
      const entry = ensureEntry(row.product_id, row.product_name, row.category);
      const cnt   = Number(row.cnt);
      const w     = weights[row.event_type] ?? 1;
      entry.score += cnt * w;
      if (row.event_type === "selection")   entry.selections  += cnt;
      if (row.event_type === "oos_request") entry.oosRequests += cnt;
      if (row.event_type === "blend_use")   entry.blendUses   += cnt;
    }

    // Aggregate demand_requests (legacy OOS)
    for (const row of demandRequestRows.rows ?? []) {
      const entry = ensureEntry(row.product_id, row.product_name, row.category);
      const cnt   = Number(row.cnt);
      entry.oosRequests += cnt;
      entry.score       += cnt * weights.oos_request;
    }

    // Aggregate orders
    for (const row of orderRows.rows ?? []) {
      const cnt = Number(row.cnt);
      if (row.cigar_id) {
        const entry = ensureEntry(row.cigar_id, null, "cigar");
        entry.orders += cnt;
        entry.score  += cnt * weights.order;
      }
      if (row.drink_id) {
        const entry = ensureEntry(row.drink_id, null, "alcohol");
        entry.orders += cnt;
        entry.score  += cnt * weights.order;
      }
    }

    // Analytics events — add swipe_right / product_selected as selections
    const analyticsRows = await db.execute<{
      product_id: string; event_type: string; cnt: number;
    }>(sql`
      SELECT
        product_id,
        event_type,
        cast(count(*) as integer) AS cnt
      FROM   analytics_events
      WHERE  event_type IN ('swipe_right', 'product_selected')
        AND  product_id IS NOT NULL
      GROUP  BY product_id, event_type
      LIMIT  500
    `);

    for (const row of analyticsRows.rows ?? []) {
      if (!row.product_id) continue;
      const entry = ensureEntry(row.product_id, null, null);
      const cnt   = Number(row.cnt);
      entry.selections += cnt;
      entry.score      += cnt * weights.selection;
    }

    // ── Determine stock status ─────────────────────────────────────────────

    const venueStock = scopedVenueId ? getVenueStock(scopedVenueId) : new Map();
    const inStockIds = new Set(
      Array.from(venueStock.entries())
        .filter(([, info]) => info.available && info.quantity > 0)
        .map(([id]) => id),
    );

    const finalScores: DemandScore[] = Array.from(scoreMap.values())
      .map((e) => ({
        ...e,
        trendScore: trendMap.get(e.productId) ?? 0,
        inStock:    venueStock.size === 0 || inStockIds.has(e.productId),
      }))
      .sort((a, b) => b.score - a.score);

    const topCigars  = finalScores.filter((s) => s.category === "cigar");
    const topAlcohol = finalScores.filter((s) => s.category === "alcohol");

    const missedSales = finalScores.filter((s) => !s.inStock && s.score > 0 && venueStock.size > 0);

    // ── Flavor & category stats ───────────────────────────────────────────

    const trendingFlavors = (flavorRows.rows ?? []).map((r) => ({
      flavor: String(r.flavor),
      count:  Number(r.cnt),
    }));

    const catCounts  = Object.fromEntries((categoryRows.rows ?? []).map((r) => [r.category, Number(r.cnt)]));
    const totalCat   = Object.values(catCounts).reduce((s, c) => s + c, 0) || 1;
    const cigarPct   = Math.round(((catCounts["cigar"] ?? 0) / totalCat) * 100);
    const alcoholPct = Math.round(((catCounts["alcohol"] ?? 0) / totalCat) * 100);

    // ── Order stats ───────────────────────────────────────────────────────

    const totalOrders  = (orderRows.rows ?? []).reduce((s, r) => s + Number(r.cnt), 0);
    const totalDemand  = finalScores.reduce((s, d) => s + d.selections + d.oosRequests, 0);

    const conversionRate = totalDemand > 0
      ? Math.round((totalOrders / totalDemand) * 100)
      : 0;

    // ── Insight statements ────────────────────────────────────────────────

    const insightStatements = generateInsights({
      topCigar:        topCigars[0],
      topAlcohol:      topAlcohol[0],
      missedSalesCount: missedSales.length,
      totalDemand,
      totalOrders,
      topFlavors:      trendingFlavors.slice(0, 3),
      cigarPct,
      alcoholPct,
      trendMap,
      topDemanded:     finalScores.slice(0, 10),
    });

    // ── Response ──────────────────────────────────────────────────────────

    const payload = {
      generatedAt:      new Date().toISOString(),
      venueId:          scopedVenueId,
      summary: {
        totalDemandSignals: totalDemand,
        totalOrders,
        conversionRate,
        missedSalesCount:   missedSales.length,
        uniqueProductsDemanded: finalScores.length,
      },
      topDemandedCigars:  topCigars.slice(0, 10),
      topDemandedAlcohol: topAlcohol.slice(0, 10),
      allProducts:        finalScores.slice(0, 30),
      missedSales:        missedSales.slice(0, 15),
      trendingFlavors,
      categoryDistribution: { cigar: cigarPct, alcohol: alcoholPct },
      insightStatements,
    };

    res.json(payload);
  },
);

// ── GET /api/demand/opportunities ─────────────────────────────────────────────

router.get(
  "/opportunities",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response) => {

    // Cross-venue: products with demand requests across multiple venues
    const rows = await db.execute<{
      product_id:   string;
      product_name: string | null;
      category:     string | null;
      total_requests: number;
      venues_missing: number;
    }>(sql`
      WITH demand_union AS (
        SELECT product_id, product_name, category, venue_id
        FROM   demand_requests
        UNION ALL
        SELECT product_id, product_name, category, venue_id
        FROM   demand_events
        WHERE  event_type = 'oos_request'
      )
      SELECT
        product_id,
        MAX(product_name)                         AS product_name,
        MAX(category)                             AS category,
        cast(count(*) as integer)                 AS total_requests,
        cast(count(DISTINCT venue_id) as integer) AS venues_missing
      FROM   demand_union
      WHERE  venue_id IS NOT NULL
      GROUP  BY product_id
      HAVING count(*) >= 1
      ORDER  BY total_requests DESC
      LIMIT  20
    `);

    const inventory = getAllInventory();
    const productMap = new Map(inventory.map((p) => [p.id, p]));
    const trendMap   = getTrendMap();

    const opportunities: Opportunity[] = (rows.rows ?? []).map((r) => {
      const totalReqs   = Number(r.total_requests);
      const venuesMiss  = Number(r.venues_missing);
      const meta        = productMap.get(r.product_id);
      const productName = r.product_name ?? meta?.name ?? r.product_id;
      const category    = r.category ?? meta?.category ?? "unknown";
      const trend       = trendMap.get(r.product_id) ?? 0;

      const urgency: Opportunity["urgency"] =
        totalReqs >= 5 || trend >= 2 ? "high"
        : totalReqs >= 3 || trend >= 1 ? "medium"
        : "low";

      const venueWord  = venuesMiss === 1 ? "1 venue" : `${venuesMiss} venues`;
      const statement  = `High demand for "${productName}" across ${venueWord} — no supply available${trend >= 2 ? " · actively trending" : ""}`;

      return {
        productId:     r.product_id,
        productName,
        category,
        totalRequests: totalReqs,
        venuesMissing: venuesMiss,
        urgency,
        statement,
      };
    });

    res.json({
      generatedAt:   new Date().toISOString(),
      opportunities,
      totalOpportunities: opportunities.length,
    });
  },
);

export default router;
