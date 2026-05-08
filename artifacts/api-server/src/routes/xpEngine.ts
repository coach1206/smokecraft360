/**
 * xpEngine — persistent XP ledger and achievement engine for guests.
 *
 * POST /api/xp/award              — award (or deduct) XP, check achievements
 * GET  /api/xp/history/:guestId   — full XP transaction history
 * GET  /api/xp/summary/:guestId   — current total + tier + recent achievements
 */

import { Router } from "express";
import { z } from "zod";
import { db, pool } from "@workspace/db";
import { xpTransactionsTable, guestAchievementsTable, ACHIEVEMENT_REGISTRY } from "@workspace/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getIO } from "../lib/socketServer";
import { broadcastLeaderboard } from "./leaderboard";

const router = Router();

// ── XP tier thresholds ───────────────────────────────────────────────────────

export function xpToTier(xp: number): { tier: string; label: string; next: number; progress: number } {
  if (xp >= 860) return { tier: "golden_box",  label: "Golden Box",        next: 1000, progress: Math.min(100, Math.round((xp - 860)  / 1.4)) };
  if (xp >= 610) return { tier: "aficionado",  label: "Aficionado",        next: 860,  progress: Math.round((xp - 610) / 2.5)  };
  if (xp >= 410) return { tier: "specialist",  label: "Craft Specialist",  next: 610,  progress: Math.round((xp - 410) / 2)    };
  if (xp >= 210) return { tier: "enthusiast",  label: "Lounge Enthusiast", next: 410,  progress: Math.round((xp - 210) / 2)    };
  return           { tier: "explorer",     label: "Curious Explorer",  next: 210,  progress: Math.round(xp / 2.1)          };
}

// ── POST /api/xp/award ───────────────────────────────────────────────────────

const awardSchema = z.object({
  guestProfileId: z.string().uuid().optional(),
  userId:         z.string().uuid().optional(),
  craftType:      z.enum(["smoke","pour","brew","vape"]).optional(),
  amount:         z.number().int(),
  reason:         z.string(),
  metadata:       z.record(z.unknown()).optional(),
});

