/**
 * Vendor placement purchase via Stripe Checkout.
 *
 *   GET  /api/vendor/placements/tiers     — pricing tier catalogue
 *   GET  /api/vendor/placements           — list caller's placements (brand_partner)
 *   POST /api/vendor/placements/purchase  — create Stripe Checkout Session for a placement
 *
 * On successful payment, the Stripe webhook (checkout.session.completed
 * with metadata.purpose='placement') flips status to "active", applies
 * the boost to the product, and sets startDate/endDate.
 */

import { Router, type IRouter, type Response } from "express";
import Stripe                                  from "stripe";
import { and, desc, eq }                       from "drizzle-orm";
import {
  db, vendorPlacementsTable, productsTable,
}                                               from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";
import { allowOnly }                            from "../middleware/sanitize";
import { requireActiveLicense }                 from "../middleware/license";
import { sql }                                  from "drizzle-orm";

const router: IRouter = Router();

type Tier = "featured" | "premium" | "sponsored";

interface TierConfig {
  type:         Tier;
  priceCents:   number;
  durationDays: number;
  boostLevel:   number;
  sponsored:    boolean;
  label:        string;
}

const TIERS: Record<Tier, TierConfig> = {
  featured:  { type: "featured",  priceCents:  9_900, durationDays:  7, boostLevel: 1, sponsored: false, label: "Featured" },
  premium:   { type: "premium",   priceCents: 24_900, durationDays: 14, boostLevel: 2, sponsored: false, label: "Premium"  },
  sponsored: { type: "sponsored", priceCents: 49_900, durationDays: 30, boostLevel: 3, sponsored: true,  label: "Sponsored"},
};

function getStripe(): Stripe {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key || key.startsWith("<") || key === "sk_test_placeholder") {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key);
}

function getAppUrl(): string {
  const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim();
  return domain ? `https://${domain}` : "http://localhost:80";
}

// ── GET /api/vendor/placements/tiers ──────────────────────────────────────────

router.get("/tiers", requireAuth, (_req: AuthRequest, res: Response) => {
  res.json({
    tiers: Object.values(TIERS).map((t) => ({
      type:         t.type,
      label:        t.label,
      priceCents:   t.priceCents,
      durationDays: t.durationDays,
      boostLevel:   t.boostLevel,
      sponsored:    t.sponsored,
    })),
  });
});

// ── GET /api/vendor/placements ────────────────────────────────────────────────

router.get(
  "/",
  requireAuth,
  requireRole("brand_partner"),
  async (req: AuthRequest, res: Response) => {
    const isAdmin = req.user?.role === "super_admin";
    const rows = await db
      .select()
      .from(vendorPlacementsTable)
      .orderBy(desc(vendorPlacementsTable.createdAt))
      .limit(200);

    // Brand partners see only placements where the product is theirs (by brandId)
    // For now we don't have a brand_partner→brandId mapping in the user object,
    // so non-admins get an empty list rather than leak others' placements.
    res.json({ placements: isAdmin ? rows : rows.filter((r) => r.purchasedBy === req.user?.id) });
  },
);

// ── POST /api/vendor/placements/purchase ──────────────────────────────────────

