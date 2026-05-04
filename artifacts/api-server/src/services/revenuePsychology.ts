import { db, userProgressionTable, userLoyaltyPointsTable, rewardsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { getSmartPrice, type SmartPriceContext } from "./sessionEconomics";
import { logger } from "../lib/logger";

export interface ProgressionTension {
  currentXp: number;
  nextTierXp: number;
  progressPercent: number;
  message: string;
  urgency: "low" | "medium" | "high";
}

export interface PerceivedValue {
  originalPriceCents: number;
  experiencePriceCents: number;
  savingsCents: number;
  savingsLabel: string;
}

export interface ReturnHook {
  message: string;
  incentive: string;
  type: "next_session" | "new_path" | "streak";
}

export interface PsychologyBundle {
  tension: ProgressionTension | null;
  perceivedValue: PerceivedValue | null;
  returnHook: ReturnHook;
  socialProof: string | null;
}

const TIERS = [
  { index: 0, title: "Explorer",          minXp: 0   },
  { index: 1, title: "Enthusiast",        minXp: 50  },
  { index: 2, title: "Aficionado",        minXp: 150 },
  { index: 3, title: "Connoisseur",       minXp: 350 },
  { index: 4, title: "Maestro del Fuego", minXp: 700 },
];

export async function getProgressionTension(
  userId: string,
): Promise<ProgressionTension | null> {
  const [prog] = await db
    .select({ xp: userProgressionTable.xp })
    .from(userProgressionTable)
    .where(eq(userProgressionTable.userId, userId))
    .limit(1);

  if (!prog) return null;

  const xp = prog.xp;
  let currentTier = TIERS[0]!;
  for (const t of TIERS) {
    if (xp >= t.minXp) currentTier = t;
  }

  const nextTier = TIERS[currentTier.index + 1];
  if (!nextTier) {
    return {
      currentXp: xp,
      nextTierXp: currentTier.minXp,
      progressPercent: 100,
      message: `You've reached ${currentTier.title} — the highest tier. Legend.`,
      urgency: "low",
    };
  }

  const range = nextTier.minXp - currentTier.minXp;
  const progress = xp - currentTier.minXp;
  const pct = Math.round((progress / range) * 100);

  let urgency: "low" | "medium" | "high" = "low";
  let message: string;

  if (pct >= 80) {
    urgency = "high";
    message = `You're ${pct}% to ${nextTier.title} — one more session could unlock it.`;
  } else if (pct >= 50) {
    urgency = "medium";
    message = `Halfway to ${nextTier.title} — keep going, you're building momentum.`;
  } else {
    message = `${pct}% toward ${nextTier.title}. Every choice earns XP.`;
  }

  return {
    currentXp: xp,
    nextTierXp: nextTier.minXp,
    progressPercent: pct,
    message,
    urgency,
  };
}

export function buildPerceivedValue(
  basePriceCents: number,
  context: SmartPriceContext,
): PerceivedValue | null {
  const smart = getSmartPrice(basePriceCents, context);

  if (smart.adjustment >= 0) return null;

  const savings = basePriceCents - smart.finalPriceCents;
  const savingsDollars = (savings / 100).toFixed(2);

  return {
    originalPriceCents: basePriceCents,
    experiencePriceCents: smart.finalPriceCents,
    savingsCents: savings,
    savingsLabel: `Your Experience Price saves you $${savingsDollars}`,
  };
}

const RETURN_HOOKS: ReturnHook[] = [
  {
    message: "Next session unlocks a new flavor path",
    incentive: "Try a different mood next time for bonus XP",
    type: "next_session",
  },
  {
    message: "Your taste profile evolves each visit",
    incentive: "Explore a new category to expand your identity",
    type: "new_path",
  },
  {
    message: "Consistency builds streaks",
    incentive: "Come back within 7 days to keep your streak alive",
    type: "streak",
  },
];

export function pickReturnHook(sessionScore: number): ReturnHook {
  if (sessionScore >= 8) return RETURN_HOOKS[0]!;
  if (sessionScore >= 5) return RETURN_HOOKS[2]!;
  return RETURN_HOOKS[1]!;
}

export async function getNextRewardDistance(
  userId: string,
): Promise<{ pointsToNext: number; rewardName: string } | null> {
  const [bal] = await db
    .select({
      totalPoints: userLoyaltyPointsTable.totalPoints,
      pointsRedeemed: userLoyaltyPointsTable.pointsRedeemed,
    })
    .from(userLoyaltyPointsTable)
    .where(eq(userLoyaltyPointsTable.userId, userId))
    .limit(1);

  if (!bal) return null;

  const balance = (bal.totalPoints ?? 0) - (bal.pointsRedeemed ?? 0);

  const [cheapest] = await db
    .select({ name: rewardsTable.name, pointsCost: rewardsTable.pointsCost })
    .from(rewardsTable)
    .where(
      and(
        eq(rewardsTable.active, true),
        sql`${rewardsTable.pointsCost} > ${balance}`,
      ),
    )
    .orderBy(rewardsTable.pointsCost)
    .limit(1);

  if (!cheapest) return null;

  return {
    pointsToNext: cheapest.pointsCost - balance,
    rewardName: cheapest.name,
  };
}

export async function buildPsychologyBundle(
  userId: string | undefined,
  sessionScore: number,
  basePriceCents?: number,
  interactions?: number,
): Promise<PsychologyBundle> {
  let tension: ProgressionTension | null = null;
  let perceivedValue: PerceivedValue | null = null;
  let socialProof: string | null = null;

  if (userId) {
    try {
      const [t, nextReward] = await Promise.all([
        getProgressionTension(userId),
        getNextRewardDistance(userId),
      ]);
      tension = t;

      if (nextReward) {
        const pts = nextReward.pointsToNext;
        socialProof = pts <= 15
          ? `Just ${pts} points from "${nextReward.rewardName}" — almost there!`
          : `${pts} points until you unlock "${nextReward.rewardName}"`;
      }
    } catch (err) {
      logger.warn({ err }, "psychology: progression lookup failed");
    }
  }

  if (basePriceCents && basePriceCents > 0) {
    perceivedValue = buildPerceivedValue(basePriceCents, {
      interactions: interactions ?? 0,
    });
  }

  return {
    tension,
    perceivedValue,
    returnHook: pickReturnHook(sessionScore),
    socialProof,
  };
}
