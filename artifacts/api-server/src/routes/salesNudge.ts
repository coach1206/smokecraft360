/**
 * /api/sales — Nudge-to-Sale Revenue Tracking
 *
 *   POST /api/sales/confirm-nudge
 *       Confirms a Service Sage nudge converted to a real sale.
 *       Persists to venue_revenue_pressure, awards guest Mastery XP,
 *       and broadcasts a socket event for the owner dashboard.
 *
 *   GET  /api/sales/nudge-stats?venueId=
 *       Conversion rate + total attributed revenue for the owner view.
 */

import { Router, type Response }                    from "express";
import { eq, count, sum, desc }                     from "drizzle-orm";
import { db, venueRevenuePressureTable,
         guestProfilesTable }                        from "@workspace/db";
import { z }                                         from "zod";
import { requireAuth }                              from "../middleware/auth";
import { requireRole }                              from "../middleware/roles";
import type { AuthRequest }                         from "../middleware/auth";
import { masteryTierFromScore }                     from "./mastery";
import { getIO }                                    from "../lib/socketServer";

const router = Router();

// XP awarded per confirmed nudge — flat bonus on top of normal session growth
const NUDGE_XP_FLAT = 2.5;

// ── POST /confirm-nudge ───────────────────────────────────────────────────────

const confirmNudgeSchema = z.object({
  tableId:         z.string().min(1),
  guestProfileId:  z.string().uuid().optional(),
  recommendedItem: z.string().min(1),
  premiumTier:     z.number().int().min(1).max(5).optional().default(1),
  revenueCents:    z.number().int().min(0).optional(),
  venueId:         z.string().uuid().optional(),
  nudgeSentAt:     z.string().datetime().optional(),
});

router.post("/confirm-nudge", requireAuth, async (req: AuthRequest, res: Response) => {
  const body = confirmNudgeSchema.parse(req.body);

  // 1. Write to venue_revenue_pressure
  const [conversion] = await db
    .insert(venueRevenuePressureTable)
    .values({
      venueId:          body.venueId,
      tableId:          body.tableId,
      guestProfileId:   body.guestProfileId,
      staffId:          req.user?.id ? body.venueId : undefined, // staff user id
      recommendedItem:  body.recommendedItem,
      premiumTier:      body.premiumTier,
      saleConfirmed:    true,
      masteryXpAwarded: body.guestProfileId ? Math.round(NUDGE_XP_FLAT * 10) / 10 : 0,
      revenueCents:     body.revenueCents,
      nudgeSentAt:      body.nudgeSentAt ? new Date(body.nudgeSentAt) : undefined,
      confirmedAt:      new Date(),
    })
    .returning();

  // 2. Award Mastery XP to guest
  let masteryResult: { newTotal: number; newTier: string } | null = null;

  if (body.guestProfileId) {
    const [profile] = await db
      .select({ id: guestProfilesTable.id, totalMastery: guestProfilesTable.totalMastery })
      .from(guestProfilesTable)
      .where(eq(guestProfilesTable.id, body.guestProfileId))
      .limit(1);

    if (profile) {
      const newTotal = Math.min(100, Number((profile.totalMastery + NUDGE_XP_FLAT).toFixed(2)));
      const newTier  = masteryTierFromScore(newTotal);

      await db
        .update(guestProfilesTable)
        .set({ totalMastery: newTotal, masteryTier: newTier, lastSeenAt: new Date() })
        .where(eq(guestProfilesTable.id, body.guestProfileId));

      masteryResult = { newTotal, newTier };

      // Broadcast identity evolution
      const io = getIO();
      if (io) {
        io.emit("neural:identity_evolved", {
          guestId:      body.guestProfileId,
          totalMastery: newTotal,
          masteryTier:  newTier,
          source:       "nudge_conversion",
          venueId:      body.venueId,
        });
      }
    }
  }

  // 3. Broadcast sale confirmed to owner dashboard
  const io = getIO();
  if (io) {
    io.emit("sage:sale_confirmed", {
      tableId:         body.tableId,
      recommendedItem: body.recommendedItem,
      premiumTier:     body.premiumTier,
      revenueCents:    body.revenueCents,
      masteryAwarded:  masteryResult?.newTotal,
      confirmedAt:     conversion?.confirmedAt,
      venueId:         body.venueId,
    });
  }

  res.json({
    ok:             true,
    conversion,
    masteryResult,
    xpAwarded:      masteryResult ? NUDGE_XP_FLAT : 0,
  });
});

// ── GET /nudge-stats ──────────────────────────────────────────────────────────

router.get("/nudge-stats", requireAuth, requireRole("venue_owner", "manager", "super_admin"), async (req: AuthRequest, res: Response) => {
  const venueId = req.query["venueId"] as string | undefined;

  const baseQuery = db.select({
    total:        count(),
    totalRevenue: sum(venueRevenuePressureTable.revenueCents),
  }).from(venueRevenuePressureTable);

  const [stats] = venueId
    ? await baseQuery.where(eq(venueRevenuePressureTable.venueId, venueId))
    : await baseQuery;

  // Recent confirmed nudges
  const recent = await db
    .select()
    .from(venueRevenuePressureTable)
    .orderBy(desc(venueRevenuePressureTable.confirmedAt))
    .limit(20);

  res.json({
    totalConfirmed:    Number(stats?.total ?? 0),
    totalRevenueCents: Number(stats?.totalRevenue ?? 0),
    recent,
  });
});

export default router;
