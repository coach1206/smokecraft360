/**
 * /api/ads — Ad Injection & Ticker Engine
 *
 *   GET  /api/ads/ticker?venueId=&craftType=&region=
 *       Active ticker items — filtered by date window, craft, and venue region.
 *
 *   POST /api/ads/ticker   (venue_owner | manager | super_admin)
 *       Create a ticker campaign.
 *
 *   PATCH /api/ads/ticker/:id   (same roles)
 *       Update an existing campaign.
 *
 *   DELETE /api/ads/ticker/:id  (same roles)
 *       Deactivate (soft-delete) a campaign.
 *
 *   GET  /api/ads/prestige?venueId=&craftType=
 *       Active vendor_placement sponsored products for Prestige Nudge injection.
 *
 *   POST /api/ads/impression
 *       Log an ad event (impression | click | add_to_draft | nudge_converted)
 *       and atomically increment the counter on the ticker row.
 *
 *   GET  /api/ads/analytics?venueId=
 *       Revenue Control Center — per-ticker aggregated metrics:
 *       impressions, clicks, CTR, add-to-draft, nudge_converted, conversions.
 */

import { Router, type Request, type Response } from "express";
import { eq, and, or, isNull, gte, lte, sql, count, desc } from "drizzle-orm";
import { db, sponsorTickersTable, vendorPlacementsTable,
         productsTable, adImpressionsTable,
         venueRevenuePressureTable }              from "@workspace/db";
import { z }                                      from "zod";
import { requireAuth }                            from "../middleware/auth";
import { requireRole }                            from "../middleware/roles";
import type { AuthRequest }                       from "../middleware/auth";

const router = Router();
const now    = () => new Date();

// ── GET /ticker ────────────────────────────────────────────────────────────────

router.get("/ticker", async (req: Request, res: Response) => {
  const venueId   = req.query["venueId"]   as string | undefined;
  const craftType = req.query["craftType"] as string | undefined;
  const region    = req.query["region"]    as string | undefined;   // ISO 3166-2

  const rows = await db
    .select()
    .from(sponsorTickersTable)
    .where(
      and(
        eq(sponsorTickersTable.active, true),
        or(
          isNull(sponsorTickersTable.venueId),
          venueId ? eq(sponsorTickersTable.venueId, venueId) : isNull(sponsorTickersTable.venueId),
        ),
        or(isNull(sponsorTickersTable.startsAt), lte(sponsorTickersTable.startsAt, now())),
        or(isNull(sponsorTickersTable.endsAt),   gte(sponsorTickersTable.endsAt,   now())),
      ),
    )
    .orderBy(sponsorTickersTable.priority, sponsorTickersTable.createdAt)
    .limit(30);

  let filtered = rows;

  // Craft filter
  if (craftType) {
    filtered = filtered.filter(r =>
      !r.craftTypes || r.craftTypes.split(",").map(s => s.trim()).includes(craftType),
    );
  }

  // Regional Trend Sync: prefer region-matched rows; fall back to global (null targetRegion)
  if (region) {
    const regional = filtered.filter(r => r.targetRegion === region);
    const global_  = filtered.filter(r => !r.targetRegion);
    // Regional promos surface first; global fill the rest
    filtered = [...regional, ...global_];
  }

  const items = filtered.map(r => {
    let revealHeadline: string | undefined;
    let revealBody:     string | undefined;
    let revealCtaText:  string | undefined;
    if (r.revealContent) {
      try {
        const parsed = JSON.parse(r.revealContent) as { headline?: string; body?: string; ctaText?: string };
        revealHeadline = parsed.headline;
        revealBody     = parsed.body;
        revealCtaText  = parsed.ctaText;
      } catch { /* ignore malformed JSON */ }
    }
    return {
      id:                  r.id,
      brandName:           r.brandName,
      logoUrl:             r.logoUrl,
      promoText:           r.promoText,
      promoLink:           r.promoLink,
      pointBonus:          r.pointBonus,
      prestigeMultiplier:  r.prestigeMultiplier,
      priority:            r.priority,
      craftTypes:          r.craftTypes,
      targetRegion:        r.targetRegion,
      isSponsored:         true,
      revealHeadline,
      revealBody,
      revealCtaText,
    };
  });

  res.json({ items, count: items.length, timestamp: new Date().toISOString() });
});

// ── POST /ticker ───────────────────────────────────────────────────────────────

const createTickerSchema = z.object({
  brandName:           z.string().min(1).max(100).trim(),
  logoUrl:             z.string().url().optional(),
  promoText:           z.string().min(1).max(80).trim(),
  promoLink:           z.string().optional(),
  revealContent:       z.string().optional(),           // JSON string
  craftTypes:          z.string().optional(),
  targetRegion:        z.string().max(12).optional(),   // ISO 3166-2
  pointBonus:          z.number().int().min(0).max(100).optional().default(15),
  prestigeMultiplier:  z.number().min(1).max(3).optional().default(1.0),
  priority:            z.number().int().min(0).optional().default(100),
  venueId:             z.string().uuid().optional(),
  brandPartnerId:      z.string().uuid().optional(),
  startsAt:            z.string().datetime().optional(),
  endsAt:              z.string().datetime().optional(),
});

