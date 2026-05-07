/**
 * /api/referrals — Axiom Revenue Bridge
 *
 * POST /log-click            Public — records outbound click intent (PENDING row)
 * POST /webhook/:pillar      Public — DayOne360 / WifeX success callback → CONFIRMED
 * GET  /revenue              Auth   — venue referral revenue summary
 * GET  /transactions         Auth   — recent commission rows for a venue
 * GET  /referrers            Auth   — top staff referrers ranked by commission
 */

import { Router, type Request, type Response } from "express";
import { eq, and, desc, sum, count, isNotNull } from "drizzle-orm";
import { db, referralCommissionsTable }          from "@workspace/db";
import { z }                                      from "zod";
import { requireAuth }                            from "../middleware/auth";
import type { AuthRequest }                       from "../middleware/auth";

const router = Router();

// ── POST /log-click ──────────────────────────────────────────────────────────

const LogClickSchema = z.object({
  venueId:    z.string().min(1),
  guestKey:   z.string().min(1),
  pillarType: z.enum(["DAYONE360_LEISURE", "DAYONE360_CORP", "WIFEX"]),
  staffId:    z.string().optional(),
  source:     z.string().optional(),
  timestamp:  z.string().optional(),
});

router.post("/log-click", async (req: Request, res: Response) => {
  const parsed = LogClickSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.issues });
    return;
  }

  const { venueId, guestKey, pillarType, staffId, source } = parsed.data;

  const [row] = await db
    .insert(referralCommissionsTable)
    .values({ venueId, guestKey, pillarType, staffId: staffId ?? null, source: source ?? "axiom_crafthub" })
    .returning({ id: referralCommissionsTable.id });

  res.json({ ok: true, referralId: row!.id });
});

// ── POST /webhook/:pillar ────────────────────────────────────────────────────

router.post("/webhook/:pillar", async (req: Request, res: Response) => {
  const pillar   = (req.params["pillar"] as string ?? "").toUpperCase();
  const body     = req.body as Record<string, unknown>;
  const txId     = String(body.transaction_id ?? body.id ?? body.booking_id ?? "");
  const venueId  = String(body.aff_id         ?? body.venue_id              ?? "");
  const guestKey = String(body.sub_id          ?? body.guest_key             ?? "unknown");
  const amount   = parseFloat(String(body.commission_amount ?? body.amount ?? "0")) || 0;

  if (!txId || !venueId) {
    res.status(400).json({ error: "transaction_id and aff_id are required" });
    return;
  }

  const allowedPillars = ["DAYONE360_LEISURE", "DAYONE360_CORP", "WIFEX"];
  const safePillar = allowedPillars.includes(pillar)
    ? (pillar as "DAYONE360_LEISURE" | "DAYONE360_CORP" | "WIFEX")
    : "DAYONE360_LEISURE";

  await db
    .insert(referralCommissionsTable)
    .values({
      venueId,
      guestKey,
      pillarType:       safePillar,
      commissionAmount: amount.toFixed(2),
      status:           "CONFIRMED",
      transactionId:    txId,
      webhookPayload:   JSON.stringify(body),
      confirmedAt:      new Date(),
    })
    .onConflictDoUpdate({
      target: referralCommissionsTable.transactionId,
      set: {
        status:           "CONFIRMED",
        commissionAmount: amount.toFixed(2),
        confirmedAt:      new Date(),
        updatedAt:        new Date(),
      },
    });

  res.json({ ok: true });
});

// ── GET /revenue ─────────────────────────────────────────────────────────────

router.get("/revenue", requireAuth, async (req: AuthRequest, res: Response) => {
  const venueId =
    (req.query.venueId as string | undefined) ??
    (req.user?.role === "super_admin" ? undefined : req.user?.venueId);

  if (!venueId) {
    res.status(400).json({ error: "venueId required" });
    return;
  }

  const rows = await db
    .select({
      pillarType:  referralCommissionsTable.pillarType,
      status:      referralCommissionsTable.status,
      totalAmount: sum(referralCommissionsTable.commissionAmount),
      rowCount:    count(),
    })
    .from(referralCommissionsTable)
    .where(eq(referralCommissionsTable.venueId, venueId))
    .groupBy(referralCommissionsTable.pillarType, referralCommissionsTable.status);

  const totalConfirmed = rows
    .filter(r => r.status === "CONFIRMED" || r.status === "DISBURSED")
    .reduce((s, r) => s + parseFloat(r.totalAmount ?? "0"), 0);
  const totalPending = rows
    .filter(r => r.status === "PENDING")
    .reduce((s, r) => s + parseFloat(r.totalAmount ?? "0"), 0);
  const totalClicks  = rows.reduce((s, r) => s + Number(r.rowCount), 0);

  res.json({ venueId, totalConfirmed, totalPending, totalClicks, byPillar: rows, generatedAt: new Date().toISOString() });
});

// ── GET /transactions ────────────────────────────────────────────────────────

router.get("/transactions", requireAuth, async (req: AuthRequest, res: Response) => {
  const venueId =
    (req.query.venueId as string | undefined) ??
    (req.user?.role === "super_admin" ? undefined : req.user?.venueId);

  if (!venueId) {
    res.status(400).json({ error: "venueId required" });
    return;
  }

  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const rows  = await db
    .select()
    .from(referralCommissionsTable)
    .where(eq(referralCommissionsTable.venueId, venueId))
    .orderBy(desc(referralCommissionsTable.createdAt))
    .limit(limit);

  res.json({ transactions: rows });
});

// ── GET /referrers ───────────────────────────────────────────────────────────

router.get("/referrers", requireAuth, async (req: AuthRequest, res: Response) => {
  const venueId =
    (req.query.venueId as string | undefined) ??
    (req.user?.role === "super_admin" ? undefined : req.user?.venueId);

  if (!venueId) {
    res.status(400).json({ error: "venueId required" });
    return;
  }

  const rows = await db
    .select({
      staffId:     referralCommissionsTable.staffId,
      totalAmount: sum(referralCommissionsTable.commissionAmount),
      referrals:   count(),
    })
    .from(referralCommissionsTable)
    .where(and(
      eq(referralCommissionsTable.venueId, venueId),
      isNotNull(referralCommissionsTable.staffId),
    ))
    .groupBy(referralCommissionsTable.staffId)
    .orderBy(desc(sum(referralCommissionsTable.commissionAmount)))
    .limit(10);

  res.json({ referrers: rows });
});

export default router;
