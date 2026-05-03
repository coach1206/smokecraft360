/**
 * Campaigns routes — sponsored placement lifecycle management.
 *
 * GET  /api/campaigns                — list all campaigns
 * POST /api/campaigns                — create a new campaign
 * GET  /api/campaigns/:id            — get a single campaign
 * PATCH /api/campaigns/:id           — update / toggle active
 * POST /api/campaigns/:id/products   — assign products to this campaign
 * GET  /api/campaigns/:id/performance — impression / selection / order metrics
 *
 * Auth: super_admin / venue_owner / manager for most ops.
 *       brand_partner may read their own campaigns + performance.
 */

import { Router, type IRouter, type Response } from "express";
import { eq, inArray, sql }                    from "drizzle-orm";
import {
  db,
  campaignsTable,
  productsTable,
  analyticsEventsTable,
  brandsTable,
} from "@workspace/db";
import { getAllInventory }               from "../services/boostService";
import { setCampaign, removeCampaign }  from "../services/campaignStore";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole }                  from "../middleware/roles";
import { allowOnly }                    from "../middleware/sanitize";

const router: IRouter = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function campaignToMeta(row: typeof campaignsTable.$inferSelect) {
  return {
    id:            row.id,
    name:          row.name,
    brandId:       row.brandId       ?? null,
    distributorId: row.distributorId ?? null,
    budgetCents:   row.budgetCents   ?? null,
    impressionGoal:row.impressionGoal?? null,
    startDate:     row.startDate     ?? null,
    endDate:       row.endDate       ?? null,
    status:        row.status,
    active:        row.active,
  };
}

// ── GET /api/campaigns ────────────────────────────────────────────────────────

router.get(
  "/",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager", "brand_partner"),
  async (req: AuthRequest, res: Response) => {
    const rows = await db
      .select({
        campaign: campaignsTable,
        brandName: brandsTable.name,
      })
      .from(campaignsTable)
      .leftJoin(brandsTable, eq(campaignsTable.brandId, brandsTable.id))
      .orderBy(campaignsTable.createdAt);

    // Count products per campaign from in-memory inventory
    const inventory  = getAllInventory();
    const prodCounts = new Map<string, number>();
    for (const item of inventory) {
      if (item.campaignId) {
        prodCounts.set(item.campaignId, (prodCounts.get(item.campaignId) ?? 0) + 1);
      }
    }

    res.json(rows.map(({ campaign, brandName }) => ({
      ...campaign,
      brandName:    brandName ?? null,
      productCount: prodCounts.get(campaign.id) ?? 0,
    })));
  },
);

// ── POST /api/campaigns ───────────────────────────────────────────────────────

router.post(
  "/",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  allowOnly("name", "brandId", "distributorId", "status", "budgetCents",
            "impressionGoal", "startDate", "endDate", "notes", "active"),
  async (req: AuthRequest, res: Response) => {
    const {
      name, brandId, distributorId, status,
      budgetCents, impressionGoal, startDate, endDate, notes, active,
    } = req.body as {
      name?:          string;
      brandId?:       string;
      distributorId?: string;
      status?:        "draft" | "active" | "paused" | "completed" | "cancelled";
      budgetCents?:   number;
      impressionGoal?:number;
      startDate?:     string;
      endDate?:       string;
      notes?:         string;
      active?:        boolean;
    };

    if (!name?.trim()) {
      res.status(400).json({ error: '"name" is required' }); return;
    }
    if (brandId && !UUID_RE.test(brandId)) {
      res.status(400).json({ error: 'Invalid brandId' }); return;
    }

    const [row] = await db.insert(campaignsTable).values({
      name:          name.trim(),
      brandId:       brandId       ?? null,
      distributorId: distributorId ?? null,
      status:        status        ?? "draft",
      budgetCents:   budgetCents   ?? null,
      impressionGoal:impressionGoal?? null,
      startDate:     startDate     ? new Date(startDate) : null,
      endDate:       endDate       ? new Date(endDate)   : null,
      notes:         notes         ?? null,
      active:        active        ?? false,
    }).returning();

    setCampaign(campaignToMeta(row));
    res.status(201).json(row);
  },
);

// ── GET /api/campaigns/:id ────────────────────────────────────────────────────

router.get(
  "/:id",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager", "brand_partner"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [row] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
    if (!row) { res.status(404).json({ error: "Campaign not found" }); return; }

    // Products linked to this campaign
    const inventory  = getAllInventory();
    const products   = inventory.filter((p) => p.campaignId === id);

    res.json({ ...row, products });
  },
);

// ── PATCH /api/campaigns/:id ──────────────────────────────────────────────────

router.patch(
  "/:id",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  allowOnly("name", "brandId", "distributorId", "status", "budgetCents",
            "impressionGoal", "startDate", "endDate", "notes", "active"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const {
      name, brandId, distributorId, status,
      budgetCents, impressionGoal, startDate, endDate, notes, active,
    } = req.body as Partial<{
      name: string; brandId: string; distributorId: string;
      status: "draft" | "active" | "paused" | "completed" | "cancelled";
      budgetCents: number; impressionGoal: number;
      startDate: string; endDate: string; notes: string; active: boolean;
    }>;

    const updates: Partial<typeof campaignsTable.$inferInsert> = { updatedAt: new Date() };
    if (name          !== undefined) updates.name           = name.trim();
    if (brandId       !== undefined) updates.brandId        = brandId || null;
    if (distributorId !== undefined) updates.distributorId  = distributorId || null;
    if (status        !== undefined) updates.status         = status;
    if (budgetCents   !== undefined) updates.budgetCents    = budgetCents;
    if (impressionGoal!== undefined) updates.impressionGoal = impressionGoal;
    if (startDate     !== undefined) updates.startDate      = startDate ? new Date(startDate) : null;
    if (endDate       !== undefined) updates.endDate        = endDate   ? new Date(endDate)   : null;
    if (notes         !== undefined) updates.notes          = notes;
    if (active        !== undefined) updates.active         = active;

    const [row] = await db.update(campaignsTable)
      .set(updates)
      .where(eq(campaignsTable.id, id))
      .returning();

    if (!row) { res.status(404).json({ error: "Campaign not found" }); return; }

    setCampaign(campaignToMeta(row));
    res.json(row);
  },
);

