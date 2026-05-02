/**
 * GET /api/analytics/insights
 *
 * Comprehensive Brand & Distributor Insights Engine.
 *
 * Query params (all optional):
 *   venueId   — filter to a specific venue UUID
 *   category  — "cigar" | "alcohol" | "all" (default: "all")
 *   timeRange — "7d" | "30d" | "90d" | "all"  (default: "all")
 *
 * Returns:
 *   conversionFunnel    — recommendation_view → product_selected → order_created
 *   topSelected         — most product_selected events
 *   topSkipped          — most swipe_left events
 *   topRightSwiped      — most swipe_right events (positive signal)
 *   topPairings         — most pairing_selected events
 *   topFood             — most food_selected events
 *   flavorTrends        — most requested flavor notes from user_preferences
 *   brandPerformance    — per-brand shown/selected/ordered aggregates
 *   productPerformance  — per-product full event breakdown
 *   trending            — products with rising velocity (recent vs prior period)
 *   timeSeries          — daily event counts for the last 14 days (sparkline)
 *
 * Auth: requires venue_owner, manager, super_admin, or brand_partner.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { sql, inArray }                                       from "drizzle-orm";
import { db, analyticsEventsTable, userPreferencesTable, brandsTable } from "@workspace/db";
import { getAllInventory }                                    from "../services/boostService";
import { requireAuth, type AuthRequest }                     from "../middleware/auth";
import { requireRole }                                       from "../middleware/roles";

const router: IRouter = Router();

// ── helpers ───────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_TIME_RANGES = ["7d", "30d", "90d", "all"] as const;
type TimeRange = (typeof VALID_TIME_RANGES)[number];

function timeRangeInterval(tr: TimeRange): string | null {
  return tr === "all" ? null : tr.replace("d", " days");
}

/**
 * Builds a WHERE fragment for the time range and optional venue/category filters.
 * Returns a raw SQL fragment string (safe — only controlled values inserted).
 */
function buildWhereClause(opts: {
  venueId?:   string;
  category?:  string;
  timeRange:  TimeRange;
  tableAlias: "ae" | "up";   // analytics_events alias vs user_preferences alias
}): string {
  const parts: string[] = [];
  const interval = timeRangeInterval(opts.timeRange);

  if (interval) {
    const col = opts.tableAlias === "ae" ? "ae.created_at" : "up.created_at";
    parts.push(`${col} >= now() - interval '${interval}'`);
  }
  if (opts.venueId && UUID_RE.test(opts.venueId)) {
    const col = opts.tableAlias === "ae" ? "ae.venue_id" : "up.venue_id";
    parts.push(`${col} = '${opts.venueId}'::uuid`);
  }

  return parts.length ? `WHERE ${parts.join(" AND ")}` : "";
}

// ── GET /api/analytics/insights ───────────────────────────────────────────────

