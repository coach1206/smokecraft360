/**
 * /api/stripe-connect — Stripe Connect venue onboarding + management.
 *
 *   POST /api/stripe-connect/onboard/:venueId   — create Connect account + return onboarding URL
 *   GET  /api/stripe-connect/status/:venueId    — check onboarding completion
 *   GET  /api/stripe-connect/dashboard/:venueId — get Stripe Express dashboard link
 *   GET  /api/stripe-connect/payouts/:venueId   — list recent payouts for a venue
 *   GET  /api/stripe-connect/admin/overview     — network-wide Connect health (super_admin)
 *
 * Architecture:
 *   Uses Stripe Connect "Express" accounts — venues fill in Stripe's hosted
 *   onboarding flow. Platform collects application_fee_amount on each charge.
 *   Fee rate stored per-venue in venues.platform_fee_bps (default 500 = 5%).
 *
 * Auth: venue_owner+ for venue-scoped routes; super_admin for overview.
 */

import { Router, type IRouter, type Response } from "express";
import Stripe                                  from "stripe";
import { eq, isNotNull, count, sql }           from "drizzle-orm";
import { db, venuesTable }                     from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth.js";
import { requireRole }                         from "../middleware/roles.js";
import { logAudit }                            from "../lib/audit.js";
import { logger }                              from "../lib/logger.js";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid  = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);

function getStripe(): Stripe {
  const key = process.env["STRIPE_SECRET_KEY"];
  if (!key || key.startsWith("<")) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key);
}

function getAppUrl(): string {
  const domain = process.env["REPLIT_DOMAINS"]?.split(",")[0]?.trim();
  return domain ? `https://${domain}` : "http://localhost:80";
}

function requireVenueAccess(req: AuthRequest, venueId: string): boolean {
  if (req.user?.role === "super_admin") return true;
  return req.user?.venueId === venueId;
}

// ── POST /api/stripe-connect/onboard/:venueId ─────────────────────────────────

router.post(
  "/onboard/:venueId",
  requireAuth,
  requireRole("venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const { venueId } = req.params;
    if (!isUuid(venueId)) { res.status(400).json({ error: "invalid_venue_id" }); return; }
    if (!requireVenueAccess(req, venueId)) { res.status(403).json({ error: "forbidden" }); return; }

    const [venue] = await db
      .select()
      .from(venuesTable)
      .where(eq(venuesTable.id, venueId));

    if (!venue) { res.status(404).json({ error: "venue_not_found" }); return; }

    try {
      const stripe = getStripe();
      const appUrl = getAppUrl();

      // Reuse existing account if already created
      let accountId = venue.stripeConnectAccountId;

      if (!accountId) {
        const account = await stripe.accounts.create({
          type:    "express",
          country: "US",
          metadata: { venueId, venueName: venue.name },
          capabilities: {
            card_payments:  { requested: true },
            transfers:      { requested: true },
          },
        });
        accountId = account.id;

        await db
          .update(venuesTable)
          .set({ stripeConnectAccountId: accountId })
          .where(eq(venuesTable.id, venueId));
      }

      // Create onboarding link
      const link = await stripe.accountLinks.create({
        account:     accountId,
        refresh_url: `${appUrl}/settings?connect=refresh&venueId=${venueId}`,
        return_url:  `${appUrl}/settings?connect=return&venueId=${venueId}`,
        type:        "account_onboarding",
      });

      await logAudit(req, {
        action:     "stripe_connect.onboard_initiated",
        entityType: "venue",
        entityId:   venueId,
        venueId,
        after:      { stripeAccountId: accountId },
      });

      res.json({ url: link.url, accountId });
    } catch (err: any) {
      logger.error({ err, venueId }, "Stripe Connect onboard failed");
      res.status(502).json({ error: "connect_onboard_failed", detail: err.message });
    }
  },
);

// ── GET /api/stripe-connect/status/:venueId ───────────────────────────────────

