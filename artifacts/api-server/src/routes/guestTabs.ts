/**
 * /api/tabs — Axiom Open Tab System
 *
 *   POST /api/tabs/open             — open a new tab for a guest/session
 *   POST /api/tabs/:tabId/items     — add a line item to an open tab
 *   GET  /api/tabs/:tabId           — get tab with all items (manager+ or tab owner)
 *   GET  /api/tabs/venue/:venueId   — list all open tabs for a venue (manager+)
 *   POST /api/tabs/:tabId/close     — close + charge tab via Stripe (server-authoritative)
 *   POST /api/tabs/:tabId/void      — void an unpaid tab (manager+)
 *   POST /api/tabs/:tabId/refund    — refund a paid tab (venue_owner+)
 *
 * Payment flow:
 *   1. Guest opens tab (no card required upfront)
 *   2. Items accumulate throughout the session
 *   3. On close: create Stripe PaymentIntent with application_fee_amount
 *      routed to venue's Connect account (automatic 5% platform split)
 *   4. Stripe webhook confirms payment → tab.paymentStatus = "paid"
 *   5. Fulfillment queue items auto-marked delivered
 */

import { Router, type IRouter, type Response } from "express";
import { z }                                   from "zod/v4";
import { eq, and, desc, sql, count }           from "drizzle-orm";
import Stripe                                  from "stripe";
import {
  db,
  guestTabsTable,
  tabItemsTable,
  fulfillmentQueueTable,
  venuesTable,
  auditLogTable,
}                                              from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth.js";
import { requireRole }                         from "../middleware/roles.js";
import { allowOnly }                           from "../middleware/sanitize.js";
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

// ── Schemas ───────────────────────────────────────────────────────────────────

const openTabSchema = z.object({
  venueId:        z.string().uuid(),
  userId:         z.string().uuid().optional(),
  guestProfileId: z.string().uuid().optional(),
  sessionId:      z.string().uuid().optional(),
  tableNumber:    z.string().max(20).optional(),
  notes:          z.string().max(500).optional(),
});

const addItemSchema = z.object({
  productId:   z.string().max(200).optional(),
  productName: z.string().min(1).max(200),
  craftType:   z.enum(["smoke", "pour", "brew", "vape"]).optional(),
  quantity:    z.number().int().min(1).max(50).default(1),
  unitCents:   z.number().int().min(0),
  notes:       z.string().max(500).optional(),
});

const closeTabSchema = z.object({
  paymentMethodId:    z.string().optional(),
  loyaltyCreditsUsed: z.number().int().min(0).default(0),
  tipCents:           z.number().int().min(0).default(0),
});

// ── Helper: recalculate tab totals ────────────────────────────────────────────

async function recalcTab(tabId: string): Promise<void> {
  const items = await db
    .select({ total: tabItemsTable.totalCents })
    .from(tabItemsTable)
    .where(eq(tabItemsTable.tabId, tabId));

  const subtotal = items.reduce((s, i) => s + i.total, 0);
  await db
    .update(guestTabsTable)
    .set({ subtotalCents: subtotal, totalCents: subtotal, updatedAt: sql`now()` } as any)
    .where(eq(guestTabsTable.id, tabId));
}

// ── POST /api/tabs/open ───────────────────────────────────────────────────────

router.post(
  "/open",
  allowOnly("venueId", "userId", "guestProfileId", "sessionId", "tableNumber", "notes"),
  async (req: AuthRequest, res: Response) => {
    const parsed = openTabSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
      return;
    }
    const data = parsed.data;

    try {
      const [tab] = await db
        .insert(guestTabsTable)
        .values({
          venueId:        data.venueId,
          userId:         data.userId,
          guestProfileId: data.guestProfileId,
          sessionId:      data.sessionId,
          tableNumber:    data.tableNumber,
          notes:          data.notes,
        })
        .returning();

      logger.info({ tabId: tab!.id, venueId: data.venueId }, "tab opened");
      res.status(201).json({ tab });
    } catch (err) {
      logger.error({ err }, "open tab failed");
      res.status(500).json({ error: "tab_open_failed" });
    }
  },
);

