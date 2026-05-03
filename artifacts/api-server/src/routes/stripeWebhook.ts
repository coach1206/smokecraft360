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
import { and, eq, sql }                            from "drizzle-orm";
import {
  db, ordersTable, commissionsTable, venueInventoryTable,
}                                                  from "@workspace/db";
import { logger }                                  from "../lib/logger";
import { activatePlacementFromSession }            from "./vendorPlacements";
import { markSignatureRequestSubmitted }           from "./signatureCigars";
import {
  linkSubscriptionFromCheckout,
  syncSubscriptionFromStripe,
  markInvoicePaid,
  markPaymentFailed,
  markSubscriptionCanceled,
}                                                  from "./subscriptions";

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

    // Branch on the session's purpose. Vendor placement purchases and signature
    // design fees are separate flows from customer order checkouts and don't
    // touch orders / inventory / commissions.
    if (session.metadata?.purpose === "placement") {
      const placementId = session.metadata?.placementId;
      if (placementId) {
        try {
          await activatePlacementFromSession(session.id, placementId);
          logger.info({ sessionId: session.id, placementId }, "Vendor placement activated via webhook");
        } catch (err) {
          logger.error({ err, sessionId: session.id, placementId }, "Failed to activate placement");
        }
      }
      res.json({ received: true });
      return;
    }

    if (session.metadata?.purpose === "signature_design") {
      const requestId = session.metadata?.signatureRequestId;
      if (requestId) {
        try {
          await markSignatureRequestSubmitted(requestId);
          logger.info({ sessionId: session.id, requestId }, "Signature design fee paid; request submitted");
        } catch (err) {
          logger.error({ err, sessionId: session.id, requestId }, "Failed to mark signature request submitted");
        }
      }
      res.json({ received: true });
      return;
    }

    if (session.metadata?.purpose === "subscription") {
      const venueId       = session.metadata?.venueId;
      const stripeSubId   = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
      const stripeCustId  = typeof session.customer     === "string" ? session.customer     : session.customer?.id ?? null;
      if (venueId && stripeSubId) {
        try {
          await linkSubscriptionFromCheckout(venueId, stripeSubId, stripeCustId);
          logger.info({ sessionId: session.id, venueId, stripeSubId }, "Subscription linked from checkout");
        } catch (err) {
          logger.error({ err, sessionId: session.id, venueId }, "Failed to link subscription from checkout");
        }
      }
      res.json({ received: true });
      return;
    }

    const orderId = session.metadata?.orderId;
    const venueId = session.metadata?.venueId || null;
    const gross   = session.amount_total ?? 0;

    if (orderId) {
      // Idempotency: skip if this order is already paid
      const [existing] = await db
        .select({ status: ordersTable.status, venueId: ordersTable.venueId,
                  cigarId: ordersTable.cigarId, drinkId: ordersTable.drinkId, foodId: ordersTable.foodId })
        .from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);

      if (existing?.status === "paid") {
        logger.info({ orderId }, "Webhook: order already paid, skipping (idempotent)");
        res.json({ received: true });
        return;
      }

      try {
        await db
          .update(ordersTable)
          .set({ status: "paid" as "completed", updatedAt: new Date() })
          .where(eq(ordersTable.id, orderId));
        logger.info({ orderId, sessionId: session.id }, "Order marked paid via Stripe webhook");
      } catch (err) {
        logger.error({ err, orderId }, "Failed to update order status from webhook");
      }

      // Decrement inventory for cigar / drink / food on the order
      const orderVenueId = existing?.venueId ?? venueId;
      if (orderVenueId) {
        const productIds = [existing?.cigarId, existing?.drinkId, existing?.foodId].filter((x): x is string => !!x);
        for (const pid of productIds) {
          try {
            await db.update(venueInventoryTable)
              .set({
                quantity:  sql`GREATEST(${venueInventoryTable.quantity} - 1, 0)`,
                available: sql`(${venueInventoryTable.quantity} - 1) > 0`,
                updatedAt: new Date(),
              })
              .where(and(
                eq(venueInventoryTable.venueId,   orderVenueId),
                eq(venueInventoryTable.productId, pid),
              ));
          } catch (err) {
            logger.error({ err, orderId, pid }, "Failed to decrement inventory");
          }
        }
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

  // ── Subscription lifecycle events ───────────────────────────────────────────
  if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
    const invoice = event.data.object as Stripe.Invoice;
    const subId   = typeof (invoice as unknown as { subscription?: string | { id: string } }).subscription === "string"
      ? (invoice as unknown as { subscription: string }).subscription
      : (invoice as unknown as { subscription?: { id: string } }).subscription?.id;
    if (subId) {
      try { await markInvoicePaid(subId); logger.info({ subId }, "Subscription invoice paid"); }
      catch (err) { logger.error({ err, subId }, "Failed to mark invoice paid"); }
    }
  } else if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subId   = typeof (invoice as unknown as { subscription?: string | { id: string } }).subscription === "string"
      ? (invoice as unknown as { subscription: string }).subscription
      : (invoice as unknown as { subscription?: { id: string } }).subscription?.id;
    if (subId) {
      try { await markPaymentFailed(subId); logger.warn({ subId }, "Subscription payment failed; grace started"); }
      catch (err) { logger.error({ err, subId }, "Failed to mark payment failed"); }
    }
  } else if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    try { await markSubscriptionCanceled(sub.id); logger.info({ subId: sub.id }, "Subscription canceled"); }
    catch (err) { logger.error({ err, subId: sub.id }, "Failed to mark subscription canceled"); }
  } else if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
    const sub = event.data.object as Stripe.Subscription;
    try { await syncSubscriptionFromStripe(sub); logger.info({ subId: sub.id, status: sub.status }, "Subscription synced"); }
    catch (err) { logger.error({ err, subId: sub.id }, "Failed to sync subscription"); }
  }

  res.json({ received: true });
}