router.get(
  "/status/:venueId",
  requireAuth,
  requireRole("venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const { venueId } = req.params;
    if (!isUuid(venueId)) { res.status(400).json({ error: "invalid_venue_id" }); return; }
    if (!requireVenueAccess(req, venueId)) { res.status(403).json({ error: "forbidden" }); return; }

    const [venue] = await db
      .select({
        id:                     venuesTable.id,
        name:                   venuesTable.name,
        stripeConnectAccountId: venuesTable.stripeConnectAccountId,
        stripeConnectOnboarded: venuesTable.stripeConnectOnboarded,
        platformFeeBps:         venuesTable.platformFeeBps,
      })
      .from(venuesTable)
      .where(eq(venuesTable.id, venueId));

    if (!venue) { res.status(404).json({ error: "venue_not_found" }); return; }

    if (!venue.stripeConnectAccountId) {
      res.json({ onboarded: false, accountId: null, chargesEnabled: false, payoutsEnabled: false });
      return;
    }

    try {
      const stripe  = getStripe();
      const account = await stripe.accounts.retrieve(venue.stripeConnectAccountId);

      const onboarded = account.charges_enabled && account.payouts_enabled;

      // Sync onboarded flag if it changed
      if (onboarded && !venue.stripeConnectOnboarded) {
        await db
          .update(venuesTable)
          .set({ stripeConnectOnboarded: true })
          .where(eq(venuesTable.id, venueId));
      }

      res.json({
        onboarded,
        accountId:      account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        platformFeeBps: venue.platformFeeBps ?? "500",
        requirements:   account.requirements?.currently_due ?? [],
      });
    } catch (err: any) {
      logger.error({ err, venueId }, "Stripe Connect status check failed");
      res.status(502).json({ error: "connect_status_failed", detail: err.message });
    }
  },
);

// ── GET /api/stripe-connect/dashboard/:venueId ───────────────────────────────

router.get(
  "/dashboard/:venueId",
  requireAuth,
  requireRole("venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const { venueId } = req.params;
    if (!isUuid(venueId)) { res.status(400).json({ error: "invalid_venue_id" }); return; }
    if (!requireVenueAccess(req, venueId)) { res.status(403).json({ error: "forbidden" }); return; }

    const [venue] = await db
      .select({ stripeConnectAccountId: venuesTable.stripeConnectAccountId })
      .from(venuesTable)
      .where(eq(venuesTable.id, venueId));

    if (!venue?.stripeConnectAccountId) {
      res.status(409).json({ error: "connect_account_not_configured" }); return;
    }

    try {
      const stripe = getStripe();
      const link   = await stripe.accounts.createLoginLink(venue.stripeConnectAccountId);
      res.json({ url: link.url });
    } catch (err: any) {
      logger.error({ err, venueId }, "Stripe dashboard link failed");
      res.status(502).json({ error: "dashboard_link_failed", detail: err.message });
    }
  },
);

// ── GET /api/stripe-connect/payouts/:venueId ──────────────────────────────────

router.get(
  "/payouts/:venueId",
  requireAuth,
  requireRole("venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const { venueId } = req.params;
    if (!isUuid(venueId)) { res.status(400).json({ error: "invalid_venue_id" }); return; }
    if (!requireVenueAccess(req, venueId)) { res.status(403).json({ error: "forbidden" }); return; }

    const [venue] = await db
      .select({ stripeConnectAccountId: venuesTable.stripeConnectAccountId })
      .from(venuesTable)
      .where(eq(venuesTable.id, venueId));

    if (!venue?.stripeConnectAccountId) {
      res.json({ payouts: [], onboarded: false }); return;
    }

    try {
      const stripe  = getStripe();
      const payouts = await stripe.payouts.list(
        { limit: 10 },
        { stripeAccount: venue.stripeConnectAccountId },
      );

      res.json({
        onboarded: true,
        payouts: payouts.data.map((p) => ({
          id:          p.id,
          amount:      p.amount,
          currency:    p.currency,
          status:      p.status,
          arrivalDate: new Date(p.arrival_date * 1000).toISOString(),
          description: p.description,
        })),
      });
    } catch (err: any) {
      logger.error({ err, venueId }, "Stripe payouts fetch failed");
      res.status(502).json({ error: "payouts_fetch_failed", detail: err.message });
    }
  },
);

// ── GET /api/stripe-connect/admin/overview ────────────────────────────────────

router.get(
  "/admin/overview",
  requireAuth,
  requireRole("super_admin"),
  async (_req: AuthRequest, res: Response) => {
    try {
      const [totalRow] = await db
        .select({ cnt: count() })
        .from(venuesTable);

      const [onboardedRow] = await db
        .select({ cnt: count() })
        .from(venuesTable)
        .where(eq(venuesTable.stripeConnectOnboarded, true));

      const [connectedRow] = await db
        .select({ cnt: count() })
        .from(venuesTable)
        .where(isNotNull(venuesTable.stripeConnectAccountId));

      res.json({
        totalVenues:     Number(totalRow?.cnt ?? 0),
        connectedVenues: Number(connectedRow?.cnt ?? 0),
        onboardedVenues: Number(onboardedRow?.cnt ?? 0),
        pendingVenues:   Number(connectedRow?.cnt ?? 0) - Number(onboardedRow?.cnt ?? 0),
        platformFeeBps:  500,
      });
    } catch (err) {
      logger.error({ err }, "Connect overview failed");
      res.status(500).json({ error: "overview_failed" });
    }
  },
);

export default router;
