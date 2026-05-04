import { logger } from "../lib/logger";

export type RewardTier = "none" | "small" | "medium" | "premium";

export interface VariableReward {
  tier: RewardTier;
  label: string;
  description: string;
  discountPercent: number;
}

export interface RewardContext {
  score: number;
  interactions: number;
  completedExperience: boolean;
  isRepeatUser: boolean;
  venueRewardIntensity?: number;
}

const TIER_TABLE: Record<RewardTier, Omit<VariableReward, "tier">> = {
  none: {
    label: "Keep Going",
    description: "Complete more to unlock rewards",
    discountPercent: 0,
  },
  small: {
    label: "Nice Pick",
    description: "You earned a small reward",
    discountPercent: 5,
  },
  medium: {
    label: "Great Taste",
    description: "Your selections unlocked a special offer",
    discountPercent: 10,
  },
  premium: {
    label: "Exceptional Session",
    description: "You've earned a premium reward — well played",
    discountPercent: 15,
  },
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export function rollReward(ctx: RewardContext, epochSeed?: number): VariableReward {
  if (!ctx.completedExperience) {
    return { tier: "none", ...TIER_TABLE.none };
  }

  const intensity = Math.max(0.3, Math.min(1.5, ctx.venueRewardIntensity ?? 1.0));

  let premiumChance = 0.08;
  let mediumChance = 0.25;
  let smallChance = 0.45;

  if (ctx.score >= 8) {
    premiumChance += 0.12;
    mediumChance += 0.10;
  } else if (ctx.score >= 5) {
    mediumChance += 0.08;
    smallChance += 0.05;
  }

  if (ctx.interactions >= 3) {
    premiumChance += 0.05;
    mediumChance += 0.05;
  }

  if (ctx.isRepeatUser) {
    premiumChance += 0.04;
    mediumChance += 0.03;
  }

  premiumChance *= intensity;
  mediumChance *= intensity;
  smallChance *= intensity;

  premiumChance = Math.min(premiumChance, 0.35);
  mediumChance = Math.min(mediumChance, 0.55);

  const rand = seededRandom(epochSeed ?? Date.now());

  let tier: RewardTier;
  if (rand < premiumChance) {
    tier = "premium";
  } else if (rand < premiumChance + mediumChance) {
    tier = "medium";
  } else if (rand < premiumChance + mediumChance + smallChance) {
    tier = "small";
  } else {
    tier = "none";
  }

  logger.info(
    { tier, score: ctx.score, rand: rand.toFixed(3), intensity },
    "variable reward rolled",
  );

  return { tier, ...TIER_TABLE[tier] };
}

export function applyRewardToPrice(
  basePriceCents: number,
  reward: VariableReward,
): { finalPriceCents: number; savingsCents: number } {
  if (reward.discountPercent === 0) {
    return { finalPriceCents: basePriceCents, savingsCents: 0 };
  }
  const discount = Math.round(basePriceCents * (reward.discountPercent / 100));
  return {
    finalPriceCents: basePriceCents - discount,
    savingsCents: discount,
  };
}
