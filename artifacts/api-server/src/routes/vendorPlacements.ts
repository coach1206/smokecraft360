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
 * Activate a placement after successful Stripe payment. Called from the
 * stripeWebhook handler. Idempotent: re-running has no effect.
 */
export async function activatePlacementFromSession(sessionId: string, placementId: string): Promise<void> {
  const [placement] = await db.select().from(vendorPlacementsTable).where(eq(vendorPlacementsTable.id, placementId)).limit(1);
  if (!placement || placement.status === "active") return;

  const tier = TIERS[placement.placementType];
  if (!tier) return;

  const start = new Date();
  const end   = new Date(start.getTime() + tier.durationDays * 24 * 60 * 60 * 1000);

  await db.update(vendorPlacementsTable)
    .set({
      status:           "active",
      startDate:        start,
      endDate:          end,
      activatedAt:      new Date(),
      stripeSessionId:  sessionId,
    })
    .where(eq(vendorPlacementsTable.id, placementId));

  // Apply the boost to the product so it surfaces in recommendations
  await db.update(productsTable)
    .set({ boostLevel: tier.boostLevel, sponsored: tier.sponsored })
    .where(eq(productsTable.id, placement.productId));
}

export default router;
