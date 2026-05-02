/**
 * GET /api/venues/:id/intelligence
 *
 * Inventory Intelligence — predictive restocking engine for venue owners.
 *
 * Returns:
 *   topSellers        — most ordered products at this venue
 *   topViewed         — most recommended/viewed products
 *   lowStock          — products with quantity 1–3
 *   outOfStock        — products with quantity 0 or available=false
 *   highDemandMissing — products frequently requested but not in venue inventory
 *   trendingFlavors   — top flavor preferences from recent sessions
 *   trendingCategories — most popular category breakdowns
 *   restockSuggestions — generated recommendations: high demand + trending
 *
 * Requires: venue_owner, manager, or super_admin.
 */

import { Router, type IRouter, type Response } from "express";
import { eq, desc, sql, inArray }               from "drizzle-orm";
import {
  db,
  analyticsEventsTable,
  ordersTable,
  userPreferencesTable,
  demandRequestsTable,
}                                               from "@workspace/db";
import { getVenueStock }                        from "../services/venueInventoryStore";
import { getAllInventory }                       from "../services/boostService";
import { getTrendMap }                          from "../services/trendStore";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";

const router: IRouter = Router();

router.get(
  "/:id/intelligence",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response) => {

    const venueId = req.params.id;
    const user    = req.user!;

    if (user.role !== "super_admin" && user.venueId !== venueId) {
      res.status(403).json({ error: "Access denied to this venue" });
      return;
    }

    const venueStock = getVenueStock(venueId);   // Map<productId, StockInfo>
    const inventory  = getAllInventory();         // in-memory product meta
    const productMap = new Map(inventory.map((p) => [p.id, p]));
    const trendMap   = getTrendMap();

    const [
      orderRows,
      viewRows,
      demandRows,
      flavorRows,
    ] = await Promise.all([

      // Top ordered products at this venue
      db.execute<{ cigar_id: string | null; cnt: number }>(sql`
        SELECT cigar_id, cast(count(*) as integer) AS cnt
        FROM   orders
        WHERE  (venue_id = ${venueId}::uuid OR venue_id IS NULL)
          AND  cigar_id IS NOT NULL
        GROUP  BY cigar_id
        ORDER  BY cnt DESC
        LIMIT  20
      `),

      // Top recommended/viewed products
      db.select({
        productId: analyticsEventsTable.productId,
        cnt:       sql<number>`cast(count(*) as integer)`,
      })
        .from(analyticsEventsTable)
        .where(inArray(analyticsEventsTable.eventType, [
          "recommendation_view", "product_selected", "swipe_right",
        ]))
        .groupBy(analyticsEventsTable.productId)
        .orderBy(desc(sql`count(*)`))
        .limit(20),

      // Demand requests for this venue (products not in stock that guests asked for)
      db.execute<{
        product_id:   string;
        product_name: string | null;
        category:     string | null;
        cnt:          number;
      }>(sql`
        SELECT   product_id,
                 MAX(product_name)         AS product_name,
                 MAX(category)             AS category,
                 cast(count(*) as integer) AS cnt
        FROM     demand_requests
        WHERE    (venue_id = ${venueId}::uuid OR venue_id IS NULL)
        GROUP BY product_id
        ORDER BY cnt DESC
        LIMIT    30
      `),

      // Trending flavor preferences from recent sessions at this venue
      db.execute<{ flavor: string; cnt: number }>(sql`
        SELECT
          elem.value::text          AS flavor,
          cast(count(*) as integer) AS cnt
        FROM   user_preferences up,
               json_array_elements_text(up.flavor_preferences) AS elem(value)
        WHERE  (up.venue_id = ${venueId}::uuid OR up.venue_id IS NULL)
        GROUP  BY elem.value
        ORDER  BY cnt DESC
        LIMIT  12
      `),
    ]);

    // ── Low stock + out of stock from venue inventory ─────────────────────────
    const lowStockItems:  { productId: string; name: string; quantity: number; category: string }[] = [];
    const outOfStockItems: { productId: string; name: string; category: string }[] = [];

    for (const [productId, info] of venueStock) {
      const meta = productMap.get(productId);
      const name = meta?.name ?? productId;
      const cat  = meta?.category ?? "unknown";

      if (!info.available || info.quantity === 0) {
        outOfStockItems.push({ productId, name, category: cat });
      } else if (info.quantity <= 3) {
        lowStockItems.push({ productId, name, quantity: info.quantity, category: cat });
      }
    }

    // ── Build topSellers ──────────────────────────────────────────────────────
    const topSellers = (orderRows.rows ?? [])
      .filter((r) => r.cigar_id)
      .map((r) => ({
        productId:    r.cigar_id!,
        name:         productMap.get(r.cigar_id!)?.name ?? r.cigar_id!,
        category:     productMap.get(r.cigar_id!)?.category ?? "cigar",
        orderCount:   Number(r.cnt),
        trendScore:   trendMap.get(r.cigar_id!) ?? 0,
        inStock:      venueStock.size === 0 || (venueStock.get(r.cigar_id!)?.available && (venueStock.get(r.cigar_id!)?.quantity ?? 1) > 0),
      }));

    // ── Build topViewed ───────────────────────────────────────────────────────
    const topViewed = viewRows
      .filter((r) => r.productId)
      .map((r) => ({
        productId:  r.productId!,
        name:       productMap.get(r.productId!)?.name ?? r.productId!,
        category:   productMap.get(r.productId!)?.category ?? "unknown",
        viewCount:  r.cnt,
        trendScore: trendMap.get(r.productId!) ?? 0,
      }));

    // ── Build highDemandMissing ───────────────────────────────────────────────
    // Products with demand requests AND not in stock (or not in venue inventory at all)
    const inStockIds  = new Set(
      Array.from(venueStock.entries())
        .filter(([, info]) => info.available && info.quantity > 0)
        .map(([id]) => id),
    );

    const highDemandMissing = (demandRows.rows ?? [])
      .filter((r) => venueStock.size === 0 || !inStockIds.has(r.product_id))
      .map((r) => ({
        productId:    r.product_id,
        productName:  r.product_name ?? r.product_id,
        category:     r.category ?? "unknown",
        requestCount: Number(r.cnt),
        trendScore:   trendMap.get(r.product_id) ?? 0,
      }));

    // ── Trending flavors ──────────────────────────────────────────────────────
    const trendingFlavors = (flavorRows.rows ?? []).map((r) => ({
      flavor: String(r.flavor),
      count:  Number(r.cnt),
    }));

    // ── Trending categories from preferences ──────────────────────────────────
    const categoryResult = await db
      .select({
        category: userPreferencesTable.category,
        cnt:      sql<number>`cast(count(*) as integer)`,
      })
      .from(userPreferencesTable)
      .groupBy(userPreferencesTable.category)
      .orderBy(desc(sql`count(*)`));

    const trendingCategories = categoryResult.map((r) => ({
      category: r.category,
      count:    r.cnt,
    }));

    // ── Generate restock suggestions ──────────────────────────────────────────
    interface RestockSuggestion {
      productId:   string;
      productName: string;
      category:    string;
      reason:      string;
      urgency:     "high" | "medium" | "low";
    }
    const suggestions: RestockSuggestion[] = [];
    const suggestedIds = new Set<string>();

    // Priority 1: out-of-stock items with high demand or trend scores
    for (const item of outOfStockItems) {
      const demand = highDemandMissing.find((d) => d.productId === item.productId);
      const trend  = trendMap.get(item.productId) ?? 0;
      if (demand || trend >= 1) {
        suggestions.push({
          productId:   item.productId,
          productName: item.name,
          category:    item.category,
          reason:      demand
            ? `${demand.requestCount} guest${demand.requestCount > 1 ? "s" : ""} requested this — currently out of stock`
            : "Trending item — currently out of stock",
          urgency: demand && demand.requestCount >= 3 ? "high" : "medium",
        });
        suggestedIds.add(item.productId);
      }
    }

    // Priority 2: low-stock top sellers
    for (const item of lowStockItems) {
      if (suggestedIds.has(item.productId)) continue;
      const sold = topSellers.find((s) => s.productId === item.productId);
      if (sold) {
        suggestions.push({
          productId:   item.productId,
          productName: item.name,
          category:    item.category,
          reason:      `Top seller (${sold.orderCount} orders) — only ${item.quantity} left`,
          urgency:     item.quantity === 1 ? "high" : "medium",
        });
        suggestedIds.add(item.productId);
      }
    }

    // Priority 3: high demand missing items not yet suggested
    for (const item of highDemandMissing.slice(0, 5)) {
      if (suggestedIds.has(item.productId)) continue;
      suggestions.push({
        productId:   item.productId,
        productName: item.productName,
        category:    item.category,
        reason:      `${item.requestCount} guest request${item.requestCount > 1 ? "s" : ""} — not in your inventory`,
        urgency:     item.requestCount >= 5 ? "high" : "low",
      });
      suggestedIds.add(item.productId);
    }

    res.json({
      venueId,
      generatedAt:      new Date().toISOString(),
      topSellers:       topSellers.slice(0, 10),
      topViewed:        topViewed.slice(0, 10),
      lowStock:         lowStockItems,
      outOfStock:       outOfStockItems,
      highDemandMissing,
      trendingFlavors,
      trendingCategories,
      restockSuggestions: suggestions.slice(0, 10),
    });
  },
);

export default router;
