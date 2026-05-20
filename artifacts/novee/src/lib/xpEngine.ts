import { DifficultyTier } from "../context/GuestProfileContext";

export type MeritAction = 
  | "quiz_correct" 
  | "quiz_wrong" 
  | "blend_perfect" 
  | "blend_poor" 
  | "pairing_perfect" 
  | "pairing_poor";

export function calcXP(
  cigar: boolean,
  drink: boolean,
  food: boolean,
  twodrinks: boolean,
  twocigars: boolean
): number {
  let xp = 0;
  if (cigar) xp += 5;
  if (drink) xp += 5; // +drink: total +10
  if (food) xp += 10; // +drink+food: total +20
  if (twodrinks) xp += 5;
  if (twocigars) xp += 8;
  return xp;
}

export function calcMeritDelta(action: MeritAction, tier: DifficultyTier): number {
  const multipliers: Record<DifficultyTier, number> = {
    beginner: 1,
    apprentice: 1.5,
    blender: 2,
    master: 2.5,
    architect: 3,
  };

  const m = multipliers[tier];

  switch (action) {
    case "quiz_correct":
      return Math.round(1 * m);
    case "quiz_wrong":
      return -Math.round(2 * m);
    case "blend_perfect":
      return 5;
    case "blend_poor":
      return -3;
    case "pairing_perfect":
      return 15;
    case "pairing_poor":
      return -5;
    default:
      return 0;
  }
}

export function calcDifficultyTier(totalMerit: number): DifficultyTier {
  if (totalMerit >= 100) return "architect";
  if (totalMerit >= 75) return "master";
  if (totalMerit >= 50) return "blender";
  if (totalMerit >= 25) return "apprentice";
  return "beginner";
}

export function shouldScaleUp(sessionHistory: any[]): boolean {
  // Logic based on session history could be added here
  return false;
}

export function emotionalFeedbackClass(delta: number): "gain-big" | "gain-small" | "loss-big" | "loss-small" {
  if (delta >= 10) return "gain-big";
  if (delta > 0) return "gain-small";
  if (delta <= -5) return "loss-big";
  return "loss-small";
}
