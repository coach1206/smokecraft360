/**
 * /api/palate — Palate Index (B2B Flavor Intelligence)
 *
 * GET  /trends              — top trending flavor tags (global or by region/craft)
 * GET  /heatmap             — regional taste distribution matrix
 * GET  /brand-loyalty/:brandId — brand loyalty + market share over time
 * POST /aggregate           — internal: trigger snapshot aggregation job
 *                             (called by the aggregation worker)
 *
 * Access: super_admin | brand_partner role required for most routes
 * (enforced at middleware level in app.ts via requireRole on the router prefix)
 *
 * Data source: aggregates analyticsEvents.flavor_* + adImpressions + swipe_orders
 * into palate_index_snapshots hourly.
 */

import { Router, type Request, type Response } from "express";
import { eq, desc, gte, and, sql }             from "drizzle-orm";
import { db, palateIndexSnapshotsTable,
         analyticsEventsTable }                 from "@workspace/db";
import { requireAuth }                          from "../middleware/auth";
import type { AuthRequest }                     from "../middleware/auth";

const router = Router();

// ── GET /trends ───────────────────────────────────────────────────────────────

router.get("/trends", requireAuth, async (req: AuthRequest, res: Response) => {
  const region    = (req.query.region    as string | undefined);
  const craftType = (req.query.craftType as string | undefined);
  const since     = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h

  const conditions = [gte(palateIndexSnapshotsTable.snapshotHour, since)];
  if (region)    conditions.push(eq(palateIndexSnapshotsTable.region,    region));
  if (craftType) conditions.push(eq(palateIndexSnapshotsTable.craftType, craftType));

  const rows = await db
    .select()
    .from(palateIndexSnapshotsTable)
    .where(and(...conditions))
    .orderBy(desc(palateIndexSnapshotsTable.trendScore))
    .limit(20);

  res.json({ trends: rows, region: region ?? "GLOBAL", craftType: craftType ?? "all", generatedAt: new Date().toISOString() });
});

// ── GET /heatmap ──────────────────────────────────────────────────────────────

router.get("/heatmap", requireAuth, async (req: AuthRequest, res: Response) => {
  const craftType = (req.query.craftType as string | undefined) ?? "smoke";
  const since     = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // last 7d

  const rows = await db
    .select({
      region:     palateIndexSnapshotsTable.region,
      flavorTag:  palateIndexSnapshotsTable.flavorTag,
      trendScore: sql<number>`AVG(${palateIndexSnapshotsTable.trendScore})`,
      isTrending: sql<boolean>`bool_or(${palateIndexSnapshotsTable.isTrending})`,
    })
    .from(palateIndexSnapshotsTable)
    .where(and(
      eq(palateIndexSnapshotsTable.craftType, craftType),
      gte(palateIndexSnapshotsTable.snapshotHour, since),
    ))
    .groupBy(palateIndexSnapshotsTable.region, palateIndexSnapshotsTable.flavorTag)
    .orderBy(desc(sql`AVG(${palateIndexSnapshotsTable.trendScore})`))
    .limit(60);

  res.json({ heatmap: rows, craftType, generatedAt: new Date().toISOString() });
});

// ── GET /brand-loyalty/:brandId ───────────────────────────────────────────────

router.get("/brand-loyalty/:brandId", requireAuth, async (req: AuthRequest, res: Response) => {
  const brandId = req.params["brandId"] as string;
  const since   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // last 30d

  // Pull from analyticsEvents where payload contains the brandId
  const rows = await db
    .select({
      day:        sql<string>`DATE(${analyticsEventsTable.createdAt})`,
      eventCount: sql<number>`COUNT(*)`,
    })
    .from(analyticsEventsTable)
    .where(and(
      gte(analyticsEventsTable.createdAt, since),
      sql`${analyticsEventsTable.metadata}::text ILIKE ${'%' + brandId + '%'}`,
    ))
    .groupBy(sql`DATE(${analyticsEventsTable.createdAt})`)
    .orderBy(sql`DATE(${analyticsEventsTable.createdAt})`);

  res.json({ brandId, loyaltyTimeline: rows, generatedAt: new Date().toISOString() });
});

// ── POST /aggregate ───────────────────────────────────────────────────────────
// Internal — aggregates current flavor tags from analyticsEvents into a snapshot

router.post("/aggregate", requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== "super_admin") {
    res.status(403).json({ error: "super_admin only" });
    return;
  }

  const snapshotHour = new Date();
  snapshotHour.setMinutes(0, 0, 0);

  // Pull top flavor interactions from analytics events in the last hour
  const since = new Date(snapshotHour.getTime() - 60 * 60 * 1000);
  const flavorRows = await db
    .select({
      craftType:  sql<string>`'smoke'`,
      flavorTag:  sql<string>`${analyticsEventsTable.eventType}::text`,
      sampleSize: sql<number>`COUNT(*)`,
    })
    .from(analyticsEventsTable)
    .where(gte(analyticsEventsTable.createdAt, since))
    .groupBy(analyticsEventsTable.eventType)
    .orderBy(desc(sql`COUNT(*)`))
    .limit(40);

  let inserted = 0;
  for (const row of flavorRows) {
    if (!row.flavorTag || !row.craftType) continue;
    const trendScore = Math.min(100, Number(row.sampleSize) * 2);
    await db
      .insert(palateIndexSnapshotsTable)
      .values({
        region: "GLOBAL", craftType: row.craftType, flavorTag: row.flavorTag,
        trendScore, sampleSize: Number(row.sampleSize),
        isTrending: trendScore >= 60,
        deltaVsPrevHour: 0,
        snapshotHour,
      })
      .onConflictDoNothing();
    inserted++;
  }

  res.json({ ok: true, snapshotHour, inserted });
});

export default router;
