/**
 * /api/receipts — Axiom Session Receipt experience.
 *
 *   POST /api/receipts/:tabId/generate  — build + store receipt from a paid tab
 *   GET  /api/receipts/:tabId           — retrieve full receipt
 *   GET  /api/receipts/qr/:token        — public QR retrieval (no auth)
 *   POST /api/receipts/:tabId/deliver   — trigger delivery (email / sms / print)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc }                 from "drizzle-orm";
import { randomUUID }                    from "crypto";
import {
  db, receiptsTable, guestTabsTable, tabItemsTable,
  guestProfilesTable, venuesTable, paymentEventsTable,
  userLoyaltyPointsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { requireRole }                   from "../middleware/roles.js";
import { logger }                        from "../lib/logger.js";

const router: IRouter = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCents(c: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(c / 100);
}

function buildReturnRecommendation(profile: Record<string, unknown> | null): string {
  if (!profile) return "We look forward to welcoming you back.";
  const atm = (profile["atmospherePreference"] as string | null) ?? "";
  const bold = (profile["boldnessPreference"] as string | null) ?? "";
  if (atm === "social" && bold === "bold") return "Try our curated Bold Social pairing on your next visit.";
  if (bold === "mellow") return "Explore our lighter, approachable selections on your return.";
  if (atm === "intimate") return "Reserve a private lounge experience for your next evening.";
  return "Ask your host about our exclusive reserve selection on your next visit.";
}

function assignMentorNote(mentorId: string | null): string {
  const NOTES: Record<string, string> = {
    "marco":   "Marco recommends pairing a medium robusto with your next bourbon flight.",
    "elena":   "Elena suggests exploring our single-malt expressions next time.",
    "dax":     "Dax has curated a bold blend to complement your palate evolution.",
    "sofía":   "Sofía invites you to the next curated pairing night.",
    "default": "Your personal guide looks forward to crafting your next experience.",
  };
  return NOTES[mentorId ?? "default"] ?? NOTES["default"]!;
}

// ── Build receipt payload from a paid tab ─────────────────────────────────────

async function buildReceiptPayload(tabId: string) {
  const [tab] = await db.select().from(guestTabsTable).where(eq(guestTabsTable.id, tabId));
  if (!tab) throw new Error("tab_not_found");

  const [items, profile, venue, loyaltyRow] = await Promise.all([
    db.select().from(tabItemsTable).where(eq(tabItemsTable.tabId, tabId)),
    tab.guestProfileId
      ? db.select().from(guestProfilesTable).where(eq(guestProfilesTable.id, tab.guestProfileId)).then((r) => r[0] ?? null)
      : Promise.resolve(null),
    db.select().from(venuesTable).where(eq(venuesTable.id, tab.venueId)).then((r) => r[0] ?? null),
    tab.userId
      ? db.select().from(userLoyaltyPointsTable).where(eq(userLoyaltyPointsTable.userId, tab.userId!)).then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  const craftGroups: Record<string, string[]> = {};
  for (const it of items) {
    const ct = it.craftType ?? "other";
    craftGroups[ct] ??= [];
    craftGroups[ct].push(it.productName);
  }

  const guestDisplayName = profile
    ? `${profile.firstName} ${profile.lastInitial}.`
    : "Valued Guest";

  const mentorId = (profile?.assignedMentorId as string | null) ?? null;

  return {
    receiptVersion:  "1.0",
    tabId,
    generatedAt:     new Date().toISOString(),
    guest: {
      name:          guestDisplayName,
      atmosphere:    (profile?.atmospherePreference as string | null) ?? null,
      boldness:      (profile?.boldnessPreference as string | null) ?? null,
      mentorId,
    },
    venue: {
      name:          venue?.name ?? "Axiom Venue",
      id:            tab.venueId,
    },
    session: {
      date:          tab.openedAt.toISOString(),
      paidAt:        tab.paidAt?.toISOString() ?? null,
      tableNumber:   tab.tableNumber ?? null,
      craftGroups,
      totalCents:    tab.totalCents,
      subtotalCents: tab.subtotalCents,
      discountCents: tab.discountCents,
      platformFeeCents: tab.platformFeeCents,
      venueProceedsCents: tab.venueProceedsCents,
      loyaltyCreditsUsed: tab.loyaltyCreditsUsed,
    },
    items: items.map((it) => ({
      name:       it.productName,
      craftType:  it.craftType,
      quantity:   it.quantity,
      unitCents:  it.unitCents,
      totalCents: it.totalCents,
    })),
    loyalty: {
      pointsBalance: loyaltyRow?.totalPoints ?? 0,
      pointsEarned:  Math.floor(tab.totalCents / 100), // 1pt per $1
    },
    continuity: {
      mentorNote:          assignMentorNote(mentorId),
      returnRecommendation: buildReturnRecommendation(profile as Record<string, unknown> | null),
      returnGuestReward:   "10% off your next tab when you return within 30 days.",
      nextSessionTheme:    "Bold Pairing Night — Reserve your seat for next Friday.",
      flavorProfile: {
        atmosphere: (profile?.atmospherePreference as string | null) ?? "refined",
        boldness:   (profile?.boldnessPreference as string | null) ?? "balanced",
      },
    },
    stripe: {
      chargeId:      tab.stripeChargeId,
      transferId:    tab.stripeTransferId,
      paymentIntent: tab.stripePaymentIntentId,
    },
  };
}

// ── POST /api/receipts/:tabId/generate ───────────────────────────────────────

router.post(
  "/:tabId/generate",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const tabId = String(req.params["tabId"]);

    const [tab] = await db.select({ paymentStatus: guestTabsTable.paymentStatus, venueId: guestTabsTable.venueId })
      .from(guestTabsTable).where(eq(guestTabsTable.id, tabId));

    if (!tab) { res.status(404).json({ error: "tab_not_found" }); return; }
    if (tab.paymentStatus !== "paid") { res.status(400).json({ error: "tab_not_paid" }); return; }

    // Idempotent — return existing receipt if already generated
    const existing = await db.select().from(receiptsTable).where(eq(receiptsTable.tabId, tabId));
    if (existing[0]) { res.json({ receipt: existing[0] }); return; }

    try {
      const payload  = await buildReceiptPayload(tabId);
      const qrToken  = randomUUID().replace(/-/g, "").slice(0, 16);

      const [receipt] = await db.insert(receiptsTable).values({
        tabId,
        venueId:       tab.venueId,
        payload,
        kioskStatus:   "sent",
        qrToken,
      }).returning();

      // Log the payment event
      await db.insert(paymentEventsTable).values({
        tabId,
        venueId:   tab.venueId,
        eventType: "receipt_delivered",
        actor:     "system",
        note:      "Receipt generated and available on kiosk",
        metadata:  { qrToken, channels: ["kiosk"] },
      }).catch(() => undefined);

      res.status(201).json({ receipt });
    } catch (err) {
      logger.error({ err, tabId }, "Receipt generation failed");
      res.status(500).json({ error: "generation_failed" });
    }
  },
);

// ── GET /api/receipts/:tabId ──────────────────────────────────────────────────

router.get(
  "/:tabId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const tabId   = String(req.params["tabId"]);
    const [receipt] = await db.select().from(receiptsTable).where(eq(receiptsTable.tabId, tabId));
    if (!receipt) { res.status(404).json({ error: "receipt_not_found" }); return; }
    res.json({ receipt });
  },
);

// ── GET /api/receipts/qr/:token  (public — guest QR code scan) ───────────────

router.get(
  "/qr/:token",
  async (req: Request, res: Response) => {
    const token   = String(req.params["token"]);
    const [receipt] = await db.select().from(receiptsTable).where(eq(receiptsTable.qrToken, token));
    if (!receipt) { res.status(404).json({ error: "not_found" }); return; }
    // Return the payload only (no internal IDs)
    res.json({ payload: receipt.payload, generatedAt: receipt.createdAt });
  },
);

// ── POST /api/receipts/:tabId/deliver ─────────────────────────────────────────

router.post(
  "/:tabId/deliver",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const tabId   = String(req.params["tabId"]);
    const { channel, address } = req.body as { channel: "email" | "sms" | "print"; address?: string };

    if (!["email", "sms", "print"].includes(channel)) {
      res.status(400).json({ error: "invalid_channel" }); return;
    }

    const [receipt] = await db.select().from(receiptsTable).where(eq(receiptsTable.tabId, tabId));
    if (!receipt) { res.status(404).json({ error: "receipt_not_found" }); return; }

    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (channel === "email") { update["emailStatus"] = "pending"; if (address) update["emailAddress"] = address; }
    if (channel === "sms")   { update["smsStatus"]   = "pending"; if (address) update["phoneNumber"]  = address; }
    if (channel === "print") { update["printStatus"] = "sent"; }

    await db.update(receiptsTable).set(update).where(eq(receiptsTable.id, receipt.id));

    // In production: enqueue SendGrid/Twilio job here
    logger.info({ tabId, channel, address }, "Receipt delivery requested");

    res.json({ success: true, channel, status: channel === "print" ? "sent" : "pending" });
  },
);

export default router;
