/**
 * Stripe Checkout
 *
 * POST /api/create-checkout-session
 *   — creates a Stripe Checkout session for pickup/delivery orders
 *   — returns { url } for frontend redirect
 *
 * Stripe errors are caught and forwarded as structured JSON responses
 * rather than leaking as 500s through the global error handler.
 */

import { Router }    from "express";
import Stripe        from "stripe";
import { eq }        from "drizzle-orm";
import { db, productsTable, ordersTable } from "@workspace/db";
import { allowOnly } from "../middleware/sanitize";

const router = Router();

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

// ── POST /api/create-checkout-session ─────────────────────────────────────────
router.post(
  "/create-checkout-session",
  allowOnly("items", "venueId", "orderId"),
  async (req, res) => {
    const { items, venueId, orderId } = req.body as {
      items?:   { productId: string; name?: string; price?: number; quantity?: number }[];
      venueId?: string;
      orderId?: string;
    };

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: '"items" must be a non-empty array' });
      return;
    }

    // ── Server-trusted pricing: resolve prices from DB, never trust client ──
    const lineItems: { name: string; unitAmount: number; quantity: number }[] = [];

    for (const item of items) {
      const productId = item.productId;
      if (!productId) {
        res.status(400).json({ error: "Each item must have a productId" });
        return;
      }

      const [product] = await db
        .select({ name: productsTable.name, costCents: productsTable.costCents })
        .from(productsTable)
        .where(eq(productsTable.id, productId))
        .limit(1);

      if (!product) {
        res.status(404).json({ error: `Product not found: ${productId}` });
        return;
      }

      const unitAmount = product.costCents ?? 0;
      if (unitAmount < 50) {
        res.status(400).json({ error: `Product "${product.name}" has no valid price configured` });
        return;
      }

      lineItems.push({
        name: product.name,
        unitAmount,
        quantity: item.quantity ?? 1,
      });
    }

    let stripe: Stripe;
    try {
      stripe = getStripe();
    } catch {
      res.status(503).json({ error: "Payment processing is not available" });
      return;
    }

    const base = getAppUrl();

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode:     "payment",
        currency: "usd",
        line_items: lineItems.map((li) => ({
          price_data: {
            currency:     "usd",
            product_data: {
              name:        li.name,
              description: "SmokeCraft 360 Experience",
            },
            unit_amount: li.unitAmount,
          },
          quantity: li.quantity,
        })),
        payment_intent_data: {
          description: "SmokeCraft 360 Experience",
          metadata:    { orderId: orderId ?? "", venueId: venueId ?? "" },
        },
        metadata:    { orderId: orderId ?? "", venueId: venueId ?? "" },
        success_url: `${base}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${base}/cancel`,
      });
    } catch (err) {
      if (err instanceof Stripe.errors.StripeError) {
        req.log.error({ stripeCode: err.code, stripeType: err.type }, err.message);
        const status = (err.statusCode ?? 502) >= 500 ? 502 : (err.statusCode ?? 502);
        res.status(status).json({ error: err.message, code: err.code });
        return;
      }
      throw err;
    }

    req.log.info({ orderId, sessionId: session.id }, "Stripe checkout session created");
    res.json({ url: session.url });
  },
);

export default router;