// ── POST /api/tabs/:tabId/items ───────────────────────────────────────────────

router.post(
  "/:tabId/items",
  allowOnly("productId", "productName", "craftType", "quantity", "unitCents", "notes"),
  async (req: AuthRequest, res: Response) => {
    const { tabId } = req.params;
    if (!isUuid(tabId)) { res.status(400).json({ error: "invalid_tab_id" }); return; }

    const parsed = addItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
      return;
    }
    const d = parsed.data;

    const [tab] = await db
      .select({ id: guestTabsTable.id, status: guestTabsTable.status, venueId: guestTabsTable.venueId })
      .from(guestTabsTable)
      .where(eq(guestTabsTable.id, tabId));

    if (!tab) { res.status(404).json({ error: "tab_not_found" }); return; }
    if (tab.status !== "open") { res.status(409).json({ error: "tab_not_open" }); return; }

    try {
      const totalCents = d.unitCents * d.quantity;

      const [item] = await db
        .insert(tabItemsTable)
        .values({
          tabId,
          productId:   d.productId,
          productName: d.productName,
          craftType:   d.craftType,
          quantity:    d.quantity,
          unitCents:   d.unitCents,
          totalCents,
          notes:       d.notes,
        })
        .returning();

      await recalcTab(tabId);

      // Add to fulfillment queue
      await db.insert(fulfillmentQueueTable).values({
        venueId:     tab.venueId,
        tabId,
        tabItemId:   item!.id,
        queueType:   "bar",
        productName: d.productName,
        craftType:   d.craftType,
        quantity:    d.quantity,
        guestNotes:  d.notes,
        tableNumber: tab.venueId, // resolved from tab below
      });

      res.status(201).json({ item });
    } catch (err) {
      logger.error({ err, tabId }, "add tab item failed");
      res.status(500).json({ error: "add_item_failed" });
    }
  },
);

// ── GET /api/tabs/:tabId ──────────────────────────────────────────────────────

router.get("/:tabId", requireAuth, async (req: AuthRequest, res: Response) => {
  const { tabId } = req.params;
  if (!isUuid(tabId)) { res.status(400).json({ error: "invalid_tab_id" }); return; }

  const [tab] = await db
    .select()
    .from(guestTabsTable)
    .where(eq(guestTabsTable.id, tabId));

  if (!tab) { res.status(404).json({ error: "tab_not_found" }); return; }

  // Scope: manager+ sees any tab; guest sees their own
  const role = req.user?.role;
  const isManager = ["manager", "venue_owner", "super_admin"].includes(role ?? "");
  if (!isManager && tab.userId !== req.user?.id) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  const items = await db
    .select()
    .from(tabItemsTable)
    .where(eq(tabItemsTable.tabId, tabId))
    .orderBy(tabItemsTable.addedAt);

  res.json({ tab, items });
});

// ── GET /api/tabs/venue/:venueId ──────────────────────────────────────────────

router.get(
  "/venue/:venueId",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const { venueId } = req.params;
    if (!isUuid(venueId)) { res.status(400).json({ error: "invalid_venue_id" }); return; }

    // Tenant scope
    if (req.user?.role !== "super_admin" && req.user?.venueId !== venueId) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    const tabs = await db
      .select()
      .from(guestTabsTable)
      .where(
        and(
          eq(guestTabsTable.venueId, venueId),
          eq(guestTabsTable.status, "open"),
        ),
      )
      .orderBy(desc(guestTabsTable.openedAt));

    res.json({ tabs, count: tabs.length });
  },
);

// ── POST /api/tabs/:tabId/close ───────────────────────────────────────────────

