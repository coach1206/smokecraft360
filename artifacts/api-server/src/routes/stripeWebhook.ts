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

import { type Request, type Response } from "express";
import Stripe                          from "stripe";
import { eq }                          from "drizzle-orm";
import { db, ordersTable }             from "@workspace/db";
import { logger }                      from "../lib/logger";

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
    }
  }

  res.json({ received: true });
}
