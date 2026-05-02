import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, analyticsEventsTable, productsTable } from "@workspace/db";
import { getAllInventory, setProductBoostDB } from "../engine/inventory";
import { requireAuth, requireRole, type AuthRequest } from "../middleware/auth";

const router: IRouter = Router();

/**
 * GET /api/inventory
 * Public — returns all products with current boost state and session impression counts.
 */
router.get("/inventory", (_req: Request, res: Response) => {
  res.json(getAllInventory());
});

/**
 * PATCH /api/inventory/:id
 * Protected — requires venue_owner, manager, or super_admin.
 */
router.patch(
  "/inventory/:id",
  requireAuth,
  requireRole("venue_owner", "manager"),
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { boostLevel, sponsored, brandId, campaignId } = req.body as {
      boostLevel?: number;
      sponsored?:  boolean;
      brandId?:    string;
      campaignId?: string;
    };

    if (
      boostLevel !== undefined &&
      (boostLevel < 0 || boostLevel > 3 || !Number.isInteger(boostLevel))
    ) {
      res.status(400).json({ error: '"boostLevel" must be an integer 0–3' });
      return;
    }

    const updated = await setProductBoostDB(id, { boostLevel, sponsored, brandId, campaignId });

    req.log.info({ productId: id, userId: req.user?.id, ...updated }, "inventory boost updated");
    res.json({ id, ...updated });
  },
);

/**
 * GET /api/analytics
 * Protected — venue_owner, manager, or super_admin.
 * Reads aggregated event data from PostgreSQL.
 */
router.get(
  "/analytics",
  requireAuth,
  requireRole("venue_owner", "manager"),
  async (_req: Request, res: Response) => {
    const [recRows, sponsoredRows] = await Promise.all([
      db
        .select({
          productId: analyticsEventsTable.productId,
          cnt: sql<number>`cast(count(*) as integer)`,
        })
        .from(analyticsEventsTable)
        .where(eq(analyticsEventsTable.eventType, "recommendation"))
        .groupBy(analyticsEventsTable.productId)
        .orderBy(desc(sql`count(*)`))
        .limit(10),
      db
        .select({
          productId: analyticsEventsTable.productId,
          cnt: sql<number>`cast(count(*) as integer)`,
        })
        .from(analyticsEventsTable)
        .where(eq(analyticsEventsTable.eventType, "sponsored_view"))
        .groupBy(analyticsEventsTable.productId),
    ]);

    const all          = getAllInventory();
    const sponsoredMap = new Map(sponsoredRows.map((r) => [r.productId, r.cnt]));

    const productMap   = new Map(all.map((p) => [p.id, p]));

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
