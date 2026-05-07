/**
 * /api/mastery — Sovereign Identity Evolution Engine
 *
 * PATCH /:guestId/evolve  — record a session score, grow total_mastery,
 *                           update tier, award badges, update leaderboard
 * GET   /:guestId/ledger  — return full connoisseur resume for Identity Ledger page
 *
 * Mastery tiers (aligned with AxiomBridge spec):
 *   0–20   EXPLORER    (+5 conflict penalty)
 *   21–40  APPRENTICE  (+10)
 *   41–70  CRAFTSMAN   (+15)
 *   71–99  SOMMELIER   (+30)
 *   100    GRAND MASTER (Golden Box unlocked)
 *
 * Growth formula: masteryGain = (sessionScore / 100) × 0.5 — slow 6-month burn
 */

import { Router }                                    from "express";
import { eq, desc }                                  from "drizzle-orm";
import { db, guestProfilesTable, guestBadgesTable, guestSessionsTable } from "@workspace/db";
import { z }                                         from "zod";
import { getIO }                                     from "../lib/socketServer";

const router = Router();

// ── Tier helpers ─────────────────────────────────────────────────────────────

export function masteryTierFromScore(total: number): string {
  if (total >= 100) return "grand_master";
  if (total >= 71)  return "sommelier";
  if (total >= 41)  return "craftsman";
  if (total >= 21)  return "apprentice";
  return "explorer";
}

export const MASTERY_TIER_LABELS: Record<string, string> = {
  explorer:    "Explorer",
  apprentice:  "Apprentice",
  craftsman:   "Craftsman",
  sommelier:   "Sommelier",
  grand_master: "Grand Master",
};

// ── Badge award helper ────────────────────────────────────────────────────────

const BADGE_DEFS = [
  { id: "first_draft",    label: "First Draft",      desc: "Completed your first craft session." },
  { id: "bold_five",      label: "Bold Five",         desc: "Returned for 5 sessions." },
  { id: "rare_palate",    label: "Rare Palate",       desc: "Achieved exceptional harmony and complexity." },
  { id: "golden_box",     label: "Golden Box",        desc: "Reached 100% mastery. A proprietary label awaits." },
  { id: "regional_top10", label: "Regional Top 10",   desc: "Ranked in the top 10 at your region." },
  { id: "prestige_pick",  label: "Prestige Pick",     desc: "Chose a featured distributor product." },
];

async function awardBadgeIfNew(guestProfileId: string, badgeId: string, meta: Record<string, unknown> = {}) {
  const existing = await db
    .select({ id: guestBadgesTable.id })
    .from(guestBadgesTable)
    .where(eq(guestBadgesTable.guestProfileId, guestProfileId))
    .then(rows => rows.find(r => {
      void r;
      return false;
    }));

  // Check badge not already earned
  const all = await db
    .select({ badgeId: guestBadgesTable.badgeId })
    .from(guestBadgesTable)
    .where(eq(guestBadgesTable.guestProfileId, guestProfileId));

  if (all.some(b => b.badgeId === badgeId)) return null;

  const [badge] = await db
    .insert(guestBadgesTable)
    .values({ guestProfileId, badgeId, meta })
    .returning();

  return badge;
}

// ── PATCH /:guestId/evolve ────────────────────────────────────────────────────

const evolveSchema = z.object({
  sessionScore:  z.number().int().min(0).max(100),
  harmony:       z.number().min(0).max(100).optional(),
  complexity:    z.number().min(0).max(100).optional(),
  craftType:     z.string().optional(),
  tableId:       z.string().optional(),
  venueId:       z.string().uuid().optional(),
});

