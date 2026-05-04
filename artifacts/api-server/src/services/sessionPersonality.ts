import { getTasteProfile, type TasteProfile } from "./tasteProfile";
import { logger } from "../lib/logger";

export type PersonalityArchetype =
  | "Bold Dominant"
  | "Smooth Operator"
  | "Flavor Explorer"
  | "Social Connoisseur"
  | "Balanced Navigator"
  | "Mellow Drifter";

export interface SessionPersonality {
  archetype: PersonalityArchetype;
  tagline: string;
  traits: string[];
  confidence: number;
}

interface ChoiceSignals {
  mood?: string;
  strength?: number;
  flavorPreferences?: string[];
  category?: string;
  interactions?: number;
}

const HEAVY_FLAVORS = new Set([
  "smoky", "peaty", "spicy", "bold", "earthy", "roasted", "charred", "pepper",
]);

const SMOOTH_FLAVORS = new Set([
  "smooth", "creamy", "vanilla", "caramel", "honey", "mellow", "buttery", "sweet",
]);

const EXPLORER_FLAVORS = new Set([
  "citrus", "floral", "herbal", "tropical", "fruity", "exotic", "cedar", "nutty",
]);

function classifyFromChoices(choices: ChoiceSignals): SessionPersonality {
  const str = choices.strength ?? 3;
  const mood = (choices.mood ?? "").toLowerCase();
  const flavors = (choices.flavorPreferences ?? []).map((f) => f.toLowerCase());

  let boldScore = 0;
  let smoothScore = 0;
  let explorerScore = 0;
  let socialScore = 0;

  if (str >= 4) boldScore += 2;
  if (str >= 5) boldScore += 1;
  if (str <= 2) smoothScore += 2;
  if (str === 3) smoothScore += 1;

  for (const f of flavors) {
    if (HEAVY_FLAVORS.has(f)) boldScore += 1;
    if (SMOOTH_FLAVORS.has(f)) smoothScore += 1;
    if (EXPLORER_FLAVORS.has(f)) explorerScore += 1;
  }

  if (["social", "celebration", "party", "group"].includes(mood)) socialScore += 3;
  if (["adventurous", "curious", "exploring"].includes(mood)) explorerScore += 2;
  if (["relaxed", "chill", "mellow"].includes(mood)) smoothScore += 1;
  if (["bold", "intense", "powerful"].includes(mood)) boldScore += 2;

  const uniqueFlavors = new Set(flavors).size;
  if (uniqueFlavors >= 3) explorerScore += 1;

  const scores: [PersonalityArchetype, number][] = [
    ["Bold Dominant", boldScore],
    ["Smooth Operator", smoothScore],
    ["Flavor Explorer", explorerScore],
    ["Social Connoisseur", socialScore],
  ];

  scores.sort((a, b) => b[1] - a[1]);
  const topScore = scores[0]![1];

  if (topScore === 0) {
    return {
      archetype: "Balanced Navigator",
      tagline: "You let the moment guide you — open to anything, master of balance.",
      traits: ["adaptable", "open-minded", "well-rounded"],
      confidence: 0.4,
    };
  }

  const archetype = scores[0]![0];
  const confidence = Math.min(0.95, 0.5 + topScore * 0.08);

  return { archetype, ...archetypeDetail(archetype), confidence };
}

function archetypeDetail(a: PersonalityArchetype): { tagline: string; traits: string[] } {
  switch (a) {
    case "Bold Dominant":
      return {
        tagline: "You go full throttle — intense flavors, no compromises.",
        traits: ["intense", "decisive", "powerful"],
      };
    case "Smooth Operator":
      return {
        tagline: "Effortless taste — you know what's good without trying too hard.",
        traits: ["refined", "relaxed", "sophisticated"],
      };
    case "Flavor Explorer":
      return {
        tagline: "Always chasing the next discovery — your palate never sits still.",
        traits: ["curious", "adventurous", "creative"],
      };
    case "Social Connoisseur":
      return {
        tagline: "The experience is better shared — you elevate the room.",
        traits: ["charismatic", "generous", "engaging"],
      };
    case "Balanced Navigator":
      return {
        tagline: "You let the moment guide you — open to anything, master of balance.",
        traits: ["adaptable", "open-minded", "well-rounded"],
      };
    case "Mellow Drifter":
      return {
        tagline: "Low key, high taste — you find gold where others overlook.",
        traits: ["laid-back", "intuitive", "understated"],
      };
  }
}

function enrichWithHistory(
  base: SessionPersonality,
  profile: TasteProfile,
): SessionPersonality {
  if (profile.sampleCount === 0) return base;

  const topFlavors = Object.entries(profile.flavor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);

  const explorerBonus = Object.keys(profile.flavor).length >= 6;
  if (explorerBonus && base.archetype !== "Flavor Explorer") {
    return {
      ...base,
      traits: [...base.traits, "seasoned palate"],
      confidence: Math.min(0.95, base.confidence + 0.05),
    };
  }

  if (topFlavors.length > 0 && !base.traits.includes(topFlavors[0]!)) {
    return {
      ...base,
      traits: [...base.traits, `${topFlavors[0]} lover`],
      confidence: Math.min(0.95, base.confidence + 0.03),
    };
  }

  return base;
}

export async function generateSessionPersonality(
  choices: ChoiceSignals,
  userId?: string,
): Promise<SessionPersonality> {
  const base = classifyFromChoices(choices);

  if (!userId) return base;

  try {
    const profile = await getTasteProfile(userId);
    return enrichWithHistory(base, profile);
  } catch (err) {
    logger.warn({ err }, "personality: taste profile lookup failed, using session-only");
    return base;
  }
}