router.post("/award", async (req, res) => {
  const parsed = awardSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid request" }); return; }

  const { guestProfileId, userId, craftType, amount, reason, metadata } = parsed.data;

  if (!guestProfileId && !userId) {
    res.status(400).json({ error: "guestProfileId or userId required" });
    return;
  }

  try {
    // Log the transaction
    const [txn] = await db.insert(xpTransactionsTable).values({
      guestProfileId: guestProfileId ?? null,
      userId:         userId         ?? null,
      craftType:      craftType      ?? null,
      amount,
      reason,
      metadata: metadata ?? {},
    }).returning();

    // Compute new total (sum all transactions for this guest)
    let newTotal = 0;
    if (guestProfileId) {
      const result = await db
        .select({ total: sql<number>`coalesce(sum(${xpTransactionsTable.amount}), 0)` })
        .from(xpTransactionsTable)
        .where(eq(xpTransactionsTable.guestProfileId, guestProfileId));
      newTotal = Number(result[0]?.total ?? 0);
    }

    const tierInfo = xpToTier(newTotal);

    // Check for auto-achievements
    const newAchievements: typeof guestAchievementsTable.$inferSelect[] = [];
    if (guestProfileId) {
      newAchievements.push(...await checkAndAwardAchievements(guestProfileId, newTotal, craftType));
    }

    // Log to reward_events for analytics
    try {
      const craftScore = Math.min(100, Math.max(0, Math.round((newTotal / 500) * 100)));
      await pool.query(
        `INSERT INTO reward_events (guest_profile_id, user_id, event_type, craft_type, xp_delta, craft_score_after, trigger_source, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          guestProfileId ?? null, userId ?? null,
          amount >= 0 ? "xp_gain" : "xp_loss",
          craftType ?? null, amount, craftScore,
          reason, JSON.stringify(metadata ?? {}),
        ],
      );
    } catch { /* non-blocking */ }

    // Broadcast XP burst + leaderboard update via Socket.io
    try {
      const io = getIO();
      io.emit("xp_burst", {
        guestProfileId: guestProfileId ?? null,
        amount, newTotal, tier: tierInfo.tier, ts: Date.now(),
      });
      if (newAchievements.length > 0) {
        io.emit("achievement_unlocked", {
          guestProfileId,
          achievements: newAchievements.map(a => ({ id: a.achievementId, name: a.achievementName, xpValue: a.xpValue })),
          ts: Date.now(),
        });
      }
      // Non-blocking leaderboard refresh
      broadcastLeaderboard(craftType).catch(() => {});
    } catch { /* non-blocking */ }

    res.json({ success: true, transactionId: txn?.id, newTotal, tier: tierInfo, newAchievements });
  } catch (err) {
    logger.error({ err }, "xp award error");
    res.status(500).json({ error: "XP award failed" });
  }
});

// ── GET /api/xp/history/:guestId ─────────────────────────────────────────────

router.get("/history/:guestId", async (req, res) => {
  const { guestId } = req.params;

  try {
    const transactions = await db.select()
      .from(xpTransactionsTable)
      .where(eq(xpTransactionsTable.guestProfileId, guestId))
      .orderBy(desc(xpTransactionsTable.createdAt))
      .limit(50);

    const totalResult = await db
      .select({ total: sql<number>`coalesce(sum(${xpTransactionsTable.amount}), 0)` })
      .from(xpTransactionsTable)
      .where(eq(xpTransactionsTable.guestProfileId, guestId));

    const total = Number(totalResult[0]?.total ?? 0);

    res.json({ transactions, total, tier: xpToTier(total) });
  } catch (err) {
    logger.error({ err }, "xp history error");
    res.status(500).json({ error: "XP history fetch failed" });
  }
});

// ── GET /api/xp/summary/:guestId ─────────────────────────────────────────────

router.get("/summary/:guestId", async (req, res) => {
  const { guestId } = req.params;

  try {
    const totalResult = await db
      .select({ total: sql<number>`coalesce(sum(${xpTransactionsTable.amount}), 0)` })
      .from(xpTransactionsTable)
      .where(eq(xpTransactionsTable.guestProfileId, guestId));

    const total = Number(totalResult[0]?.total ?? 0);
    const tier  = xpToTier(total);

    const achievements = await db.select()
      .from(guestAchievementsTable)
      .where(eq(guestAchievementsTable.guestProfileId, guestId))
      .orderBy(desc(guestAchievementsTable.unlockedAt));

    const recent = await db.select()
      .from(xpTransactionsTable)
      .where(eq(xpTransactionsTable.guestProfileId, guestId))
      .orderBy(desc(xpTransactionsTable.createdAt))
      .limit(5);

    res.json({ total, tier, achievements, recentTransactions: recent });
  } catch (err) {
    logger.error({ err }, "xp summary error");
    res.status(500).json({ error: "XP summary fetch failed" });
  }
});

// ── Achievement checker ───────────────────────────────────────────────────────

async function checkAndAwardAchievements(
  guestProfileId: string,
  newTotal: number,
  craftType?: string,
): Promise<typeof guestAchievementsTable.$inferSelect[]> {
  const candidates: string[] = [];

  if (newTotal >= 100)  candidates.push("enrolled");
  if (newTotal >= 110)  candidates.push("first_swipe");
  if (newTotal >= 250)  candidates.push("ten_swipes");
  if (newTotal >= 500)  candidates.push("fifty_swipes");
  if (craftType === "smoke" && newTotal >= 140) candidates.push("smoke_initiate");
  if (craftType === "pour"  && newTotal >= 140) candidates.push("pour_initiate");
  if (craftType === "brew"  && newTotal >= 140) candidates.push("brew_initiate");
  if (craftType === "vape"  && newTotal >= 140) candidates.push("vape_initiate");

  if (candidates.length === 0) return [];

  // Check which are already unlocked
  const existing = await db.select({ achievementId: guestAchievementsTable.achievementId })
    .from(guestAchievementsTable)
    .where(eq(guestAchievementsTable.guestProfileId, guestProfileId));

  const existingIds = new Set(existing.map(r => r.achievementId));
  const toUnlock    = candidates.filter(id => !existingIds.has(id));

  if (toUnlock.length === 0) return [];

  const rows = toUnlock.map(id => {
    const def = ACHIEVEMENT_REGISTRY[id]!;
    return {
      guestProfileId,
      achievementId:          id,
      achievementName:        def.name,
      achievementDescription: def.description,
      craftType:              def.craftType ?? null,
      xpValue:                def.xpValue,
      iconSlug:               def.iconSlug,
    };
  });

  try {
    const inserted = await db.insert(guestAchievementsTable).values(rows).returning().onConflictDoNothing();
    return inserted;
  } catch {
    return [];
  }
}

export default router;
