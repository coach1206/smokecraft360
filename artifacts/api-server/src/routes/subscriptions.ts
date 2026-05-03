/**
 * Subscription / license routes.
 *
 *   GET  /api/license/status                          — current license state
 *   POST /api/subscriptions/create-checkout           — start subscription Checkout
 *   POST /api/subscriptions/portal                    — Stripe Billing Portal session
 *   POST /api/admin/subscriptions/:venueId/override   — super_admin manual unlock
 *
 * The webhook handler (stripeWebhook.ts) calls helpers exported from this
 * file to keep status in sync with Stripe.
 *
 * Backward compatibility: venues without a subscription row are reported as
 * "active" + source="unmetered" so legacy installs keep working.
 */

import { Router, type IRouter, type Response } from "express";
import Stripe                                  from "stripe";
import { eq }                                  from "drizzle-orm";
import {
  db, subscriptionsTable, venuesTable,
  type DbSubscription, GRACE_PERIOD_DAYS,
}                                              from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";
import { allowOnly }                           from "../middleware/sanitize";

const router: IRouter = Router();

// ── Pricing per plan (cents / month) ──────────────────────────────────────────

type Plan = "starter" | "pro" | "premium";

const PLAN_PRICING: Record<Plan, { unitAmount: number; label: string; venuePlan: "basic" | "mid" | "premium" }> = {
  starter: { unitAmount:  9_900, label: "Starter",  venuePlan: "basic"   },
  pro:     { unitAmount: 19_900, label: "Pro",      venuePlan: "mid"     },
  premium: { unitAmount: 49_900, label: "Premium",  venuePlan: "premium" },
};

function getStripe(): Stripe | null {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key || key.startsWith("<") || key === "sk_test_placeholder") return null;
  return new Stripe(key);
}

function getAppUrl(): string {
  const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim();
  return domain ? `https://${domain}` : "http://localhost:80";
}

// ── License status (read model) ───────────────────────────────────────────────

export type LicenseStatusResponse = {
  status:           "active" | "past_due" | "canceled" | "none";
  plan:             Plan | null;
  source:           "stripe" | "admin_override" | "unmetered";
  currentPeriodEnd: string | null;
  graceEndsAt:      string | null;
  daysRemaining:    number | null;
  adminOverride:    boolean;
};

/** Compute the effective license state for a venue. */
function computeLicense(sub: DbSubscription | undefined): LicenseStatusResponse {
  // No subscription row → legacy / unmetered, treat as active so we don't
  // accidentally lock pre-existing venues out of their own kiosks.
  if (!sub) {
    return {
      status:           "active",
      plan:             null,
      source:           "unmetered",
      currentPeriodEnd: null,
      graceEndsAt:      null,
      daysRemaining:    null,
      adminOverride:    false,
    };
  }

  if (sub.adminOverride) {
    return {
      status:           "active",
      plan:             sub.plan,
      source:           "admin_override",
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      graceEndsAt:      null,
      daysRemaining:    null,
      adminOverride:    true,
    };
  }

  const now = Date.now();
  let effective: LicenseStatusResponse["status"] = "active";

  if (sub.status === "active" || sub.status === "trialing") {
    effective = "active";
  } else if (sub.status === "past_due") {
    effective = sub.gracePeriodEndsAt && sub.gracePeriodEndsAt.getTime() > now
      ? "past_due"
      : "canceled";
  } else if (sub.status === "canceled" || sub.status === "incomplete_expired" || sub.status === "unpaid") {
    effective = "canceled";
  } else {
    // 'incomplete' = checkout started but not paid. Treat as canceled for
    // gating purposes so we don't grant access before first payment.
    effective = "canceled";
  }

  const graceMs        = sub.gracePeriodEndsAt ? sub.gracePeriodEndsAt.getTime() - now : null;
  const daysRemaining  = graceMs && graceMs > 0 ? Math.ceil(graceMs / (24 * 60 * 60 * 1000)) : null;

  return {
    status:           effective,
    plan:             sub.plan,
    source:           "stripe",
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    graceEndsAt:      sub.gracePeriodEndsAt?.toISOString() ?? null,
    daysRemaining,
    adminOverride:    false,
  };
}

// ── GET /api/license/status ───────────────────────────────────────────────────
//
// Public-ish: works without auth if ?venueId= is supplied (kiosk apps run
// unauthenticated). Authenticated requests fall back to req.user.venueId.