router.post(
  "/purchase",
  requireAuth,
  requireRole("brand_partner"),
  requireActiveLicense,
  allowOnly("productId", "placementType", "brandId"),
  async (req: AuthRequest, res: Response) => {
    const productId     = typeof req.body?.productId     === "string" ? req.body.productId     : "";
    const placementType = typeof req.body?.placementType === "string" ? req.body.placementType : "";
    const brandId       = typeof req.body?.brandId       === "string" ? req.body.brandId       : null;

    const tier = TIERS[placementType as Tier];
    if (!tier) {
      res.status(400).json({ error: `placementType must be one of: ${Object.keys(TIERS).join(", ")}` });
      return;
    }
    if (!productId) {
      res.status(400).json({ error: "productId is required" });
      return;
    }

    // Verify the product exists and is approved (cannot promote a pending/rejected product)
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    if (product.submissionStatus !== "approved") {
      res.status(409).json({ error: "Cannot purchase placement for a product that is not approved" });
      return;
    }

    // Create the placement record in pending_payment state
    const [placement] = await db
      .insert(vendorPlacementsTable)
      .values({
        brandId:       brandId ?? product.brandId ?? "00000000-0000-0000-0000-000000000000",
        productId,
        placementType: tier.type,
        durationDays:  tier.durationDays,
        priceCents:    tier.priceCents,
        status:        "pending_payment",
        purchasedBy:   req.user!.id,
      })
      .returning();

    // Create Stripe Checkout Session for the placement purchase
    let stripe: Stripe;
    try { stripe = getStripe(); }
    catch { res.status(503).json({ error: "Payment processing is not available" }); return; }

    const base = getAppUrl();
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode:     "payment",
        currency: "usd",
        line_items: [{
          price_data: {
            currency:     "usd",
            product_data: {
              name:        `${tier.label} Placement — ${product.name}`,
              description: `${tier.durationDays}-day ${tier.label.toLowerCase()} placement on SmokeCraft 360`,
            },
            unit_amount: tier.priceCents,
          },
          quantity: 1,
        }],
        metadata: {
          purpose:     "placement",
          placementId: placement.id,
          productId,
          tier:        tier.type,
        },
        success_url: `${base}/vendor/placements?status=success&id=${placement.id}`,
        cancel_url:  `${base}/vendor/placements?status=cancelled&id=${placement.id}`,
      });
    } catch (err) {
      if (err instanceof Stripe.errors.StripeError) {
        // Roll back the pending placement so we don't leave orphans
        await db.delete(vendorPlacementsTable).where(eq(vendorPlacementsTable.id, placement.id));
        const status = (err.statusCode ?? 502) >= 500 ? 502 : (err.statusCode ?? 502);
        res.status(status).json({ error: err.message, code: err.code });
        return;
      }
      throw err;
    }

    // Persist the session id so the webhook can correlate
    await db.update(vendorPlacementsTable)
      .set({ stripeSessionId: session.id })
      .where(eq(vendorPlacementsTable.id, placement.id));

    req.log.info({ placementId: placement.id, sessionId: session.id, tier: tier.type }, "Placement checkout created");
    res.status(201).json({ placement, checkoutUrl: session.url });

    // Suppress unused import warning
    void and;
  },
);

/**
 * Unified placement activation. Used by BOTH the Checkout-session webhook
 * (passes `sessionId`) and the PaymentIntent webhook (passes `paymentIntentId`).
 *
 * Idempotent and race-safe: the status='pending_payment' guard lives in the
 * UPDATE's WHERE clause, so duplicate webhook deliveries or concurrent admin
 * actions can't reactivate a terminal placement (active/expired/cancelled).
 * Product-boost side effects are only applied when this call actually flipped
 * the row, so a late webhook never re-stamps boost on an already-active slot.
 */
export async function activatePlacement(
  placementId: string,
  ref: { sessionId?: string; paymentIntentId?: string },
): Promise<boolean> {
  const [placement] = await db.select().from(vendorPlacementsTable).where(eq(vendorPlacementsTable.id, placementId)).limit(1);
  if (!placement) return false;

  const tier = TIERS[placement.placementType];
  if (!tier) return false;

  const start = new Date();
  const end   = new Date(start.getTime() + tier.durationDays * 24 * 60 * 60 * 1000);

  // Build patch from the payment reference; keep both columns nullable so
  // either Checkout or PaymentIntent can be the source of truth per row.
  const patch: Partial<typeof vendorPlacementsTable.$inferInsert> = {
    status:      "active",
    startDate:   start,
    endDate:     end,
    activatedAt: new Date(),
  };
  if (ref.sessionId)       patch.stripeSessionId       = ref.sessionId;
  if (ref.paymentIntentId) patch.stripePaymentIntentId = ref.paymentIntentId;

  // Atomic guarded transition: only flip pending_payment → active.
  const flipped = await db.update(vendorPlacementsTable)
    .set(patch)
    .where(and(
      eq(vendorPlacementsTable.id, placementId),
      eq(vendorPlacementsTable.status, "pending_payment"),
    ))
    .returning({ id: vendorPlacementsTable.id });

  if (flipped.length === 0) return false;

  // Apply the boost to the product so it surfaces in recommendations.
  // Only runs when THIS call won the race — never re-stamped on duplicate.
  await db.update(productsTable)
    .set({ boostLevel: tier.boostLevel, sponsored: tier.sponsored })
    .where(eq(productsTable.id, placement.productId));

  return true;
}