router.post("/ticker", requireAuth, requireRole("venue_owner", "manager", "super_admin"), async (req: AuthRequest, res: Response) => {
  const body = createTickerSchema.parse(req.body);

  const [ticker] = await db
    .insert(sponsorTickersTable)
    .values({
      brandName:          body.brandName,
      logoUrl:            body.logoUrl,
      promoText:          body.promoText,
      promoLink:          body.promoLink,
      revealContent:      body.revealContent,
      craftTypes:         body.craftTypes,
      targetRegion:       body.targetRegion,
      pointBonus:         body.pointBonus,
      prestigeMultiplier: body.prestigeMultiplier,
      priority:           body.priority,
      venueId:            body.venueId,
      brandPartnerId:     body.brandPartnerId,
      startsAt:           body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt:             body.endsAt   ? new Date(body.endsAt)   : undefined,
      active:             true,
    })
    .returning();

  res.status(201).json({ ticker });
});

// ── PATCH /ticker/:id ──────────────────────────────────────────────────────────

router.patch("/ticker/:id", requireAuth, requireRole("venue_owner", "manager", "super_admin"), async (req: AuthRequest, res: Response) => {
  const body = createTickerSchema.partial().parse(req.body);
  const { startsAt, endsAt, ...rest } = body;

  const [ticker] = await db
    .update(sponsorTickersTable)
    .set({
      ...rest,
      updatedAt: new Date(),
      ...(startsAt !== undefined ? { startsAt: new Date(startsAt) } : {}),
      ...(endsAt   !== undefined ? { endsAt:   new Date(endsAt)   } : {}),
    })
    .where(eq(sponsorTickersTable.id, req.params.id as string))
    .returning();

  if (!ticker) { res.status(404).json({ error: "Ticker not found" }); return; }
  res.json({ ticker });
});

// ── DELETE /ticker/:id — soft deactivate ──────────────────────────────────────

router.delete("/ticker/:id", requireAuth, requireRole("venue_owner", "manager", "super_admin"), async (req: AuthRequest, res: Response) => {
  const [ticker] = await db
    .update(sponsorTickersTable)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(sponsorTickersTable.id, req.params.id as string))
    .returning({ id: sponsorTickersTable.id });

  if (!ticker) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ok: true });
});

// ── GET /prestige ─────────────────────────────────────────────────────────────

router.get("/prestige", async (req: Request, res: Response) => {
  const craftType = req.query["craftType"] as string | undefined;

  const placements = await db
    .select({
      placementId:   vendorPlacementsTable.id,
      productId:     vendorPlacementsTable.productId,
      brandId:       vendorPlacementsTable.brandId,
      placementType: vendorPlacementsTable.placementType,
      productName:   productsTable.name,
      category:      productsTable.category,
    })
    .from(vendorPlacementsTable)
    .innerJoin(productsTable, eq(vendorPlacementsTable.productId, productsTable.id))
    .where(
      and(
        eq(vendorPlacementsTable.status, "active"),
        or(isNull(vendorPlacementsTable.endDate), gte(vendorPlacementsTable.endDate, now())),
      ),
    )
    .limit(10);

  const CRAFT_CATS: Record<string, string[]> = {
    smoke: ["cigar"],
    pour:  ["alcohol", "wine", "cocktail"],
    brew:  ["beer"],
  };

  const prestigeItems = placements.map(p => ({
    productId:    p.productId,
    productName:  p.productName,
    category:     p.category,
    isPromoted:   true,
    pointBonus:   p.placementType === "sponsored" ? 15 : p.placementType === "premium" ? 10 : 5,
    placementType: p.placementType,
    brandId:      p.brandId,
  }));

  const allowed = craftType ? (CRAFT_CATS[craftType] ?? null) : null;
  const filtered = allowed ? prestigeItems.filter(i => allowed.includes(i.category)) : prestigeItems;

  res.json({ items: filtered, count: filtered.length });
});

// ── POST /impression ──────────────────────────────────────────────────────────

const impressionSchema = z.object({
  tickerId:       z.string().uuid(),
  eventType:      z.enum(["impression", "click", "add_to_draft", "nudge_converted"]),
  venueId:        z.string().uuid().optional(),
  guestProfileId: z.string().uuid().optional(),
  craftType:      z.string().optional(),
  region:         z.string().optional(),
  sessionId:      z.string().optional(),
});