router.post(
  "/:tabId/close",
  requireAuth,
  allowOnly("paymentMethodId", "loyaltyCreditsUsed", "tipCents"),
  async (req: AuthRequest, res: Response) => {
    const { tabId } = req.params;
    if (!isUuid(tabId)) { res.status(400).json({ error: "invalid_tab_id" }); return; }

    const parsed = closeTabSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_input", issues: parsed.error.issues });
      return;
    }
    const { paymentMethodId, loyaltyCreditsUsed, tipCents } = parsed.data;

    const [tab] = await db
      .select()
      .from(guestTabsTable)
      .where(eq(guestTabsTable.id, tabId));

    if (!tab) { res.status(404).json({ error: "tab_not_found" }); return; }
    if (tab.status !== "open") { res.status(409).json({ error: "tab_already_closed" }); return; }

    const role = req.user?.role;
    const isManager = ["manager", "venue_owner", "super_admin"].includes(role ?? "");
    if (!isManager && tab.userId !== req.user?.id) {
      res.status(403).json({ error: "forbidden" });
      return;
    }

    // Fetch venue's Connect account
    const [venue] = await db
      .select({
        id:                     venuesTable.id,
        stripeConnectAccountId: venuesTable.stripeConnectAccountId,
        stripeConnectOnboarded: venuesTable.stripeConnectOnboarded,
        platformFeeBps:         venuesTable.platformFeeBps,
      })
      .from(venuesTable)
      .where(eq(venuesTable.id, tab.venueId));

    const chargeTotal = tab.totalCents + tipCents - loyaltyCreditsUsed;
    if (chargeTotal <= 0) {
      // Zero-balance close — loyalty covers everything
      await db
        .update(guestTabsTable)
        .set({
          status:             "closed",
          paymentStatus:      "paid",
          loyaltyCreditsUsed,
          closedAt:           new Date(),
          paidAt:             new Date(),
        } as any)
        .where(eq(guestTabsTable.id, tabId));

      await logAudit(req, {
        action:     "tab.close.loyalty_only",
        entityType: "guest_tab",
        entityId:   tabId,
        venueId:    tab.venueId,
        after:      { chargeTotal: 0, loyaltyCreditsUsed },
      });

      res.json({ success: true, chargeTotal: 0, paymentRequired: false });
      return;
    }

    // Create Stripe PaymentIntent with Connect transfer
    try {
      const stripe = getStripe();
      const feeBps = parseInt(venue?.platformFeeBps ?? "500", 10);
      const platformFee = Math.round(chargeTotal * feeBps / 10_000);
      const venueProceedsTotal = chargeTotal - platformFee;

      const intentParams: Stripe.PaymentIntentCreateParams = {
        amount:   chargeTotal,
        currency: "usd",
        metadata: {
          purpose: "guest_tab",
          tabId,
          venueId: tab.venueId,
        },
      };

      // Use Stripe Connect transfer when venue is onboarded
      if (venue?.stripeConnectAccountId && venue.stripeConnectOnboarded) {
        intentParams.application_fee_amount = platformFee;
        intentParams.transfer_data = {
          destination: venue.stripeConnectAccountId,
        };
      }

      if (paymentMethodId) {
        intentParams.payment_method   = paymentMethodId;
        intentParams.confirm          = true;
        intentParams.return_url       = `${process.env["REPLIT_DOMAINS"]?.split(",")[0] ?? "http://localhost:80"}/success`;
      }

      const intent = await stripe.paymentIntents.create(intentParams, {
        idempotencyKey: `tab-close-${tabId}`,
      });

      // Update tab with intent reference
      await db
        .update(guestTabsTable)
        .set({
          stripePaymentIntentId: intent.id,
          loyaltyCreditsUsed,
          platformFeeCents:      platformFee,
          venueProceedsCents:    venueProceedsTotal,
          paymentStatus:         intent.status === "succeeded" ? "paid" : "authorized",
          status:                intent.status === "succeeded" ? "closed" : "open",
          closedAt:              intent.status === "succeeded" ? new Date() : null,
          paidAt:                intent.status === "succeeded" ? new Date() : null,
        } as any)
        .where(eq(guestTabsTable.id, tabId));

      await logAudit(req, {
        action:     "tab.close.payment_intent_created",
        entityType: "guest_tab",
        entityId:   tabId,
        venueId:    tab.venueId,
        after:      { intentId: intent.id, chargeTotal, platformFee, venueProceedsTotal },
      });

      res.json({
        success:          true,
        paymentIntentId:  intent.id,
        clientSecret:     intent.client_secret,
        chargeTotal,
        platformFee,
        venueProceedsTotal,
        requiresAction:   intent.status === "requires_action",
      });
    } catch (err: any) {
      logger.error({ err, tabId }, "tab close payment failed");
      res.status(502).json({ error: "payment_failed", detail: err.message });
    }
  },
);

