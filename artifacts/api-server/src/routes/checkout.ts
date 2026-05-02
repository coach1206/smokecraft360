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
      items?:   { name: string; price: number; quantity?: number }[];
      venueId?: string;
      orderId?: string;
    };

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: '"items" must be a non-empty array' });
      return;
    }

    for (const item of items) {
      if (!item.name || typeof item.price !== "number" || item.price < 50) {
        res.status(400).json({
          error: "Each item must have a name and a price in cents (minimum 50)",
        });
        return;
      }
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
        line_items: items.map((item) => ({
          price_data: {
            currency:     "usd",
            product_data: {
              name:        item.name,
              description: "SmokeCraft 360 Experience",
            },
            unit_amount: Math.round(item.price),
          },
          quantity: item.quantity ?? 1,
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
        // Map Stripe status codes: 4xx pass through, 5xx become 502
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