router.get("/status", async (req: AuthRequest, res: Response) => {
  // Authenticated requests get their own venue's full license details.
  // Unauthenticated kiosks may pass ?venueId= but receive only the gating
  // info they need (status + days remaining) — never plan, period end,
  // override flag, or other commercially sensitive billing posture.
  const isAuthed     = Boolean(req.user?.venueId);
  const ownsRequest  = isAuthed && (
    req.user?.role === "super_admin" ||
    typeof req.query["venueId"] !== "string" ||
    req.query["venueId"] === req.user?.venueId
  );

  const venueId =
    (isAuthed ? req.user?.venueId : null) ??
    (typeof req.query["venueId"] === "string" ? req.query["venueId"] : null) ??
    null;

  if (!venueId) {
    res.json(computeLicense(undefined));
    return;
  }

  try {
    const [sub] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.venueId, venueId))
      .limit(1);

    const full = computeLicense(sub);

    // Only return full payload to authed callers checking their own venue.
    if (isAuthed && ownsRequest) {
      res.json(full);
      return;
    }

    // Slim public payload — enough for the kiosk to show banner/lock,
    // nothing about plan, billing dates, or admin overrides.
    res.json({
      status:        full.status,
      daysRemaining: full.daysRemaining,
    });
  } catch (err) {
    req.log?.error({ err }, "license status lookup failed");
    res.status(500).json({ error: "Failed to read license status" });
  }
});

// ── POST /api/subscriptions/create-checkout ───────────────────────────────────

router.post(
  "/create-checkout",
  requireAuth,
  requireRole("venue_owner", "super_admin"),
  allowOnly("plan", "venueId"),
  async (req: AuthRequest, res: Response) => {
    const plan: Plan | undefined = req.body?.plan;
    const venueId =
      (req.user?.role === "super_admin" ? req.body?.venueId : null) ??
      req.user?.venueId;

    if (!plan || !PLAN_PRICING[plan]) {
      res.status(400).json({ error: `plan must be one of: ${Object.keys(PLAN_PRICING).join(", ")}` });
      return;
    }
    if (!venueId) {
      res.status(400).json({ error: "venueId is required" });
      return;
    }

    const stripe = getStripe();
    if (!stripe) {
      res.status(503).json({ error: "Payment processing is not available" });
      return;
    }

    const [venue] = await db.select().from(venuesTable).where(eq(venuesTable.id, venueId)).limit(1);
    if (!venue) { res.status(404).json({ error: "Venue not found" }); return; }

    // Get-or-create Stripe customer for this venue
    let customerId = venue.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name:     venue.name,
        metadata: { venueId },
      });
      customerId = customer.id;
      await db.update(venuesTable).set({ stripeCustomerId: customerId }).where(eq(venuesTable.id, venueId));
    }

    // Upsert subscription row in incomplete state. Webhook will fill in the
    // Stripe IDs once the user finishes Checkout.
    const [existing] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.venueId, venueId))
      .limit(1);

    const subRowId = existing?.id;
    if (existing) {
      await db.update(subscriptionsTable)
        .set({ plan, stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(subscriptionsTable.id, existing.id));
    } else {
      await db.insert(subscriptionsTable).values({
        venueId, plan, stripeCustomerId: customerId, status: "incomplete",
      });
    }

    const tier = PLAN_PRICING[plan];
    const base = getAppUrl();
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode:     "subscription",
        customer: customerId,
        line_items: [{
          price_data: {
            currency:     "usd",
            product_data: { name: `SmokeCraft 360 — ${tier.label}` },
            unit_amount:  tier.unitAmount,
            recurring:    { interval: "month" },
          },
          quantity: 1,
        }],
        metadata: {
          purpose: "subscription",
          venueId,
          plan,
          ...(subRowId ? { subscriptionRowId: subRowId } : {}),
        },
        success_url: `${base}/dashboard?subscription=success`,
        cancel_url:  `${base}/dashboard?subscription=cancelled`,
      });
    } catch (err) {
      if (err instanceof Stripe.errors.StripeError) {
        const status = (err.statusCode ?? 502) >= 500 ? 502 : (err.statusCode ?? 502);
        res.status(status).json({ error: err.message, code: err.code });
        return;
      }
      throw err;
    }

    req.log.info({ venueId, plan, sessionId: session.id }, "Subscription checkout created");
    res.status(201).json({ checkoutUrl: session.url });
  },
);

// ── POST /api/subscriptions/portal ────────────────────────────────────────────
//
// Opens a Stripe Billing Portal session so the venue owner can update their
// payment method, view invoices, or cancel.

router.post(
  "/portal",
  requireAuth,
  requireRole("venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user?.venueId;
    if (!venueId) { res.status(400).json({ error: "No venue context" }); return; }

    const [venue] = await db.select().from(venuesTable).where(eq(venuesTable.id, venueId)).limit(1);
    if (!venue?.stripeCustomerId) {
      res.status(404).json({ error: "No billing account on file. Subscribe first." });
      return;
    }

    const stripe = getStripe();
    if (!stripe) { res.status(503).json({ error: "Payment processing is not available" }); return; }

    const session = await stripe.billingPortal.sessions.create({
      customer:    venue.stripeCustomerId,
      return_url:  `${getAppUrl()}/dashboard`,
    });
    res.json({ url: session.url });
  },
);