// ── POST /api/tabs/:tabId/void ────────────────────────────────────────────────

router.post(
  "/:tabId/void",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const { tabId } = req.params;
    if (!isUuid(tabId)) { res.status(400).json({ error: "invalid_tab_id" }); return; }

    const [tab] = await db
      .select({ id: guestTabsTable.id, status: guestTabsTable.status, paymentStatus: guestTabsTable.paymentStatus, venueId: guestTabsTable.venueId })
      .from(guestTabsTable)
      .where(eq(guestTabsTable.id, tabId));

    if (!tab) { res.status(404).json({ error: "tab_not_found" }); return; }
    if (tab.paymentStatus === "paid") { res.status(409).json({ error: "cannot_void_paid_tab" }); return; }

    await db
      .update(guestTabsTable)
      .set({ status: "voided", closedAt: new Date() } as any)
      .where(eq(guestTabsTable.id, tabId));

    await logAudit(req, {
      action:     "tab.void",
      entityType: "guest_tab",
      entityId:   tabId,
      venueId:    tab.venueId,
    });

    res.json({ success: true });
  },
);

// ── POST /api/tabs/:tabId/refund ──────────────────────────────────────────────

router.post(
  "/:tabId/refund",
  requireAuth,
  requireRole("venue_owner", "super_admin"),
  allowOnly("reason"),
  async (req: AuthRequest, res: Response) => {
    const { tabId } = req.params;
    if (!isUuid(tabId)) { res.status(400).json({ error: "invalid_tab_id" }); return; }

    const [tab] = await db
      .select()
      .from(guestTabsTable)
      .where(eq(guestTabsTable.id, tabId));

    if (!tab) { res.status(404).json({ error: "tab_not_found" }); return; }
    if (tab.paymentStatus !== "paid") { res.status(409).json({ error: "tab_not_paid" }); return; }
    if (!tab.stripePaymentIntentId) { res.status(409).json({ error: "no_payment_intent" }); return; }

    try {
      const stripe = getStripe();
      const refund = await stripe.refunds.create({
        payment_intent: tab.stripePaymentIntentId,
        reason:         "requested_by_customer",
      });

      await db
        .update(guestTabsTable)
        .set({ paymentStatus: "refunded", status: "closed" } as any)
        .where(eq(guestTabsTable.id, tabId));

      await logAudit(req, {
        action:     "tab.refund",
        entityType: "guest_tab",
        entityId:   tabId,
        venueId:    tab.venueId,
        after:      { refundId: refund.id, amount: refund.amount, reason: req.body.reason },
      });

      res.json({ success: true, refundId: refund.id, amount: refund.amount });
    } catch (err: any) {
      logger.error({ err, tabId }, "tab refund failed");
      res.status(502).json({ error: "refund_failed", detail: err.message });
    }
  },
);

// ── GET /api/tabs/admin/summary ───────────────────────────────────────────────