// ── POST /api/campaigns/:id/products — assign products to campaign ────────────

router.post(
  "/:id/products",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { productIds, clearExisting } = req.body as {
      productIds:     string[];
      clearExisting?: boolean;
    };

    if (!Array.isArray(productIds)) {
      res.status(400).json({ error: '"productIds" must be an array' }); return;
    }

    // Verify campaign exists
    const [campaign] = await db.select({ id: campaignsTable.id })
      .from(campaignsTable).where(eq(campaignsTable.id, id));
    if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }

    // Optionally clear all existing assignments for this campaign
    if (clearExisting) {
      await db.update(productsTable)
        .set({ campaignId: null })
        .where(eq(productsTable.campaignId, id));
    }

    // Assign new product IDs
    let assigned = 0;
    if (productIds.length > 0) {
      const result = await db.update(productsTable)
        .set({ campaignId: id })
        .where(inArray(productsTable.id, productIds));
      assigned = result.rowCount ?? 0;

      // Update in-memory boost store for each assigned product
      const { applyBoost } = await import("../services/boostService");
      await Promise.all(productIds.map((pid) => applyBoost(pid, { campaignId: id })));
    }

    res.json({ campaignId: id, assigned });
  },
);

// ── GET /api/campaigns/:id/performance ───────────────────────────────────────

router.get(
  "/:id/performance",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager", "brand_partner"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, id));
    if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }

    // Products linked to this campaign (in-memory)
    const inventory  = getAllInventory();
    const linkedProds= inventory.filter((p) => p.campaignId === id);
    const productIds = linkedProds.map((p) => p.id);

    let impressions   = 0;
    let clicks        = 0;
    let conversions   = 0;
    const productBreakdown: {
      productId: string; name: string; impressions: number; clicks: number; conversions: number;
    }[] = [];

    if (productIds.length > 0) {
      const eventRows = await db.execute<{ product_id: string; event_type: string; cnt: number }>(
        sql`
          SELECT product_id, event_type, cast(count(*) as integer) AS cnt
          FROM analytics_events
          WHERE product_id = ANY(${sql.raw(`ARRAY[${productIds.map((p) => `'${p}'`).join(",")}]`)})
            AND event_type IN ('recommendation_view','product_selected','order_created')
          GROUP BY product_id, event_type
        `,
      );

      type PerfAcc = { impressions: number; clicks: number; conversions: number };
      const byProduct = new Map<string, PerfAcc>();

      for (const row of eventRows.rows) {
        const pid = String(row.product_id);
        const acc = byProduct.get(pid) ?? { impressions: 0, clicks: 0, conversions: 0 };
        const cnt = Number(row.cnt);
        if (row.event_type === "recommendation_view") acc.impressions += cnt;
        if (row.event_type === "product_selected")    acc.clicks      += cnt;
        if (row.event_type === "order_created")       acc.conversions += cnt;
        byProduct.set(pid, acc);
      }

      for (const prod of linkedProds) {
        const acc = byProduct.get(prod.id) ?? { impressions: 0, clicks: 0, conversions: 0 };
        impressions += acc.impressions;
        clicks      += acc.clicks;
        conversions += acc.conversions;
        productBreakdown.push({
          productId:   prod.id,
          name:        prod.name,
          impressions: acc.impressions,
          clicks:      acc.clicks,
          conversions: acc.conversions,
        });
      }
    }

    const ctr = impressions > 0 ? Math.round((clicks      / impressions) * 100) : 0;
    const cvr = clicks      > 0 ? Math.round((conversions / clicks)      * 100) : 0;

    // Budget pacing (if set)
    const daysTotal = campaign.startDate && campaign.endDate
      ? Math.max(1, Math.ceil((campaign.endDate.getTime() - campaign.startDate.getTime()) / 86_400_000))
      : null;
    const daysElapsed = campaign.startDate
      ? Math.max(0, Math.floor((Date.now() - campaign.startDate.getTime()) / 86_400_000))
      : null;

    res.json({
      campaign: {
        id:   campaign.id,
        name: campaign.name,
        status: campaign.status,
        active: campaign.active,
        startDate:     campaign.startDate,
        endDate:       campaign.endDate,
        budgetCents:   campaign.budgetCents,
        impressionGoal:campaign.impressionGoal,
      },
      performance: {
        impressions,
        clicks,
        conversions,
        ctr,
        cvr,
        productCount: linkedProds.length,
      },
      pacing: daysTotal !== null && daysElapsed !== null ? {
        daysTotal,
        daysElapsed,
        daysRemaining: Math.max(0, daysTotal - daysElapsed),
        pct:           Math.min(100, Math.round((daysElapsed / daysTotal) * 100)),
        impressionGoalPct: campaign.impressionGoal && campaign.impressionGoal > 0
          ? Math.min(100, Math.round((impressions / campaign.impressionGoal) * 100))
          : null,
      } : null,
      productBreakdown,
    });
  },
);

export default router;
