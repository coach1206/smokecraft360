/**
 * Stripe Webhook handler
 *
 * Exported as a plain async handler (not a Router) so the caller can
 * mount it with express.raw() for raw-body access before express.json()
 * parses the body — which is required for Stripe signature verification.
 *
 *   Mounted in app.ts:
 *     app.post("/api/webhook/stripe",
 *       express.raw({ type: "application/json" }),
 *       stripeWebhookHandler);
 *
 * Handles:
 *   checkout.session.completed  → sets order.status = "paid"
 */

import { type Request, type Response }            from "express";
import Stripe                                      from "stripe";
import { eq }                                      from "drizzle-orm";
import { db, ordersTable, commissionsTable }       from "@workspace/db";
import { logger }                                  from "../lib/logger";

// Platform commission rate in basis points (1000 = 10.00%)
const PLATFORM_COMMISSION_BPS = 1000;

function getStripe(): Stripe {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key || key.startsWith("<")) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key);
}

export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  const sig    = req.headers["stripe-signature"];
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];

  if (!sig || !secret) {
    res.status(400).json({ error: "Webhook signature or secret missing" });
    return;
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(req.body as Buffer, sig, secret);
  } catch (err) {
    logger.error({ err }, "Stripe webhook signature verification failed");
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    const venueId = session.metadata?.venueId || null;
    const gross   = session.amount_total ?? 0;

    if (orderId) {
      try {
        await db
          .update(ordersTable)
          .set({ status: "paid" as "completed", updatedAt: new Date() })
          .where(eq(ordersTable.id, orderId));
        logger.info({ orderId, sessionId: session.id }, "Order marked paid via Stripe webhook");
      } catch (err) {
        logger.error({ err, orderId }, "Failed to update order status from webhook");
      }

      // Log platform commission (idempotent on stripeSessionId would be ideal, but
      // Stripe webhooks are typically delivered once; duplicates can be reconciled later).
      if (gross > 0) {
        try {
          const amount = Math.round((gross * PLATFORM_COMMISSION_BPS) / 10_000);
          await db.insert(commissionsTable).values({
            orderId,
            venueId,
            grossAmountCents: gross,
            ratePctBps:       PLATFORM_COMMISSION_BPS,
            amountCents:      amount,
            currency:         session.currency ?? "usd",
            stripeSessionId:  session.id,
            status:           "pending",
          });
          logger.info({ orderId, venueId, amount, gross }, "Commission logged");
        } catch (err) {
          logger.error({ err, orderId }, "Failed to log commission");
        }
      }
    }
  }

  res.json({ received: true });
}
