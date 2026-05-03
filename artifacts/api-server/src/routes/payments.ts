/**
 * POST /api/payments/create-intent
 *
 * Server-trusted PaymentIntent creator for the Elements-based checkout flow
 * (the alternative to Stripe Checkout sessions used elsewhere in the app).
 *
 * Pricing rules:
 *   - The amount is *always* fetched from the DB based on the entity id —
 *     the client never sends prices.
 *   - Idempotency: derived from `${kind}-${id}` so retrying the same
 *     create-intent call returns the same PaymentIntent (Stripe contract).
 *
 * Supported kinds:
 *   - signature_request: a custom cigar request priced at a flat rate
 *   - placement:         a featured/sponsored vendor slot (price stored on row)
 *
 * The PaymentIntent id is persisted back onto the entity so the
 * payment_intent.succeeded webhook can mark it paid.
 */

import { Router, type IRouter, type Response } from "express";
import Stripe                                  from "stripe";
import { eq }                                  from "drizzle-orm";
import {
  db, signatureRequestsTable, vendorPlacementsTable,
}                                              from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { allowOnly }                           from "../middleware/sanitize";
import { logger }                              from "../lib/logger";

const router: IRouter = Router();

// Flat price for signature cigar requests when paid via the Elements flow.
// (Custom-cigar pricing isn't stored per-row today; we use a single SKU price.)
const SIGNATURE_REQUEST_PRICE_CENTS = 2500;

function stripe(): Stripe | null {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key) return null;
  // Let the SDK pick its bundled API version — explicit pinning is brittle
  // and a mismatch causes a hard TS error against the SDK's union type.
  return new Stripe(key);
}

router.post(
  "/create-intent",
  requireAuth,
  allowOnly("kind", "id"),
  async (req: AuthRequest, res: Response) => {
    const s = stripe();
    if (!s) { res.status(500).json({ error: "Stripe not configured" }); return; }

    const kind = String(req.body?.kind ?? "");
    const id   = String(req.body?.id ?? "");
    if (!id)                                                             { res.status(400).json({ error: "id is required" }); return; }
    if (kind !== "signature_request" && kind !== "placement")            { res.status(400).json({ error: "kind must be 'signature_request' or 'placement'" }); return; }

    // ── Resolve server-trusted price + ownership ──────────────────────────
    let amountCents: number;
    let description: string;

    if (kind === "signature_request") {
      const [row] = await db.select().from(signatureRequestsTable).where(eq(signatureRequestsTable.id, id)).limit(1);
      if (!row)                                  { res.status(404).json({ error: "Signature request not found" }); return; }
      if (row.userId !== req.user!.id && req.user!.role !== "super_admin") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      amountCents = SIGNATURE_REQUEST_PRICE_CENTS;
      description = `SmokeCraft 360 — Signature Cigar Request (${row.brandName})`;
    } else {
      const [row] = await db.select().from(vendorPlacementsTable).where(eq(vendorPlacementsTable.id, id)).limit(1);
      if (!row)                                  { res.status(404).json({ error: "Placement not found" }); return; }
      // Vendors only pay for slots they themselves purchased; admins can act on behalf.
      if (row.purchasedBy !== req.user!.id && req.user!.role !== "super_admin") {
        res.status(403).json({ error: "Forbidden" });
        return;
      }
      amountCents = row.priceCents;
      description = `SmokeCraft 360 — Featured Placement (${row.id})`;
    }

    if (amountCents < 50) { res.status(400).json({ error: "Amount must be at least $0.50" }); return; }

    // ── Create PaymentIntent (idempotent on entity) ───────────────────────
    let intent: Stripe.PaymentIntent;
    try {
      intent = await s.paymentIntents.create(
        {
          amount:               amountCents,
          currency:             "usd",
          description,
          // Funds settled into platform account; transfers handled separately.
          automatic_payment_methods: { enabled: true },
          metadata: { kind, id, userId: req.user!.id },
        },
        // Stripe contract: same key + same params → same PaymentIntent returned.
        { idempotencyKey: `intent-${kind}-${id}` },
      );
    } catch (err) {
      logger.error({ err, kind, id }, "PaymentIntent creation failed");
      res.status(502).json({ error: "Payment provider unavailable" });
      return;
    }

    // Persist intent id so webhook can resolve back to the entity.
    try {
      if (kind === "signature_request") {
        await db.update(signatureRequestsTable)
          .set({ stripePaymentIntentId: intent.id, updatedAt: new Date() })
          .where(eq(signatureRequestsTable.id, id));
      } else {
        await db.update(vendorPlacementsTable)
          .set({ stripePaymentIntentId: intent.id })
          .where(eq(vendorPlacementsTable.id, id));
      }
    } catch (err) {
      // Best-effort — the PaymentIntent already exists in Stripe; webhook
      // can still reconcile via metadata if persistence fails here.
      logger.warn({ err, kind, id, intentId: intent.id }, "Failed to persist PaymentIntent id");
    }

    res.json({
      paymentIntentId: intent.id,
      clientSecret:    intent.client_secret,
      amountCents,
    });
  },
);

export { router as paymentsRouter };