router.get(
  "/insights",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager", "brand_partner"),
  async (req: AuthRequest, res: Response) => {

    const venueId   = typeof req.query.venueId   === "string" ? req.query.venueId   : undefined;
    const category  = typeof req.query.category  === "string" ? req.query.category  : "all";
    const timeRange = (VALID_TIME_RANGES.includes(req.query.timeRange as TimeRange)
      ? req.query.timeRange
      : "all") as TimeRange;

    // Validate optional venueId
    if (venueId && !UUID_RE.test(venueId)) {
      res.status(400).json({ error: "Invalid venueId" }); return;
    }

    // Non-super_admin / non-brand_partner can only see their own venue
    const user = req.user!;
    const effectiveVenueId = (user.role === "super_admin" || user.role === "brand_partner")
      ? venueId
      : (user.venueId ?? undefined);

    const aeWhere  = buildWhereClause({ venueId: effectiveVenueId, timeRange, tableAlias: "ae" });
    const upWhere  = buildWhereClause({ venueId: effectiveVenueId, timeRange, tableAlias: "up" });

    // ── 1. Funnel: recommendation_view → product_selected → order_created ──
    const funnelRes = await db.execute<{ event_type: string; cnt: number }>(sql`
      SELECT event_type, cast(count(*) as integer) AS cnt
      FROM analytics_events ae
      ${sql.raw(aeWhere)}
      ${sql.raw(aeWhere ? "AND" : "WHERE")} event_type IN ('recommendation_view','product_selected','order_created')
      GROUP BY event_type
    `);
    const funnelMap = new Map(funnelRes.rows.map((r) => [r.event_type, Number(r.cnt)]));
    const sessions  = funnelMap.get("recommendation_view") ?? 0;
    const selected  = funnelMap.get("product_selected")    ?? 0;
    const ordered   = funnelMap.get("order_created")       ?? 0;

    // ── 2. Top product events ──────────────────────────────────────────────
    async function topProducts(eventTypes: string[], limit = 12) {
      const typeList = eventTypes.map((t) => `'${t}'`).join(",");
      const res2 = await db.execute<{ product_id: string; cnt: number }>(sql`
        SELECT ae.product_id, cast(count(*) as integer) AS cnt
        FROM analytics_events ae
        ${sql.raw(aeWhere)}
        ${sql.raw(aeWhere ? "AND" : "WHERE")} ae.event_type IN (${sql.raw(typeList)})
          AND ae.product_id IS NOT NULL
        GROUP BY ae.product_id
        ORDER BY cnt DESC
        LIMIT ${sql.raw(String(limit))}
      `);
      return res2.rows;
    }

    const [selectedRows, skippedRows, rightSwipedRows, pairingRows, foodRows] = await Promise.all([
      topProducts(["product_selected"], 15),
      topProducts(["swipe_left"],       12),
      topProducts(["swipe_right"],      12),
      topProducts(["pairing_selected"], 10),
      topProducts(["food_selected"],    10),
    ]);

    // ── 3. Flavor trends ───────────────────────────────────────────────────
    const flavorRes = await db.execute<{ flavor: string; cnt: number }>(sql`
      SELECT
        elem.value::text          AS flavor,
        cast(count(*) as integer) AS cnt
      FROM   user_preferences up,
             json_array_elements_text(up.flavor_preferences) AS elem(value)
      ${sql.raw(upWhere)}
      GROUP  BY elem.value
      ORDER  BY cnt DESC
      LIMIT  14
    `);
    const flavorTrends = flavorRes.rows.map((r) => ({ flavor: String(r.flavor), count: Number(r.cnt) }));

    // ── 4. Per-product full event breakdown ────────────────────────────────
    const perfRes = await db.execute<{
      product_id: string;
      event_type: string;
      cnt: number;
    }>(sql`
      SELECT ae.product_id, ae.event_type, cast(count(*) as integer) AS cnt
      FROM analytics_events ae
      ${sql.raw(aeWhere)}
      ${sql.raw(aeWhere ? "AND" : "WHERE")} ae.product_id IS NOT NULL
      GROUP BY ae.product_id, ae.event_type
    `);

    type PerfAccum = { views: number; swipeLeft: number; swipeRight: number; selected: number; ordered: number; recommendations: number };
    const perfByProduct = new Map<string, PerfAccum>();

    for (const row of perfRes.rows) {
      const pid = String(row.product_id);
      const acc = perfByProduct.get(pid) ?? { views: 0, swipeLeft: 0, swipeRight: 0, selected: 0, ordered: 0, recommendations: 0 };
      const cnt = Number(row.cnt);
      switch (row.event_type) {
        case "view":               acc.views           += cnt; break;
        case "swipe_left":         acc.swipeLeft        += cnt; break;
        case "swipe_right":        acc.swipeRight       += cnt; break;
        case "product_selected":   acc.selected         += cnt; break;
        case "order_created":      acc.ordered          += cnt; break;
        case "recommendation":
        case "recommendation_view":acc.recommendations += cnt; break;
      }
      perfByProduct.set(pid, acc);
    }

    // ── 5. Trending: recent 7d vs prior 7d velocity ────────────────────────
    const trendInterval = timeRange === "7d" || timeRange === "all" ? "7 days" : "14 days";
    const [recentRes, priorRes] = await Promise.all([
      db.execute<{ product_id: string; cnt: number }>(sql`
        SELECT ae.product_id, cast(count(*) as integer) AS cnt
        FROM analytics_events ae
        WHERE ae.created_at >= now() - interval '7 days'
          AND ae.event_type IN ('product_selected','view','recommendation_view')
          AND ae.product_id IS NOT NULL
          ${sql.raw(effectiveVenueId ? `AND ae.venue_id = '${effectiveVenueId}'::uuid` : "")}
        GROUP BY ae.product_id
        ORDER BY cnt DESC LIMIT 20
      `),
      db.execute<{ product_id: string; cnt: number }>(sql`
        SELECT ae.product_id, cast(count(*) as integer) AS cnt
        FROM analytics_events ae
        WHERE ae.created_at >= now() - interval '14 days'
          AND ae.created_at <  now() - interval '7 days'
          AND ae.event_type IN ('product_selected','view','recommendation_view')
          AND ae.product_id IS NOT NULL
          ${sql.raw(effectiveVenueId ? `AND ae.venue_id = '${effectiveVenueId}'::uuid` : "")}
        GROUP BY ae.product_id
        ORDER BY cnt DESC LIMIT 20
      `),
    ]);
    const recentMap = new Map(recentRes.rows.map((r) => [String(r.product_id), Number(r.cnt)]));
    const priorMap  = new Map(priorRes.rows.map((r) => [String(r.product_id), Number(r.cnt)]));

    // ── 6. Time series: daily event counts for last 14 days ───────────────
    const tsRes = await db.execute<{ day: string; cnt: number }>(sql`
      SELECT
        to_char(date_trunc('day', ae.created_at), 'YYYY-MM-DD') AS day,
        cast(count(*) as integer) AS cnt
      FROM analytics_events ae
      WHERE ae.created_at >= now() - interval '14 days'
        ${sql.raw(effectiveVenueId ? `AND ae.venue_id = '${effectiveVenueId}'::uuid` : "")}
      GROUP BY day
      ORDER BY day ASC
    `);
    const timeSeries = tsRes.rows.map((r) => ({ day: String(r.day), count: Number(r.cnt) }));

    // ── 7. Brand performance via in-memory inventory join ──────────────────
    const inventory = getAllInventory();
    const productMap = new Map(inventory.map((p) => [p.id, p]));

    // Filter by category
    const categoryFilter = (productId: string): boolean => {
      if (category === "all") return true;
      return productMap.get(productId)?.category === category;
    };

    // Build brandId → { shown, selected, ordered } by merging perf data with inventory
    type BrandAcc = { brandId: string; shown: number; selected: number; ordered: number };
    const brandAccMap = new Map<string, BrandAcc>();

    for (const [pid, perf] of perfByProduct) {
      if (!categoryFilter(pid)) continue;
      const inv = productMap.get(pid);
      if (!inv?.brandId) continue;
      const bId = inv.brandId;
      const acc = brandAccMap.get(bId) ?? { brandId: bId, shown: 0, selected: 0, ordered: 0 };
      acc.shown    += perf.recommendations + perf.views;
      acc.selected += perf.selected;
      acc.ordered  += perf.ordered;
      brandAccMap.set(bId, acc);
    }

    // Attach brand names
    const brands = await db.select({ id: brandsTable.id, name: brandsTable.name, category: brandsTable.category })
      .from(brandsTable);
    const brandNameMap = new Map(brands.map((b) => [b.id, b]));

    const brandPerformance = [...brandAccMap.values()]
      .map((acc) => ({
        brandId:  acc.brandId,
        name:     brandNameMap.get(acc.brandId)?.name     ?? acc.brandId,
        category: brandNameMap.get(acc.brandId)?.category ?? "unknown",
        shown:    acc.shown,
        selected: acc.selected,
        ordered:  acc.ordered,
        selectRate: acc.shown > 0 ? Math.round((acc.selected / acc.shown) * 100) : 0,
        orderRate:  acc.selected > 0 ? Math.round((acc.ordered  / acc.selected) * 100) : 0,
      }))
      .sort((a, b) => b.shown - a.shown);

    // ── 8. Enrich all product rows with name / category ────────────────────

    function enrichProducts(rows: { product_id: string; cnt: number }[]) {
      return rows
        .filter((r) => categoryFilter(String(r.product_id)))
        .map((r) => {
          const pid = String(r.product_id);
          const inv = productMap.get(pid);
          return {
            productId:  pid,
            name:       inv?.name     ?? pid,
            category:   inv?.category ?? "unknown",
            tier:       inv?.tier,
            boostLevel: inv?.boostLevel ?? 0,
            sponsored:  inv?.sponsored  ?? false,
            count:      Number(r.cnt),
          };
        });
    }

    const topSelected    = enrichProducts(selectedRows);
    const topSkipped     = enrichProducts(skippedRows);
    const topRightSwiped = enrichProducts(rightSwipedRows);
    const topPairings    = enrichProducts(pairingRows);
    const topFood        = enrichProducts(foodRows);

    // ── 9. Product performance full table ──────────────────────────────────
    const productPerformance = [...perfByProduct.entries()]
      .filter(([pid]) => categoryFilter(pid))
      .map(([pid, perf]) => {
        const inv = productMap.get(pid);
        return {
          productId:   pid,
          name:        inv?.name     ?? pid,
          category:    inv?.category ?? "unknown",
          tier:        inv?.tier,
          ...perf,
          conversionRate: perf.recommendations > 0
            ? Math.round((perf.selected / perf.recommendations) * 100)
            : 0,
        };
      })
      .sort((a, b) => (b.selected + b.swipeRight) - (a.selected + a.swipeRight));

    // ── 10. Trending products (velocity score) ─────────────────────────────
    const trending = [...recentMap.entries()]
      .filter(([pid]) => categoryFilter(pid))
      .map(([pid, recent]) => {
        const prior = priorMap.get(pid) ?? 0;
        const velocity = prior === 0 ? recent * 2 : Math.round(((recent - prior) / prior) * 100);
        const inv = productMap.get(pid);
        return {
          productId:   pid,
          name:        inv?.name     ?? pid,
          category:    inv?.category ?? "unknown",
          tier:        inv?.tier,
          recentCount: recent,
          priorCount:  prior,
          velocity,
        };
      })
      .filter((t) => t.recentCount > 0)
      .sort((a, b) => b.velocity - a.velocity)
      .slice(0, 8);

    // ── Response ───────────────────────────────────────────────────────────
    res.json({
      filters: { venueId: effectiveVenueId ?? null, category, timeRange },
      conversionFunnel: {
        sessions,
        selected,
        ordered,
        selectRate:  sessions > 0 ? Math.round((selected / sessions) * 100) : 0,
        orderRate:   selected > 0 ? Math.round((ordered  / selected) * 100) : 0,
      },
      topSelected,
      topSkipped,
      topRightSwiped,
      topPairings,
      topFood,
      flavorTrends,
      brandPerformance,
      productPerformance: productPerformance.slice(0, 50),
      trending,
      timeSeries,
    });
  },
);

export default router;