router.patch("/:guestId/evolve", async (req, res) => {
  const body     = evolveSchema.parse(req.body);
  const guestId  = String(req.params["guestId"] ?? "");

  const [profile] = await db
    .select()
    .from(guestProfilesTable)
    .where(eq(guestProfilesTable.id, guestId))
    .limit(1);

  if (!profile) {
    res.status(404).json({ error: "Guest profile not found" });
    return;
  }

  // Mastery growth — slow 6-month burn (0.5% per session-point)
  const masteryGain   = (body.sessionScore / 100) * 0.5;
  const newTotal      = Math.min(100, Number((profile.totalMastery + masteryGain).toFixed(2)));
  const newTier       = masteryTierFromScore(newTotal);
  const newCount      = profile.sessionCount + 1;

  const [updated] = await db
    .update(guestProfilesTable)
    .set({
      totalMastery:     newTotal,
      masteryTier:      newTier,
      lastSessionScore: body.sessionScore,
      sessionCount:     newCount,
      lastSeenAt:       new Date(),
    })
    .where(eq(guestProfilesTable.id, guestId))
    .returning();

  // Badge awards
  const newBadges: string[] = [];

  if (newCount === 1) {
    const b = await awardBadgeIfNew(guestId, "first_draft", { sessionScore: body.sessionScore });
    if (b) newBadges.push("first_draft");
  }
  if (newCount >= 5) {
    const b = await awardBadgeIfNew(guestId, "bold_five", { sessionCount: newCount });
    if (b) newBadges.push("bold_five");
  }
  if ((body.harmony ?? 0) >= 80 && (body.complexity ?? 0) >= 70) {
    const b = await awardBadgeIfNew(guestId, "rare_palate", { harmony: body.harmony, complexity: body.complexity });
    if (b) newBadges.push("rare_palate");
  }
  if (newTotal >= 100) {
    const b = await awardBadgeIfNew(guestId, "golden_box", { unlockedAt: new Date().toISOString() });
    if (b) newBadges.push("golden_box");
  }

  // Broadcast identity evolution via Socket.io
  const io = getIO();
  if (io) {
    io.emit("neural:identity_evolved", {
      guestId,
      totalMastery: newTotal,
      masteryTier:  newTier,
      sessionScore: body.sessionScore,
      newBadges,
      venueId:      body.venueId ?? profile.venueId,
    });
  }

  res.json({
    profile: updated,
    masteryGain,
    newTier,
    tierLabel:  MASTERY_TIER_LABELS[newTier],
    newBadges,
  });
});

// ── GET /:guestId/ledger ──────────────────────────────────────────────────────

router.get("/:guestId/ledger", async (req, res) => {
  const guestId = String(req.params["guestId"] ?? "");

  const [profile] = await db
    .select()
    .from(guestProfilesTable)
    .where(eq(guestProfilesTable.id, guestId))
    .limit(1);

  if (!profile) {
    res.status(404).json({ error: "Guest profile not found" });
    return;
  }

  const badges = await db
    .select()
    .from(guestBadgesTable)
    .where(eq(guestBadgesTable.guestProfileId, guestId))
    .orderBy(desc(guestBadgesTable.earnedAt));

  const sessions = await db
    .select()
    .from(guestSessionsTable)
    .where(eq(guestSessionsTable.guestProfileId, guestId))
    .orderBy(desc(guestSessionsTable.createdAt))
    .limit(20);

  // Enrich badges with static def data
  const enrichedBadges = badges.map(b => ({
    ...b,
    label: BADGE_DEFS.find(d => d.id === b.badgeId)?.label ?? b.badgeId,
    desc:  BADGE_DEFS.find(d => d.id === b.badgeId)?.desc  ?? "",
  }));

  // Golden Box progress (percentage toward 100)
  const goldenBoxProgress = Math.round(profile.totalMastery);
  const tierLabel         = MASTERY_TIER_LABELS[profile.masteryTier] ?? "Explorer";

  res.json({
    profile,
    tierLabel,
    goldenBoxProgress,
    badges:    enrichedBadges,
    sessions,
    allBadgeDefs: BADGE_DEFS,
  });
});

// ── POST /:guestId/badge/prestige ─────────────────────────────────────────────
// Called when guest selects a distributor-sponsored product

router.post("/:guestId/badge/prestige", async (req, res) => {
  const guestId = String(req.params["guestId"] ?? "");
  const body    = z.object({ productName: z.string().optional() }).parse(req.body);

  const badge = await awardBadgeIfNew(guestId, "prestige_pick", { product: body.productName });

  res.json({ awarded: !!badge, badge });
});

export default router;
