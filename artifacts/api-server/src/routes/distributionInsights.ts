import { Router, type IRouter, type Response } from "express";
import { eq, and, sql, gte, inArray } from "drizzle-orm";
import {
  db,
  analyticsEventsTable,
  brandPartnersTable,
  brandProductsTable,
  campaignsTable,
  ordersTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router: IRouter = Router();

// ── GET /api/distribution — summary (partner count + recent order count) ─────
router.get(
  "/",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin", "brand_partner"),
  async (_req: AuthRequest, res: Response) => {
    const [partnerCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(brandPartnersTable);

    const [orderCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(ordersTable)
      .where(gte(ordersTable.createdAt, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));

    res.json({
      activePartners: partnerCount?.count ?? 0,
      ordersLast30Days: orderCount?.count ?? 0,
      generatedAt: new Date().toISOString(),
    });
  },
);

router.get(
  "/brand-performance",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin", "brand_partner"),
  async (_req: AuthRequest, res: Response) => {
    const partners = await db.select().from(brandPartnersTable);

    const results = [];
    for (const partner of partners) {
      const links = await db
        .select({ productId: brandProductsTable.productId })
        .from(brandProductsTable)
        .where(eq(brandProductsTable.brandId, partner.id));

      const productIds = links.map((l) => l.productId);

      let views = 0;
      let selections = 0;
      let conversions = 0;

      if (productIds.length > 0) {
        const [viewRow] = await db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(analyticsEventsTable)
          .where(
            and(
              inArray(analyticsEventsTable.productId, productIds),
              eq(analyticsEventsTable.eventType, "recommendation_view"),
            ),
          );
        views = viewRow?.count ?? 0;

        const [selectRow] = await db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(analyticsEventsTable)
          .where(
            and(
              inArray(analyticsEventsTable.productId, productIds),
              eq(analyticsEventsTable.eventType, "product_selected"),
            ),
          );
        selections = selectRow?.count ?? 0;

        const [convRow] = await db
          .select({ count: sql<number>`cast(count(*) as integer)` })
          .from(analyticsEventsTable)
          .where(
            and(
              inArray(analyticsEventsTable.productId, productIds),
              eq(analyticsEventsTable.eventType, "order_created"),
            ),
          );
        conversions = convRow?.count ?? 0;
      }

      results.push({
        partnerId: partner.id,
        partnerName: partner.name,
        tier: partner.tier,
        products: productIds.length,
        views,
        selections,
        conversions,
        ctr: views > 0 ? +(selections / views).toFixed(4) : 0,
        cvr: selections > 0 ? +(conversions / selections).toFixed(4) : 0,
      });
    }

    res.json(results);
  },
);

router.get(
  "/campaign-roi",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (_req: AuthRequest, res: Response) => {
    const campaigns = await db.select().from(campaignsTable);

    const results = [];
    for (const campaign of campaigns) {
      const [triggered] = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(analyticsEventsTable)
        .where(
          and(
            eq(analyticsEventsTable.eventType, "campaign_triggered"),
            sql`${analyticsEventsTable.metadata}->>'campaignId' = ${campaign.id}`,
          ),
        );

      const [converted] = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(analyticsEventsTable)
        .where(
          and(
            eq(analyticsEventsTable.eventType, "campaign_conversion"),
            sql`${analyticsEventsTable.metadata}->>'campaignId' = ${campaign.id}`,
          ),
        );

      const [revenue] = await db
        .select({ total: sql<number>`COALESCE(SUM(${ordersTable.expectedAmountCents}), 0)` })
        .from(ordersTable)
        .where(eq(ordersTable.campaignId, campaign.id));

      results.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        type: campaign.type,
        status: campaign.status,
        triggered: triggered?.count ?? 0,
        converted: converted?.count ?? 0,
        revenueCents: Number(revenue?.total ?? 0),
        budgetCents: campaign.budgetCents,
        roi: campaign.budgetCents && campaign.budgetCents > 0
          ? +((Number(revenue?.total ?? 0) / campaign.budgetCents)).toFixed(2)
          : null,
      });
    }

    res.json(results);
  },
);

export default router;