router.post("/impression", async (req: Request, res: Response) => {
  const body = impressionSchema.parse(req.body);

  // Insert event row
  await db.insert(adImpressionsTable).values({
    tickerId:       body.tickerId,
    eventType:      body.eventType,
    venueId:        body.venueId,
    guestProfileId: body.guestProfileId,
    craftType:      body.craftType,
    region:         body.region,
    sessionId:      body.sessionId,
  });

  // Atomically increment the appropriate counter on the ticker row
  if (body.eventType === "impression") {
    await db.update(sponsorTickersTable)
      .set({ impressionCount: sql`${sponsorTickersTable.impressionCount} + 1` })
      .where(eq(sponsorTickersTable.id, body.tickerId));
  } else if (body.eventType === "click") {
    await db.update(sponsorTickersTable)
      .set({ clickCount: sql`${sponsorTickersTable.clickCount} + 1` })
      .where(eq(sponsorTickersTable.id, body.tickerId));
  }

  res.json({ ok: true });
});

// ── GET /analytics — Revenue Control Center ───────────────────────────────────

router.get("/analytics", requireAuth, requireRole("venue_owner", "manager", "super_admin"), async (req: AuthRequest, res: Response) => {
  const venueId = req.query["venueId"] as string | undefined;

  // All tickers (including inactive) for the venue or platform-wide
  const tickers = await db
    .select()
    .from(sponsorTickersTable)
    .where(
      venueId
        ? or(isNull(sponsorTickersTable.venueId), eq(sponsorTickersTable.venueId, venueId))
        : undefined,
    )
    .orderBy(desc(sponsorTickersTable.impressionCount))
    .limit(50);

  // Aggregate impression events per ticker
  const eventCounts = await db
    .select({
      tickerId:  adImpressionsTable.tickerId,
      eventType: adImpressionsTable.eventType,
      cnt:       count(),
    })
    .from(adImpressionsTable)
    .groupBy(adImpressionsTable.tickerId, adImpressionsTable.eventType);

  // Nudge-to-purchase conversions from revenue_pressure table
  const conversions = await db
    .select({ cnt: count() })
    .from(venueRevenuePressureTable)
    .where(eq(venueRevenuePressureTable.saleConfirmed, true));

  const totalConversions = Number(conversions[0]?.cnt ?? 0);

  // Build per-ticker summary
  const tickerMap = new Map<string, { impressions: number; clicks: number; addToDraft: number; nudgeConverted: number }>();
  for (const { tickerId, eventType, cnt } of eventCounts) {
    if (!tickerMap.has(tickerId)) {
      tickerMap.set(tickerId, { impressions: 0, clicks: 0, addToDraft: 0, nudgeConverted: 0 });
    }
    const entry = tickerMap.get(tickerId)!;
    const n = Number(cnt);
    if      (eventType === "impression")      entry.impressions  += n;
    else if (eventType === "click")           entry.clicks       += n;
    else if (eventType === "add_to_draft")    entry.addToDraft   += n;
    else if (eventType === "nudge_converted") entry.nudgeConverted += n;
  }

  const summary = tickers.map(t => {
    const ev  = tickerMap.get(t.id) ?? { impressions: 0, clicks: 0, addToDraft: 0, nudgeConverted: 0 };
    // Prefer DB counter columns (faster); fall back to event aggregation
    const imp = Math.max(t.impressionCount, ev.impressions);
    const clk = Math.max(t.clickCount,      ev.clicks);
    const ctr = imp > 0 ? Math.round((clk / imp) * 10000) / 100 : 0; // percent, 2dp

    return {
      id:                  t.id,
      brandName:           t.brandName,
      logoUrl:             t.logoUrl,
      promoText:           t.promoText,
      active:              t.active,
      targetRegion:        t.targetRegion,
      craftTypes:          t.craftTypes,
      pointBonus:          t.pointBonus,
      prestigeMultiplier:  t.prestigeMultiplier,
      startsAt:            t.startsAt,
      endsAt:              t.endsAt,
      impressions:         imp,
      clicks:              clk,
      addToDraft:          ev.addToDraft,
      nudgeConverted:      ev.nudgeConverted,
      ctr,
    };
  });

  const totals = summary.reduce(
    (acc, r) => ({
      impressions: acc.impressions + r.impressions,
      clicks:      acc.clicks      + r.clicks,
      addToDraft:  acc.addToDraft  + r.addToDraft,
    }),
    { impressions: 0, clicks: 0, addToDraft: 0 },
  );
  const globalCtr = totals.impressions > 0
    ? Math.round((totals.clicks / totals.impressions) * 10000) / 100
    : 0;

  res.json({
    tickers:          summary,
    totals:           { ...totals, ctr: globalCtr, nudgeConversions: totalConversions },
    generatedAt:      new Date().toISOString(),
  });
});

export default router;