router.get(
  "/admin/summary",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user?.role === "super_admin"
      ? (typeof req.query.venueId === "string" ? req.query.venueId : null)
      : req.user?.venueId ?? null;

    try {
      const [openRow] = await db
        .select({ cnt: count() })
        .from(guestTabsTable)
        .where(
          venueId
            ? and(eq(guestTabsTable.venueId, venueId), eq(guestTabsTable.status, "open"))
            : eq(guestTabsTable.status, "open"),
        );

      const [pendingRevRow] = await db
        .select({ total: sql<number>`coalesce(sum(total_cents), 0)` })
        .from(guestTabsTable)
        .where(
          venueId
            ? and(eq(guestTabsTable.venueId, venueId), eq(guestTabsTable.paymentStatus, "authorized"))
            : eq(guestTabsTable.paymentStatus, "authorized"),
        );

      const [paidTodayRow] = await db
        .select({ total: sql<number>`coalesce(sum(total_cents), 0)` })
        .from(guestTabsTable)
        .where(
          sql`payment_status = 'paid' AND paid_at >= now() - interval '24 hours'${venueId ? sql` AND venue_id = ${venueId}` : sql``}`,
        );

      res.json({
        openTabs:           Number(openRow?.cnt ?? 0),
        pendingRevenueCents: Number(pendingRevRow?.total ?? 0),
        paidTodayCents:     Number(paidTodayRow?.total ?? 0),
      });
    } catch (err) {
      logger.error({ err }, "tab summary failed");
      res.status(500).json({ error: "summary_failed" });
    }
  },
);

// ── POST /api/tabs/:tabId/route ───────────────────────────────────────────────
// Route tab items to a fulfillment destination (bar / kitchen / humidor).
// Creates a fulfillment queue entry for each item and logs the action.

const RouteSchema = z.object({
  destination: z.enum(["bar", "kitchen", "humidor"]),
  items: z.array(z.object({
    name:  z.string(),
    qty:   z.number().int().positive(),
    price: z.number(),
  })).min(1),
});

router.post(
  "/:tabId/route",
  requireAuth,
  requireRole("staff", "manager", "venue_owner", "super_admin"),
  allowOnly("destination", "items"),
  async (req: AuthRequest, res: Response) => {
    const tabId = String(req.params.tabId ?? "");
    if (!isUuid(tabId)) {
      res.status(400).json({ error: "invalid_tab_id" });
      return;
    }

    const parsed = RouteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", detail: parsed.error.issues });
      return;
    }

    const { destination, items } = parsed.data;
    const queueType: "bar" | "floor" = destination === "bar" ? "bar" : "floor";

    try {
      const [tab] = await db.select().from(guestTabsTable).where(eq(guestTabsTable.id, tabId)).limit(1);
      if (!tab) {
        res.status(404).json({ error: "tab_not_found" });
        return;
      }
      if (req.user!.role !== "super_admin" && tab.venueId && req.user!.venueId !== tab.venueId) {
        res.status(403).json({ error: "forbidden" });
        return;
      }

      const venueId = tab.venueId ?? req.user!.venueId;
      if (!venueId) {
        res.status(422).json({ error: "venue_id_required" });
        return;
      }

      const queueEntries = items.map(item => ({
        tabId,
        venueId,
        queueType,
        productName: item.name,
        quantity:    item.qty,
        status:      "pending" as const,
      }));

      await db.insert(fulfillmentQueueTable).values(queueEntries);

      await logAudit(req, {
        action:     "tab.route",
        entityType: "tab",
        entityId:   tabId,
        after:      { destination, itemCount: items.length },
        venueId:    tab.venueId ?? null,
      });

      req.log.info({ tabId, destination, itemCount: items.length, userId: req.user?.id }, "tab items routed");
      res.json({ ok: true, destination, routed: items.length });
    } catch (err) {
      logger.error({ err, tabId }, "tab route failed");
      res.status(500).json({ error: "route_failed" });
    }
  },
);

export default router;
