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
import { logAudit }                     from "../lib/audit";

const router: IRouter = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function campaignToMeta(row: typeof campaignsTable.$inferSelect) {
  return {
    id:              row.id,
    name:            row.name,
    type:            row.type ?? "GENERAL",
    brandId:         row.brandId       ?? null,
    distributorId:   row.distributorId ?? null,
    venueId:         row.venueId       ?? null,
    craftType:       row.craftType     ?? null,
    boostMultiplier: row.boostMultiplier ?? 1.0,
    xpMultiplier:    row.xpMultiplier  ?? 1.0,
    rewardBonus:     row.rewardBonus   ?? 0,
    budgetCents:     row.budgetCents   ?? null,
    budgetLimit:     row.budgetLimit   ?? null,
    impressionGoal:  row.impressionGoal ?? null,
    maxRedemptions:  row.maxRedemptions ?? null,
    startDate:       row.startDate     ?? null,
    endDate:         row.endDate       ?? null,
    status:          row.status,
    active:          row.active,
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
  allowOnly("name", "type", "brandId", "distributorId", "venueId", "craftType",
            "status", "boostMultiplier", "xpMultiplier", "rewardBonus",
            "budgetCents", "budgetLimit", "impressionGoal", "maxRedemptions",
            "startDate", "endDate", "notes", "active"),
  async (req: AuthRequest, res: Response) => {
    const {
      name, type, brandId, distributorId, venueId, craftType, status,
      boostMultiplier, xpMultiplier, rewardBonus,
      budgetCents, budgetLimit, impressionGoal, maxRedemptions,
      startDate, endDate, notes, active,
    } = req.body as {
      name?:            string;
      type?:            string;
      brandId?:         string;
      distributorId?:   string;
      venueId?:         string;
      craftType?:       string;
      status?:          "draft" | "active" | "paused" | "completed" | "cancelled";
      boostMultiplier?: number;
      xpMultiplier?:    number;
      rewardBonus?:     number;
      budgetCents?:     number;
      budgetLimit?:     number;
      impressionGoal?:  number;
      maxRedemptions?:  number;
      startDate?:       string;
      endDate?:         string;
      notes?:           string;
      active?:          boolean;
    };

    if (!name?.trim()) {
      res.status(400).json({ error: '"name" is required' }); return;
    }
    if (brandId && !UUID_RE.test(brandId)) {
      res.status(400).json({ error: 'Invalid brandId' }); return;
    }

    const VALID_TYPES = ["BRAND_SPOTLIGHT", "DOUBLE_XP", "FEATURED_PAIRING", "VENUE_CHALLENGE", "COMPETITION", "DISTRIBUTOR_PUSH", "SEASONAL_PROMO", "GENERAL"];
    if (type && !VALID_TYPES.includes(type)) {
      res.status(400).json({ error: `"type" must be one of: ${VALID_TYPES.join(", ")}` }); return;
    }
    if (boostMultiplier !== undefined && (boostMultiplier < 0.1 || boostMultiplier > 3.0)) {
      res.status(400).json({ error: '"boostMultiplier" must be between 0.1 and 3.0' }); return;
    }
    if (xpMultiplier !== undefined && (xpMultiplier < 0.1 || xpMultiplier > 3.0)) {
      res.status(400).json({ error: '"xpMultiplier" must be between 0.1 and 3.0' }); return;
    }
    if (rewardBonus !== undefined && (rewardBonus < 0 || rewardBonus > 50000)) {
      res.status(400).json({ error: '"rewardBonus" must be between 0 and 50000' }); return;
    }
    if (budgetLimit !== undefined && budgetLimit < 0) {
      res.status(400).json({ error: '"budgetLimit" must be >= 0' }); return;
    }
    if (maxRedemptions !== undefined && maxRedemptions < 0) {
      res.status(400).json({ error: '"maxRedemptions" must be >= 0' }); return;
    }

    const [row] = await db.insert(campaignsTable).values({
      name:            name.trim(),
      type:            (type as any) ?? "GENERAL",
      brandId:         brandId       ?? null,
      distributorId:   distributorId ?? null,
      venueId:         venueId       ?? null,
      craftType:       craftType     ?? null,
      status:          status        ?? "draft",
      boostMultiplier: boostMultiplier ?? 1.0,
      xpMultiplier:    xpMultiplier  ?? 1.0,
      rewardBonus:     rewardBonus   ?? 0,
      budgetCents:     budgetCents   ?? null,
      budgetLimit:     budgetLimit   ?? null,
      impressionGoal:  impressionGoal ?? null,
      maxRedemptions:  maxRedemptions ?? null,
      startDate:       startDate     ? new Date(startDate) : null,
      endDate:         endDate       ? new Date(endDate)   : null,
      notes:           notes         ?? null,
      active:          active        ?? false,
    }).returning();

    setCampaign(campaignToMeta(row));

    await logAudit(req, {
      action: "campaign.created",
      entityType: "campaign",
      entityId: row.id,
      after: { name: row.name, type: row.type, status: row.status } as unknown as Record<string, unknown>,
    });

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
  allowOnly("name", "type", "brandId", "distributorId", "venueId", "craftType",
            "status", "boostMultiplier", "xpMultiplier", "rewardBonus",
            "budgetCents", "budgetLimit", "impressionGoal", "maxRedemptions",
            "startDate", "endDate", "notes", "active"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const {
      name, type, brandId, distributorId, venueId, craftType, status,
      boostMultiplier, xpMultiplier, rewardBonus,
      budgetCents, budgetLimit, impressionGoal, maxRedemptions,
      startDate, endDate, notes, active,
    } = req.body as Partial<{
      name: string; type: string; brandId: string; distributorId: string;
      venueId: string; craftType: string;
      status: "draft" | "active" | "paused" | "completed" | "cancelled";
      boostMultiplier: number; xpMultiplier: number; rewardBonus: number;
      budgetCents: number; budgetLimit: number;
      impressionGoal: number; maxRedemptions: number;
      startDate: string; endDate: string; notes: string; active: boolean;
    }>;

    const VALID_TYPES = ["BRAND_SPOTLIGHT", "DOUBLE_XP", "FEATURED_PAIRING", "VENUE_CHALLENGE", "COMPETITION", "DISTRIBUTOR_PUSH", "SEASONAL_PROMO", "GENERAL"];
    if (type !== undefined && !VALID_TYPES.includes(type)) {
      res.status(400).json({ error: `"type" must be one of: ${VALID_TYPES.join(", ")}` }); return;
    }
    if (boostMultiplier !== undefined && (boostMultiplier < 0.1 || boostMultiplier > 3.0)) {
      res.status(400).json({ error: '"boostMultiplier" must be between 0.1 and 3.0' }); return;
    }
    if (xpMultiplier !== undefined && (xpMultiplier < 0.1 || xpMultiplier > 3.0)) {
      res.status(400).json({ error: '"xpMultiplier" must be between 0.1 and 3.0' }); return;
    }
    if (rewardBonus !== undefined && (rewardBonus < 0 || rewardBonus > 50000)) {
      res.status(400).json({ error: '"rewardBonus" must be between 0 and 50000' }); return;
    }
    if (budgetLimit !== undefined && budgetLimit < 0) {
      res.status(400).json({ error: '"budgetLimit" must be >= 0' }); return;
    }
    if (maxRedemptions !== undefined && maxRedemptions < 0) {
      res.status(400).json({ error: '"maxRedemptions" must be >= 0' }); return;
    }

    const updates: Partial<typeof campaignsTable.$inferInsert> = {
      updatedAt: new Date(),
      updatedBy: req.user?.id ?? null,
    };
    if (name            !== undefined) updates.name            = name.trim();
    if (type            !== undefined) updates.type            = type as any;
    if (brandId         !== undefined) updates.brandId         = brandId || null;
    if (distributorId   !== undefined) updates.distributorId   = distributorId || null;
    if (venueId         !== undefined) updates.venueId         = venueId || null;
    if (craftType       !== undefined) updates.craftType       = craftType || null;
    if (status          !== undefined) updates.status          = status;
    if (boostMultiplier !== undefined) updates.boostMultiplier = boostMultiplier;
    if (xpMultiplier    !== undefined) updates.xpMultiplier    = xpMultiplier;
    if (rewardBonus     !== undefined) updates.rewardBonus     = rewardBonus;
    if (budgetCents     !== undefined) updates.budgetCents     = budgetCents;
    if (budgetLimit     !== undefined) updates.budgetLimit     = budgetLimit;
    if (impressionGoal  !== undefined) updates.impressionGoal  = impressionGoal;
    if (maxRedemptions  !== undefined) updates.maxRedemptions  = maxRedemptions;
    if (startDate       !== undefined) updates.startDate       = startDate ? new Date(startDate) : null;
    if (endDate         !== undefined) updates.endDate         = endDate   ? new Date(endDate)   : null;
    if (notes           !== undefined) updates.notes           = notes;
    if (active          !== undefined) updates.active          = active;

    const [row] = await db.update(campaignsTable)
      .set(updates)
      .where(eq(campaignsTable.id, id))
      .returning();

    if (!row) { res.status(404).json({ error: "Campaign not found" }); return; }

    setCampaign(campaignToMeta(row));

    await logAudit(req, {
      action: "campaign.updated",
      entityType: "campaign",
      entityId: row.id,
      after: updates as unknown as Record<string, unknown>,
    });

    res.json(row);
  },
);

// ── POST /api/campaigns/:id/pause ────────────────────────────────────────────

router.post(
  "/:id/pause",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [row] = await db.update(campaignsTable)
      .set({ status: "paused" as any, updatedAt: new Date(), updatedBy: req.user?.id ?? null })
      .where(eq(campaignsTable.id, id))
      .returning();

    if (!row) { res.status(404).json({ error: "Campaign not found" }); return; }

    setCampaign(campaignToMeta(row));

    await logAudit(req, {
      action: "campaign.paused",
      entityType: "campaign",
      entityId: row.id,
      after: { status: "paused" },
    });

    res.json(row);
  },
);

// ── POST /api/campaigns/:id/resume ───────────────────────────────────────────

router.post(
  "/:id/resume",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [row] = await db.update(campaignsTable)
      .set({ status: "active" as any, active: true, updatedAt: new Date(), updatedBy: req.user?.id ?? null })
      .where(eq(campaignsTable.id, id))
      .returning();

    if (!row) { res.status(404).json({ error: "Campaign not found" }); return; }

    setCampaign(campaignToMeta(row));

    await logAudit(req, {
      action: "campaign.resumed",
      entityType: "campaign",
      entityId: row.id,
      after: { status: "active" },
    });

    res.json(row);
  },
);

// ── POST /api/campaigns/:id/disable ──────────────────────────────────────────

router.post(
  "/:id/disable",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [row] = await db.update(campaignsTable)
      .set({ status: "cancelled" as any, active: false, updatedAt: new Date(), updatedBy: req.user?.id ?? null })
      .where(eq(campaignsTable.id, id))
      .returning();

    if (!row) { res.status(404).json({ error: "Campaign not found" }); return; }

    setCampaign(campaignToMeta(row));

    await logAudit(req, {
      action: "campaign.disabled",
      entityType: "campaign",
      entityId: row.id,
      after: { status: "cancelled", active: false },
    });

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

    await logAudit(req, {
      action: "campaign.products_assigned",
      entityType: "campaign",
      entityId: id,
      after: { productIds, assigned, clearExisting: !!clearExisting } as unknown as Record<string, unknown>,
    });

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
          WHERE product_id = ANY(${productIds})
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
