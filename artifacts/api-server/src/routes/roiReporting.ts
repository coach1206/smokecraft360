import { Router, type IRouter, type Response } from "express";
import { eq, and, sql, inArray } from "drizzle-orm";
import {
  db,
  analyticsEventsTable,
  brandPartnersTable,
  brandProductsTable,
  campaignsTable,
  ordersTable,
  fraudFlagsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get(
  "/campaigns/:id/roi",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
    if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }

    const [views] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(analyticsEventsTable)
      .where(
        and(
          eq(analyticsEventsTable.eventType, "campaign_triggered"),
          sql`${analyticsEventsTable.metadata}->>'campaignId' = ${id}`,
        ),
      );

    const [selections] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(analyticsEventsTable)
      .where(
        and(
          eq(analyticsEventsTable.eventType, "brand_selected"),
          sql`${analyticsEventsTable.metadata}->>'campaignId' = ${id}`,
        ),
      );

    const [conversions] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(analyticsEventsTable)
      .where(
        and(
          eq(analyticsEventsTable.eventType, "campaign_conversion"),
          sql`${analyticsEventsTable.metadata}->>'campaignId' = ${id}`,
        ),
      );

    const [revenue] = await db
      .select({ total: sql<number>`COALESCE(SUM(${ordersTable.expectedAmountCents}), 0)` })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.campaignId, id),
          eq(ordersTable.verified, true),
        ),
      );

    const discountCostCents = campaign.currentSpendCents ?? 0;
    const revenueCents = Number(revenue?.total ?? 0);
    const netRevenueCents = revenueCents - discountCostCents;
    const viewCount = views?.count ?? 0;
    const conversionCount = conversions?.count ?? 0;
    const conversionRate = viewCount > 0 ? +(conversionCount / viewCount).toFixed(4) : 0;

    const topProducts = await db.execute<{ product_id: string; cnt: number }>(
      sql`
        SELECT COALESCE(cigar_id, drink_id, food_id) AS product_id,
               cast(count(*) as integer) AS cnt
        FROM orders
        WHERE campaign_id = ${id} AND verified = true
          AND COALESCE(cigar_id, drink_id, food_id) IS NOT NULL
        GROUP BY product_id
        ORDER BY cnt DESC
        LIMIT 5
      `,
    );

    const topVenues = await db.execute<{ venue_id: string; cnt: number }>(
      sql`
        SELECT venue_id, cast(count(*) as integer) AS cnt
        FROM orders
        WHERE campaign_id = ${id} AND verified = true AND venue_id IS NOT NULL
        GROUP BY venue_id
        ORDER BY cnt DESC
        LIMIT 5
      `,
    );

    const [fraudSignals] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(fraudFlagsTable)
      .where(sql`${fraudFlagsTable.details}->>'campaignId' = ${id}`);

    res.json({
      campaignId: campaign.id,
      campaignName: campaign.name,
      type: campaign.type,
      status: campaign.status,
      views: viewCount,
      selections: selections?.count ?? 0,
      conversions: conversionCount,
      revenueCents,
      discountCostCents,
      netRevenueCents,
      conversionRate,
      budgetLimitCents: campaign.budgetLimit ?? null,
      budgetRemainingCents: campaign.budgetLimit
        ? Math.max(0, campaign.budgetLimit - discountCostCents)
        : null,
      maxRedemptions: campaign.maxRedemptions ?? null,
      redemptionsRemaining: campaign.maxRedemptions
        ? Math.max(0, campaign.maxRedemptions - (campaign.currentRedemptions ?? 0))
        : null,
      topProducts: topProducts.rows ?? [],
      topVenues: topVenues.rows ?? [],
      fraudSignals: fraudSignals?.count ?? 0,
    });
  },
);

router.get(
  "/brands/:id/roi",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin", "brand_partner"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [partner] = await db
      .select()
      .from(brandPartnersTable)
      .where(eq(brandPartnersTable.id, id))
      .limit(1);

    if (!partner) { res.status(404).json({ error: "Brand partner not found" }); return; }

    const links = await db
      .select({ productId: brandProductsTable.productId })
      .from(brandProductsTable)
      .where(eq(brandProductsTable.brandId, id));

    const productIds = links.map((l) => l.productId);

    let viewCount = 0;
    let selectionCount = 0;
    let conversionCount = 0;
    let revenueCents = 0;

    if (productIds.length > 0) {
      const [v] = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(analyticsEventsTable)
        .where(
          and(
            inArray(analyticsEventsTable.productId, productIds),
            eq(analyticsEventsTable.eventType, "recommendation_view"),
          ),
        );
      viewCount = v?.count ?? 0;

      const [s] = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(analyticsEventsTable)
        .where(
          and(
            inArray(analyticsEventsTable.productId, productIds),
            eq(analyticsEventsTable.eventType, "product_selected"),
          ),
        );
      selectionCount = s?.count ?? 0;

      const [c] = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(analyticsEventsTable)
        .where(
          and(
            inArray(analyticsEventsTable.productId, productIds),
            eq(analyticsEventsTable.eventType, "order_created"),
          ),
        );
      conversionCount = c?.count ?? 0;

      const [r] = await db
        .select({ total: sql<number>`COALESCE(SUM(${ordersTable.expectedAmountCents}), 0)` })
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.brandId, id),
            eq(ordersTable.verified, true),
          ),
        );
      revenueCents = Number(r?.total ?? 0);
    }

    const campaigns = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.brandId, id));

    const totalDiscountCents = campaigns.reduce(
      (sum, c) => sum + (c.currentSpendCents ?? 0),
      0,
    );
    const netRevenueCents = revenueCents - totalDiscountCents;
    const conversionRate = viewCount > 0 ? +(conversionCount / viewCount).toFixed(4) : 0;

    const topProducts = await db.execute<{ product_id: string; cnt: number }>(
      sql`
        SELECT COALESCE(cigar_id, drink_id, food_id) AS product_id,
               cast(count(*) as integer) AS cnt
        FROM orders
        WHERE brand_id = ${id} AND verified = true
          AND COALESCE(cigar_id, drink_id, food_id) IS NOT NULL
        GROUP BY product_id
        ORDER BY cnt DESC
        LIMIT 5
      `,
    );

    const topVenues = await db.execute<{ venue_id: string; cnt: number }>(
      sql`
        SELECT venue_id, cast(count(*) as integer) AS cnt
        FROM orders
        WHERE brand_id = ${id} AND verified = true AND venue_id IS NOT NULL
        GROUP BY venue_id
        ORDER BY cnt DESC
        LIMIT 5
      `,
    );

    const [fraudSignals] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(fraudFlagsTable)
      .where(sql`${fraudFlagsTable.details}->>'brandId' = ${id}`);

    res.json({
      partnerId: partner.id,
      partnerName: partner.name,
      tier: partner.tier,
      products: productIds.length,
      campaigns: campaigns.length,
      views: viewCount,
      selections: selectionCount,
      conversions: conversionCount,
      revenueCents,
      discountCostCents: totalDiscountCents,
      netRevenueCents,
      conversionRate,
      monthlyBudgetCents: partner.monthlyBudgetCents ?? null,
      currentMonthSpendCents: partner.currentMonthSpendCents,
      budgetRemainingCents: partner.monthlyBudgetCents
        ? Math.max(0, partner.monthlyBudgetCents - partner.currentMonthSpendCents)
        : null,
      topProducts: topProducts.rows ?? [],
      topVenues: topVenues.rows ?? [],
      fraudSignals: fraudSignals?.count ?? 0,
    });
  },
);

export default router;
