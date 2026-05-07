/**
 * /api/ads — Ad Injection & Ticker Engine
 *
 *   GET  /api/ads/ticker?venueId=&craftType=
 *       Returns active ticker items for the guest-facing TickerTape component.
 *       Merges sponsor_tickers + active vendor_placements brand data.
 *
 *   POST /api/ads/ticker   (admin / super_admin)
 *       Create a new ticker item.
 *
 *   GET  /api/ads/prestige?venueId=&craftType=
 *       Returns active "Prestige Nudge" sponsored products ready for injection
 *       into the recommendation engine. Each item has isPromoted + pointBonus.
 *
 *   POST /api/ads/impression   (internal)
 *       Log a ticker or prestige impression for ROI reporting.
 */

import { Router, type Request, type Response } from "express";
import { eq, and, or, isNull, gte, lte, sql } from "drizzle-orm";
import { db, sponsorTickersTable, brandPartnersTable,
         vendorPlacementsTable, productsTable }  from "@workspace/db";
import { z }                                     from "zod";
import { requireAuth }                           from "../middleware/auth";
import { requireRole }                           from "../middleware/roles";
import type { AuthRequest }                      from "../middleware/auth";

const router = Router();
const now    = () => new Date();

// ── GET /ticker ────────────────────────────────────────────────────────────────

router.get("/ticker", async (req: Request, res: Response) => {
  const venueId   = req.query["venueId"]   as string | undefined;
  const craftType = req.query["craftType"] as string | undefined;

  // Fetch active sponsor_tickers (platform-wide or venue-specific, within date range)
  const tickerRows = await db
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
    .limit(20);

  // Filter by craftType if provided
  const filtered = craftType
    ? tickerRows.filter(r => !r.craftTypes || r.craftTypes.split(",").map(s => s.trim()).includes(craftType))
    : tickerRows;

  // Shape for frontend consumption
  const items = filtered.map(r => ({
    id:         r.id,
    brandName:  r.brandName,
    logoUrl:    r.logoUrl,
    promoText:  r.promoText,
    promoLink:  r.promoLink,
    pointBonus: r.pointBonus,
    priority:   r.priority,
    isSponsored: true,
  }));

  // If no live sponsors, return empty (frontend will show default Axiom messaging)
  res.json({ items, count: items.length, timestamp: new Date().toISOString() });
});

// ── POST /ticker ───────────────────────────────────────────────────────────────

const createTickerSchema = z.object({
  brandName:      z.string().min(1).max(100).trim(),
  logoUrl:        z.string().url().optional(),
  promoText:      z.string().min(1).max(80).trim(),
  promoLink:      z.string().optional(),
  craftTypes:     z.string().optional(),
  pointBonus:     z.number().int().min(0).max(50).optional().default(15),
  priority:       z.number().int().min(0).optional().default(100),
  venueId:        z.string().uuid().optional(),
  brandPartnerId: z.string().uuid().optional(),
  startsAt:       z.string().datetime().optional(),
  endsAt:         z.string().datetime().optional(),
});

router.post("/ticker", requireAuth, requireRole("venue_owner", "manager", "super_admin"), async (req: AuthRequest, res: Response) => {
  const body = createTickerSchema.parse(req.body);

  const [ticker] = await db
    .insert(sponsorTickersTable)
    .values({
      brandName:      body.brandName,
      logoUrl:        body.logoUrl,
      promoText:      body.promoText,
      promoLink:      body.promoLink,
      craftTypes:     body.craftTypes,
      pointBonus:     body.pointBonus,
      priority:       body.priority,
      venueId:        body.venueId,
      brandPartnerId: body.brandPartnerId,
      startsAt:       body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt:         body.endsAt   ? new Date(body.endsAt)   : undefined,
      active:         true,
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
      ...(startsAt !== undefined ? { startsAt: new Date(startsAt) } : {}),
      ...(endsAt   !== undefined ? { endsAt:   new Date(endsAt)   } : {}),
    })
    .where(eq(sponsorTickersTable.id, req.params.id as string))
    .returning();

  if (!ticker) { res.status(404).json({ error: "Ticker not found" }); return; }
  res.json({ ticker });
});

// ── GET /prestige — sponsored product injection list ──────────────────────────

router.get("/prestige", async (req: Request, res: Response) => {
  const venueId   = req.query["venueId"]   as string | undefined;
  const craftType = req.query["craftType"] as string | undefined;

  // Pull active "sponsored" vendor placements within date window
  const placements = await db
    .select({
      placementId:  vendorPlacementsTable.id,
      productId:    vendorPlacementsTable.productId,
      brandId:      vendorPlacementsTable.brandId,
      placementType: vendorPlacementsTable.placementType,
      productName:  productsTable.name,
      category:     productsTable.category,
    })
    .from(vendorPlacementsTable)
    .innerJoin(productsTable, eq(vendorPlacementsTable.productId, productsTable.id))
    .where(
      and(
        eq(vendorPlacementsTable.status, "active"),
        or(
          isNull(vendorPlacementsTable.endDate),
          gte(vendorPlacementsTable.endDate, now()),
        ),
      ),
    )
    .limit(10);

  // Shape the prestige nudge payload
  const prestigeItems = placements.map(p => ({
    productId:    p.productId,
    productName:  p.productName,
    category:     p.category,
    isPromoted:   true,
    pointBonus:   p.placementType === "sponsored" ? 15 : p.placementType === "premium" ? 10 : 5,
    placementType: p.placementType,
    brandId:      p.brandId,
  }));

  // Filter by craftType category mapping
  const CRAFT_CATS: Record<string, string[]> = {
    smoke: ["cigar"],
    pour:  ["alcohol", "wine", "cocktail"],
    brew:  ["beer"],
  };
  const allowed = craftType ? CRAFT_CATS[craftType] : null;
  const filtered = allowed ? prestigeItems.filter(i => allowed.includes(i.category)) : prestigeItems;

  res.json({ items: filtered, count: filtered.length });
});

export default router;