/**
 * Backwards-compatible wrapper. Existing callers (Checkout-session webhook)
 * keep working without changing their signature.
 */
export async function activatePlacementFromSession(sessionId: string, placementId: string): Promise<void> {
  await activatePlacement(placementId, { sessionId });
}

// ── GET /api/vendor/placements/analytics ──────────────────────────────────────
//
// Aggregated marketplace performance for the authenticated brand_partner.
// Rolls up the partner's placements into spend, active slots, lifetime
// impressions/clicks/conversions, and click-through-rate. Super admins can
// scope to any brand via ?brandId=... for support workflows.

// Helper to normalize drizzle's db.execute result across pg-style QueryResult
// (has .rows) and array-style (already iterable). Mirrors the pattern used
// by other raw-SQL callers in this codebase.
function asRows<T>(r: unknown): T[] {
  if (Array.isArray(r)) return r as T[];
  if (r && typeof r === "object" && Array.isArray((r as { rows?: unknown }).rows)) {
    return (r as { rows: T[] }).rows;
  }
  return [];
}

router.get(
  "/analytics",
  requireAuth,
  requireRole("brand_partner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    // brand_partner sees their own purchases. super_admin can pass ?purchasedBy=
    // (a user id) to scope to a specific brand_partner for support workflows.
    const isSuper       = req.user!.role === "super_admin";
    const requested     = typeof req.query["purchasedBy"] === "string" ? req.query["purchasedBy"] : null;
    const purchasedById = isSuper && requested ? requested : req.user!.id;

    const totalsResult = await db.execute(sql`
      SELECT
        COUNT(*)::text                                                                          AS total_placements,
        COUNT(*) FILTER (WHERE status = 'active')::text                                         AS active_placements,
        COALESCE(SUM(price_cents) FILTER (WHERE status IN ('active','expired','completed')), 0)::text AS total_spend_cents,
        MIN(created_at)                                                                         AS first_purchase_at
      FROM vendor_placements
      WHERE purchased_by = ${purchasedById}
    `);
    const totals = asRows<{
      total_placements:   string;
      active_placements:  string;
      total_spend_cents:  string;
      first_purchase_at:  string | null;
    }>(totalsResult)[0];

    const perfResult = await db.execute(sql`
      SELECT
        vp.id::text                                                                              AS placement_id,
        COUNT(*) FILTER (WHERE ae.event_type = 'placement_impression')::text                     AS impressions,
        COUNT(*) FILTER (WHERE ae.event_type = 'placement_click')::text                          AS clicks,
        COUNT(*) FILTER (WHERE ae.event_type IN ('product_selected','order_placed') AND ae.product_id IS NOT NULL)::text AS conversions
      FROM vendor_placements vp
      LEFT JOIN analytics_events ae
        ON (ae.metadata->>'placementId') = vp.id::text
      WHERE vp.purchased_by = ${purchasedById}
      GROUP BY vp.id
      ORDER BY impressions DESC NULLS LAST
      LIMIT 100
    `);
    const performance = asRows<{
      placement_id: string;
      impressions:  string;
      clicks:       string;
      conversions:  string;
    }>(perfResult);

    const impressionsTotal = performance.reduce((acc, r) => acc + Number(r.impressions || 0), 0);
    const clicksTotal      = performance.reduce((acc, r) => acc + Number(r.clicks || 0), 0);
    const conversionsTotal = performance.reduce((acc, r) => acc + Number(r.conversions || 0), 0);
    const ctr              = impressionsTotal > 0 ? clicksTotal / impressionsTotal : 0;

    res.json({
      purchasedBy: purchasedById,
      summary: {
        totalPlacements:  Number(totals?.total_placements   ?? 0),
        activePlacements: Number(totals?.active_placements  ?? 0),
        totalSpendCents:  Number(totals?.total_spend_cents  ?? 0),
        firstPurchaseAt:  totals?.first_purchase_at ?? null,
        impressions:      impressionsTotal,
        clicks:           clicksTotal,
        conversions:      conversionsTotal,
        ctr:              Number(ctr.toFixed(4)),
      },
      perPlacement: performance.map((r) => ({
        placementId: r.placement_id,
        impressions: Number(r.impressions ?? 0),
        clicks:      Number(r.clicks      ?? 0),
        conversions: Number(r.conversions ?? 0),
      })),
    });
  },
);

export default router;
