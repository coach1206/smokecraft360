/**
 * Order verification routes
 *
 * PATCH /api/orders/:id/verify — staff marks an order as verified → awards XP
 * GET   /api/orders/:id/qr    — generate QR code SVG for an order (owner or staff)
 *
 * Fraud prevention:
 *  - Only staff / manager / venue_owner / super_admin can verify
 *  - An order can only be verified once (idempotent — re-verify returns 200 with existing data)
 *  - XP is awarded exactly once per order (guarded in xpEngine with CAS)
 *  - Duplicate QR scans are harmless — they hit the idempotency guard
 */

import { Router, type IRouter, type Response } from "express";
import QRCode                                   from "qrcode";
import { eq, and }                              from "drizzle-orm";
import { db, ordersTable, VERIFICATION_METHODS, type VerificationMethod } from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";
import { allowOnly }                            from "../middleware/sanitize";
import { awardXpForOrder }                      from "../services/xpEngine";
import { recordCampaignConversion }             from "../services/campaignAttribution";
import { checkCampaignFraud }                   from "../services/campaignFraudDetection";

async function postVerifyCampaignHooks(
  order: typeof ordersTable.$inferSelect,
  log: { error: (obj: Record<string, unknown>, msg: string) => void },
): Promise<void> {
  if (!order.campaignId) return;
  recordCampaignConversion(
    order.campaignId,
    order.expectedAmountCents ?? 0,
    order.venueId,
    order.userId,
    order.cigarId ?? order.drinkId ?? order.foodId ?? null,
  ).catch((err) => {
    log.error({ err, orderId: order.id }, "Campaign conversion recording failed");
  });
  checkCampaignFraud({
    userId: order.userId,
    venueId: order.venueId,
    campaignId: order.campaignId,
    orderId: order.id,
  }).catch((err) => {
    log.error({ err, orderId: order.id }, "Campaign fraud check failed");
  });
}

const router: IRouter = Router();

// ── PATCH /api/orders/:id/verify ─────────────────────────────────────────────

router.patch(
  "/:id/verify",
  requireAuth,
  requireRole("staff", "manager", "venue_owner", "super_admin"),
  allowOnly("method"),
  async (req: AuthRequest, res: Response) => {
    const id         = String(req.params.id ?? "");
    const { method } = req.body as { method?: string };

    const verificationMethod: VerificationMethod =
      method && (VERIFICATION_METHODS as readonly string[]).includes(method)
        ? (method as VerificationMethod)
        : "staff";

    // Fetch the order
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    // Idempotency — already verified
    if (order.verified) {
      res.json({
        order,
        xpResult: null,
        message: "Order was already verified",
        alreadyVerified: true,
      });
      return;
    }

    // Atomic verify — only succeeds if not already verified (CAS guard)
    const [updated] = await db
      .update(ordersTable)
      .set({
        verified:           true,
        verifiedAt:         new Date(),
        verificationMethod,
        verifiedBy:         req.user!.id,
        status:             "completed",
        updatedAt:          new Date(),
      } as Partial<typeof ordersTable.$inferInsert>)
      .where(and(eq(ordersTable.id, id), eq(ordersTable.verified, false)))
      .returning();

    if (!updated) {
      res.status(500).json({ error: "Verification failed" });
      return;
    }

    // Award XP (fire synchronously so the response includes the result)
    const xpResult = await awardXpForOrder(updated).catch((err) => {
      req.log.error({ err, orderId: id }, "XP award failed");
      return null;
    });

    await postVerifyCampaignHooks(updated, req.log);

    req.log.info(
      { orderId: id, verifiedBy: req.user!.id, method: verificationMethod, xp: xpResult?.xpAwarded },
      "Order verified",
    );

    res.json({
      order: updated,
      xpResult,
      message: xpResult
        ? `Experience verified. +${xpResult.xpAwarded} XP awarded.`
        : "Experience verified.",
      alreadyVerified: false,
    });
  },
);

// ── GET /api/orders/:id/qr ────────────────────────────────────────────────────

router.get(
  "/:id/qr",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");

    // Fetch order — owner can view their own; staff+ can view any
    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const userId    = req.user!.id;
    const role      = req.user!.role;
    const staffRoles = ["staff", "manager", "venue_owner", "super_admin"] as string[];

    // Guests can only see their own QR
    if (!staffRoles.includes(role) && order.userId !== userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // QR payload: the verify URL that staff can scan
    const domain  = process.env["REPLIT_DEV_DOMAIN"] ?? "localhost";
    const payload = `https://${domain}/api/orders/${id}/verify-scan`;

    const svg = await QRCode.toString(payload, {
      type:   "svg",
      margin: 1,
      color:  { dark: "#D4AF37", light: "#0000" },
    });

    res.set("Content-Type", "image/svg+xml").send(svg);
  },
);

// ── GET /api/orders/:id/verify-scan ──────────────────────────────────────────
// Lightweight endpoint that QR scan lands on — verifies as "qr" method

router.get(
  "/:id/verify-scan",
  requireAuth,
  requireRole("staff", "manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");

    const [order] = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.id, id))
      .limit(1);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (order.verified) {
      res.json({ message: "Already verified", alreadyVerified: true, order });
      return;
    }

    const [updated] = await db
      .update(ordersTable)
      .set({
        verified:           true,
        verifiedAt:         new Date(),
        verificationMethod: "qr",
        verifiedBy:         req.user!.id,
        status:             "completed",
        updatedAt:          new Date(),
      } as Partial<typeof ordersTable.$inferInsert>)
      .where(and(eq(ordersTable.id, id), eq(ordersTable.verified, false)))
      .returning();

    const xpResult = updated
      ? await awardXpForOrder(updated).catch(() => null)
      : null;

    if (updated) {
      await postVerifyCampaignHooks(updated, req.log);
    }

    res.json({
      message: xpResult
        ? `Verified via QR. +${xpResult.xpAwarded} XP awarded.`
        : "Verified via QR.",
      alreadyVerified: false,
      order: updated,
      xpResult,
    });
  },
);

export default router;
