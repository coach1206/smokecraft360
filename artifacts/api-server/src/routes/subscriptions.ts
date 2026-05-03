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
  dunningEventsTable, notificationsTable,
  type DbSubscription, type DbDunningEvent,
  GRACE_PERIOD_DAYS,
}                                              from "@workspace/db";
import { desc }                                from "drizzle-orm";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";
import { allowOnly }                           from "../middleware/sanitize";
import { logAudit }                            from "../lib/audit";

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
  // Stripe Smart Retry: when the next automatic charge attempt is scheduled.
  // Populated from the latest 'failed' or 'retry' dunning event for this
  // venue. UI uses this to display "Next attempt in X hours".
  nextRetryAt:      string | null;
  attemptCount:     number;
  // Hint for upsell UX. Currently true when plan === 'starter'.
  canUpgrade:       boolean;
};

/** Compute the effective license state for a venue. */
function computeLicense(
  sub:          DbSubscription | undefined,
  latestRetry?: DbDunningEvent | undefined,
): LicenseStatusResponse {
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
      nextRetryAt:      null,
      attemptCount:     0,
      canUpgrade:       false,
    };
  }

  const canUpgrade = sub.plan === "starter" || sub.plan === "pro";

  if (sub.adminOverride) {
    return {
      status:           "active",
      plan:             sub.plan,
      source:           "admin_override",
      currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      graceEndsAt:      null,
      daysRemaining:    null,
      adminOverride:    true,
      nextRetryAt:      null,
      attemptCount:     0,
      canUpgrade,
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

  // Only surface nextRetryAt if it's in the future (past retries aren't useful).
  const nextRetryAt = latestRetry?.nextRetryAt && latestRetry.nextRetryAt.getTime() > now
    ? latestRetry.nextRetryAt.toISOString()
    : null;

  return {
    status:           effective,
    plan:             sub.plan,
    source:           "stripe",
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    graceEndsAt:      sub.gracePeriodEndsAt?.toISOString() ?? null,
    daysRemaining,
    adminOverride:    false,
    nextRetryAt,
    attemptCount:     latestRetry?.attemptCount ?? 0,
    canUpgrade,
  };
}

/** Fetch the most-recent dunning event for a venue (used for retry countdown). */
async function getLatestDunningEvent(venueId: string): Promise<DbDunningEvent | undefined> {
  const [row] = await db
    .select()
    .from(dunningEventsTable)
    .where(eq(dunningEventsTable.venueId, venueId))
    .orderBy(desc(dunningEventsTable.createdAt))
    .limit(1);
  return row;
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

    const latestRetry = sub ? await getLatestDunningEvent(venueId) : undefined;
    const full = computeLicense(sub, latestRetry);

    // Only return full payload to authed callers checking their own venue.
    if (isAuthed && ownsRequest) {
      res.json(full);
      return;
    }

    // Slim public payload — enough for the kiosk to show banner/lock and
    // retry countdown, nothing about plan, billing dates, or admin overrides.
    res.json({
      status:        full.status,
      daysRemaining: full.daysRemaining,
      nextRetryAt:   full.nextRetryAt,
      canUpgrade:    full.canUpgrade,
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
    const venueId = String(req.params.venueId ?? "");
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

    await logAudit(req, {
      action:     "subscription.admin_override",
      entityType: "subscription",
      entityId:   existing?.id ?? null,
      before:     { adminOverride: existing?.adminOverride ?? null, reason: existing?.adminOverrideReason ?? null },
      after:      { adminOverride: override, reason },
      venueId:    String(venueId),
    });

    req.log.info({ venueId, override, reason, by: req.user!.id }, "Subscription admin override toggled");
    res.json({ venueId, adminOverride: override, reason });
  },
);

// ── POST /api/subscriptions/admin/:venueId/extend-grace ───────────────────────
//
// Super-admin escape hatch separate from the full override: pushes the grace
// window further into the future without flipping `adminOverride`. Useful
// when a venue is mid-recovery and just needs a few extra days of buffer.

router.post(
  "/admin/:venueId/extend-grace",
  requireAuth,
  requireRole("super_admin"),
  allowOnly("days"),
  async (req: AuthRequest, res: Response) => {
    const venueId = String(req.params.venueId ?? "");
    const days = Number(req.body?.days);
    if (!venueId)                           { res.status(400).json({ error: "venueId is required" }); return; }
    if (!Number.isFinite(days) || days < 1 || days > 90) {
      res.status(400).json({ error: "days must be between 1 and 90" });
      return;
    }

    const [existing] = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.venueId, String(venueId)))
      .limit(1);
    if (!existing) { res.status(404).json({ error: "No subscription for this venue" }); return; }

    const base   = existing.gracePeriodEndsAt && existing.gracePeriodEndsAt > new Date()
      ? existing.gracePeriodEndsAt
      : new Date();
    const newEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    await db.update(subscriptionsTable)
      .set({ gracePeriodEndsAt: newEnd, updatedAt: new Date() })
      .where(eq(subscriptionsTable.id, existing.id));

    await logDunningEvent(String(venueId), "retry", { metadata: { source: "admin_extend", days, by: req.user!.id } });
    await logAudit(req, {
      action:     "subscription.extend_grace",
      entityType: "subscription",
      entityId:   existing.id,
      before:     { gracePeriodEndsAt: existing.gracePeriodEndsAt?.toISOString() ?? null },
      after:      { gracePeriodEndsAt: newEnd.toISOString(), addedDays: days },
      venueId:    String(venueId),
    });

    req.log.info({ venueId, days, by: req.user!.id, newEnd }, "Grace period extended by admin");
    res.json({ venueId, gracePeriodEndsAt: newEnd.toISOString() });
  },
);

