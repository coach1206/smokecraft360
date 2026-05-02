/**
 * Analytics routes — aggregated impression and performance data.
 *
 * GET /api/analytics  — summary + top performers + sponsored products
 *                       Requires venue_owner, manager, or super_admin.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, analyticsEventsTable } from "@workspace/db";
import { getAllInventory } from "../services/boostService";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router: IRouter = Router();

router.get(
  "/analytics",
  requireAuth,
  requireRole("venue_owner", "manager"),
  async (_req: Request, res: Response) => {

    // Aggregate from DB — this is the persistent historical record
    const [recRows, sponsoredRows] = await Promise.all([
      db
        .select({
          productId: analyticsEventsTable.productId,
          cnt:       sql<number>`cast(count(*) as integer)`,
        })
        .from(analyticsEventsTable)
        .where(eq(analyticsEventsTable.eventType, "recommendation"))
        .groupBy(analyticsEventsTable.productId)
        .orderBy(desc(sql`count(*)`))
        .limit(10),

      db
        .select({
          productId: analyticsEventsTable.productId,
          cnt:       sql<number>`cast(count(*) as integer)`,
        })
        .from(analyticsEventsTable)
        .where(eq(analyticsEventsTable.eventType, "sponsored_view"))
        .groupBy(analyticsEventsTable.productId),
    ]);

    const all          = getAllInventory();
    const productMap   = new Map(all.map((p) => [p.id, p]));
    const sponsoredMap = new Map(sponsoredRows.map((r) => [r.productId, r.cnt]));

    const topPerformers = recRows
      .filter((r) => r.productId && productMap.has(r.productId))
      .map((r) => ({
        ...(productMap.get(r.productId!)!),
        impressions:         r.cnt,
        featuredImpressions: sponsoredMap.get(r.productId!) ?? 0,
      }));

    const sponsoredProducts = all
      .filter((p) => p.sponsored)
      .map((p) => ({
        ...p,
        impressions:         recRows.find((r) => r.productId === p.id)?.cnt ?? 0,
        featuredImpressions: sponsoredMap.get(p.id) ?? 0,
      }))
      .sort((a, b) => b.impressions - a.impressions);

    const totalImpressions     = recRows.reduce((s, r) => s + r.cnt, 0);
    const sponsoredImpressions = sponsoredRows.reduce((s, r) => s + r.cnt, 0);

    res.json({
      summary: {
        totalProducts:       all.length,
        boostedProducts:     all.filter((p) => p.boostLevel > 0).length,
        sponsoredProducts:   all.filter((p) => p.sponsored).length,
        totalImpressions,
        sponsoredImpressions,
        featuredImpressions: sponsoredImpressions,
      },
      topPerformers,
      sponsored: sponsoredProducts,
    });
  },
);

export default router;