// ── POST /api/admin/subscriptions/:venueId/override ───────────────────────────

router.post(
  "/admin/:venueId/override",
  requireAuth,
  requireRole("super_admin"),
  allowOnly("override", "reason"),
  async (req: AuthRequest, res: Response) => {
    const { venueId } = req.params;
    if (!venueId) { res.status(400).json({ error: "venueId is required" }); return; }

    const override = req.body?.override === true;
    const reason   = typeof req.body?.reason === "string" ? req.body.reason.slice(0, 500) : null;

    const [existing] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.venueId, String(venueId)))
      .limit(1);

    if (!existing) {
      // Create a subscription row in 'active' state with override=true. This
      // unlocks venues that never had billing set up.
      await db.insert(subscriptionsTable).values({
        venueId:             String(venueId),
        status:              "active",
        plan:                "starter",
        adminOverride:       override,
        adminOverrideReason: reason,
      });
    } else {
      await db.update(subscriptionsTable)
        .set({
          adminOverride:       override,
          adminOverrideReason: reason,
          updatedAt:           new Date(),
        })
        .where(eq(subscriptionsTable.id, existing.id));
    }

    req.log.info({ venueId, override, reason, by: req.user!.id }, "Subscription admin override toggled");
    res.json({ venueId, adminOverride: override, reason });
  },
);

// ── Webhook helpers (called from stripeWebhook.ts) ────────────────────────────

/** Link a stripeSubscriptionId to the row created during checkout. */
export async function linkSubscriptionFromCheckout(
  venueId:              string,
  stripeSubscriptionId: string,
  stripeCustomerId:     string | null,
): Promise<void> {
  const [existing] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.venueId, venueId))
    .limit(1);
  if (!existing) return;

  await db.update(subscriptionsTable)
    .set({
      stripeSubscriptionId,
      ...(stripeCustomerId ? { stripeCustomerId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(subscriptionsTable.id, existing.id));

  if (stripeCustomerId) {
    await db.update(venuesTable)
      .set({ stripeCustomerId })
      .where(eq(venuesTable.id, venueId));
  }
}

/** Sync status + period end from a Stripe Subscription object. */
export async function syncSubscriptionFromStripe(stripeSub: Stripe.Subscription): Promise<void> {
  const stripeStatus = stripeSub.status;
  const periodEnd    = (stripeSub as unknown as { current_period_end?: number }).current_period_end;

  // Only update if we have a row matching this stripeSubscriptionId.
  const [existing] = await db
    .select()
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.stripeSubscriptionId, stripeSub.id))
    .limit(1);
  if (!existing) return;

  await db.update(subscriptionsTable)
    .set({
      status: stripeStatus as DbSubscription["status"],
      ...(periodEnd ? { currentPeriodEnd: new Date(periodEnd * 1000) } : {}),
      // Clear grace whenever subscription transitions away from past_due
      ...(stripeStatus !== "past_due" ? { gracePeriodEndsAt: null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(subscriptionsTable.id, existing.id));
}

/** invoice.paid → status=active, lastPaymentDate=now, clear grace. */
export async function markInvoicePaid(stripeSubscriptionId: string): Promise<void> {
  await db.update(subscriptionsTable)
    .set({
      status:            "active",
      lastPaymentDate:   new Date(),
      gracePeriodEndsAt: null,
      updatedAt:         new Date(),
    })
    .where(eq(subscriptionsTable.stripeSubscriptionId, stripeSubscriptionId));
}

/** invoice.payment_failed → status=past_due, start grace window. */
export async function markPaymentFailed(stripeSubscriptionId: string): Promise<void> {
  const grace = new Date(Date.now() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  await db.update(subscriptionsTable)
    .set({
      status:            "past_due",
      gracePeriodEndsAt: grace,
      updatedAt:         new Date(),
    })
    .where(eq(subscriptionsTable.stripeSubscriptionId, stripeSubscriptionId));
}

/** customer.subscription.deleted → hard cancel. */
export async function markSubscriptionCanceled(stripeSubscriptionId: string): Promise<void> {
  await db.update(subscriptionsTable)
    .set({
      status:            "canceled",
      gracePeriodEndsAt: null,
      updatedAt:         new Date(),
    })
    .where(eq(subscriptionsTable.stripeSubscriptionId, stripeSubscriptionId));
}

export default router;