// ── GET /api/notifications ────────────────────────────────────────────────────
//
// In-app inbox for the venue owner — returns the most-recent 50 notifications
// for their venue. Authed; uses req.user.venueId.

router.get(
  "/notifications",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user?.venueId;
    if (!venueId) { res.json({ notifications: [], unreadCount: 0 }); return; }

    const rows = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.venueId, venueId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);

    const unreadCount = rows.filter((r) => r.readAt === null && r.channel === "in_app").length;
    res.json({ notifications: rows, unreadCount });
  },
);

// ── Dunning + notification helpers (called from webhook + admin actions) ─────

/** Append a dunning_events row. Auto-increments attempt_count from history. */
export async function logDunningEvent(
  venueId: string,
  type: "reminder" | "failed" | "retry" | "recovered" | "canceled",
  opts: { nextRetryAt?: Date | null; attemptCount?: number; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  let attemptCount = opts.attemptCount;
  if (attemptCount === undefined && type === "failed") {
    // Auto-increment from history of prior failed attempts in this billing cycle.
    const [last] = await db
      .select()
      .from(dunningEventsTable)
      .where(eq(dunningEventsTable.venueId, venueId))
      .orderBy(desc(dunningEventsTable.createdAt))
      .limit(1);
    attemptCount = last?.type === "failed" || last?.type === "retry"
      ? (last.attemptCount ?? 0) + 1
      : 1;
  }

  await db.insert(dunningEventsTable).values({
    venueId,
    type,
    attemptCount: attemptCount ?? 0,
    nextRetryAt:  opts.nextRetryAt ?? null,
    metadata:     opts.metadata ?? null,
  });
}

/** Append a notifications row. Channel defaults to in_app. Best-effort — never throws. */
export async function createNotification(
  venueId: string,
  title: string,
  message: string,
  category: "reminder" | "failed" | "recovered" | "canceled" | "upsell",
  channel: "email" | "in_app" = "in_app",
): Promise<void> {
  try {
    await db.insert(notificationsTable).values({
      venueId, channel, title, message, category, status: "sent",
    });
  } catch (err) {
    // Never let notification logging break a webhook flow.
    void err;
  }
}

/** Resolve venueId from a stripeSubscriptionId (used by webhook). */
export async function getVenueIdForSubscription(stripeSubId: string): Promise<string | null> {
  const [row] = await db
    .select({ venueId: subscriptionsTable.venueId })
    .from(subscriptionsTable)
    .where(eq(subscriptionsTable.stripeSubscriptionId, stripeSubId))
    .limit(1);
  return row?.venueId ?? null;
}

/** Resolve venueId from a stripeCustomerId (invoice.upcoming has no sub id). */
export async function getVenueIdForCustomer(stripeCustomerId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: venuesTable.id })
    .from(venuesTable)
    .where(eq(venuesTable.stripeCustomerId, stripeCustomerId))
    .limit(1);
  return row?.id ?? null;
}

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
