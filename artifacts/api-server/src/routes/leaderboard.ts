/**
 * leaderboard.ts — Universal Craft Leaderboard
 *
 * 0-100 Craft Score system. Tier ranges:
 *   0–20  Explorer | 21–40 Enthusiast | 41–60 Specialist
 *   61–85 Aficionado | 86–100 Golden Box
 *
 * Routes:
 *   GET /api/leaderboard               — global top 50 + caller rank
 *   GET /api/leaderboard/craft/:type   — craft-specific rankings
 *   GET /api/leaderboard/venue/:id     — venue-scoped rankings
 *   GET /api/leaderboard/guest/:id     — guest rank card + nearby entries
 *   POST /api/leaderboard/broadcast    — internal: force a socket emit
 */

import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql, desc, eq, and } from "drizzle-orm";
import { xpTransactionsTable, guestProfilesTable, guestAchievementsTable } from "@workspace/db/schema";
import { getIO } from "../lib/socketServer";
import { logger } from "../lib/logger";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

const XP_TO_SCORE = (xp: number): number =>
  Math.min(100, Math.max(0, Math.round((xp / 500) * 100)));

function getTier(score: number): { tier: string; label: string; color: string } {
  if (score >= 86) return { tier: "golden_box",   label: "Golden Box",   color: "#FFD700" };
  if (score >= 61) return { tier: "aficionado",   label: "Aficionado",  color: "#CE93D8" };
  if (score >= 41) return { tier: "specialist",   label: "Specialist",  color: "#D48B00" };
  if (score >= 21) return { tier: "enthusiast",   label: "Enthusiast",  color: "#7EC8A0" };
  return               { tier: "explorer",      label: "Explorer",    color: "#6B8A9A" };
}

async function buildLeaderboard(opts: {
  craftType?: string;
  venueId?:   string;
  limit?:     number;
  offset?:    number;
}) {
  const { craftType, limit = 50, offset = 0 } = opts;

  const rows = await db
    .select({
      guestProfileId: xpTransactionsTable.guestProfileId,
      totalXp:        sql<number>`coalesce(sum(${xpTransactionsTable.amount}), 0)`,
      achievementCnt: sql<number>`count(distinct ${guestAchievementsTable.id})`,
    })
    .from(xpTransactionsTable)
    .leftJoin(
      guestAchievementsTable,
      eq(guestAchievementsTable.guestProfileId, xpTransactionsTable.guestProfileId),
    )
    .where(
      craftType
        ? and(
            sql`${xpTransactionsTable.guestProfileId} is not null`,
            eq(xpTransactionsTable.craftType, craftType),
          )
        : sql`${xpTransactionsTable.guestProfileId} is not null`,
    )
    .groupBy(xpTransactionsTable.guestProfileId)
    .orderBy(desc(sql`sum(${xpTransactionsTable.amount})`))
    .limit(limit)
    .offset(offset);

  const enriched = await Promise.all(
    rows.map(async (r, idx) => {
      const [profile] = await db
        .select({ firstName: guestProfilesTable.firstName, lastInitial: guestProfilesTable.lastInitial })
        .from(guestProfilesTable)
        .where(eq(guestProfilesTable.id, r.guestProfileId!))
        .limit(1)
        .catch(() => []);

      const xp    = Number(r.totalXp ?? 0);
      const score = XP_TO_SCORE(xp);
      const tier  = getTier(score);

      return {
        rank:           offset + idx + 1,
        guestProfileId: r.guestProfileId,
        firstName:      profile?.firstName ?? "Guest",
        lastInitial:    profile?.lastInitial ?? "",
        craftScore:     score,
        totalXp:        xp,
        achievementCnt: Number(r.achievementCnt ?? 0),
        tier:           tier.tier,
        tierLabel:      tier.label,
        tierColor:      tier.color,
      };
    }),
  );

  return enriched;
}

export async function broadcastLeaderboard(craftType?: string): Promise<void> {
  try {
    const top10 = await buildLeaderboard({ craftType, limit: 10 });
    const io    = getIO();
    io.emit("leaderboard_update", {
      craftType: craftType ?? "global",
      entries:   top10,
      ts:        Date.now(),
    });
  } catch (err) {
    logger.error({ err }, "leaderboard broadcast failed");
  }
}

// ── GET /api/leaderboard ──────────────────────────────────────────────────────

router.get("/", async (req: Request, res: Response) => {
  try {
    const limit  = Math.min(50, Math.max(1, parseInt(String(req.query["limit"] ?? "20"), 10) || 20));
    const offset = Math.max(0, parseInt(String(req.query["offset"] ?? "0"), 10) || 0);
    const entries = await buildLeaderboard({ limit, offset });
    res.json({ entries, total: entries.length, limit, offset });
  } catch (err) {
    logger.error({ err }, "leaderboard fetch error");
    res.status(500).json({ error: "Leaderboard unavailable" });
  }
});

// ── GET /api/leaderboard/craft/:type ─────────────────────────────────────────

router.get("/craft/:type", async (req: Request, res: Response) => {
  const { type } = req.params as { type: string };
  const VALID = new Set(["smoke", "pour", "brew", "vape"]);
  if (!VALID.has(type)) {
    res.status(400).json({ error: "Invalid craft type" });
    return;
  }
  try {
    const limit   = Math.min(50, Math.max(1, parseInt(String(req.query["limit"] ?? "20"), 10) || 20));
    const entries = await buildLeaderboard({ craftType: type, limit });
    res.json({ craftType: type, entries });
  } catch (err) {
    logger.error({ err }, "craft leaderboard error");
    res.status(500).json({ error: "Leaderboard unavailable" });
  }
});

// ── GET /api/leaderboard/guest/:id ───────────────────────────────────────────

router.get("/guest/:id", async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    const all = await buildLeaderboard({ limit: 200 });
    const idx = all.findIndex(e => e.guestProfileId === id);

    if (idx === -1) {
      const [xpRow] = await db
        .select({ total: sql<number>`coalesce(sum(${xpTransactionsTable.amount}), 0)` })
        .from(xpTransactionsTable)
        .where(eq(xpTransactionsTable.guestProfileId!, id))
        .catch(() => [{ total: 0 }]);

      const xp    = Number(xpRow?.total ?? 0);
      const score = XP_TO_SCORE(xp);
      const tier  = getTier(score);
      res.json({ rank: null, craftScore: score, tier, nearby: all.slice(0, 5) });
      return;
    }

    const nearby = all.slice(Math.max(0, idx - 2), idx + 3);
    res.json({ rank: idx + 1, entry: all[idx], nearby });
  } catch (err) {
    logger.error({ err }, "guest leaderboard rank error");
    res.status(500).json({ error: "Rank unavailable" });
  }
});

// ── POST /api/leaderboard/broadcast — internal trigger ───────────────────────

router.post("/broadcast", async (req: Request, res: Response) => {
  const { craftType } = req.body as { craftType?: string };
  await broadcastLeaderboard(craftType);
  res.json({ ok: true });
});

export default router;
