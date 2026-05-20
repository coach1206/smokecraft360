import { DifficultyTier } from "../contexts/NoveeGuestProfileContext";

export type FlavorProfile = {
  dominantNotes: string[];
  body: "mild" | "medium" | "full";
  strength: "mild" | "medium" | "full";
};

export type DrinkOption = {
  id: string;
  name: string;
  flavorNotes: string[];
  category: "rum" | "whiskey" | "bourbon" | "cognac" | "wine" | "espresso" | "water" | "beer";
};

export type FoodOption = {
  id: string;
  name: string;
  category: "cheese" | "chocolate" | "charcuterie" | "nuts";
};

export type AffinityResult = {
  score: number;
  label: "HARMONIC" | "DYNAMIC" | "DISCORD";
  feedback: string;
};

export const DRINK_OPTIONS: DrinkOption[] = [
  { id: "rum_aged", name: "Aged Dark Rum", flavorNotes: ["molasses", "vanilla", "spice"], category: "rum" },
  { id: "whiskey_islay", name: "Islay Single Malt", flavorNotes: ["peat", "smoke", "sea salt"], category: "whiskey" },
  { id: "bourbon_rye", name: "High Rye Bourbon", flavorNotes: ["caramel", "baking spice", "oak"], category: "bourbon" },
  { id: "cognac_vsop", name: "VSOP Cognac", flavorNotes: ["dried fruit", "floral", "french oak"], category: "cognac" },
  { id: "wine_cabernet", name: "Cabernet Sauvignon", flavorNotes: ["blackberry", "tannin", "cedar"], category: "wine" },
  { id: "espresso_dark", name: "Double Espresso", flavorNotes: ["dark chocolate", "roasted", "bitter"], category: "espresso" },
  { id: "beer_stout", name: "Imperial Stout", flavorNotes: ["coffee", "chocolate", "creamy"], category: "beer" },
  { id: "water_sparkling", name: "Sparkling Mineral Water", flavorNotes: ["neutral", "crisp"], category: "water" },
];

export function calcPairingAffinity(
  blendProfile: FlavorProfile,
  drink: DrinkOption,
  food: FoodOption | null
): AffinityResult {
  let score = 70; // Base score

  // Matching dominant notes (Congruent)
  const matchingNotes = blendProfile.dominantNotes.filter(note => 
    drink.flavorNotes.includes(note)
  );
  score += matchingNotes.length * 10;

  // Body matching
  if (blendProfile.body === "full" && ["whiskey", "bourbon", "rum"].includes(drink.category)) score += 10;
  if (blendProfile.body === "mild" && ["wine", "water", "espresso"].includes(drink.category)) score += 5;

  // Contrast logic
  if (blendProfile.dominantNotes.includes("spice") && drink.flavorNotes.includes("vanilla")) score += 15; // Dynamic contrast

  // Food bonus/penalty
  if (food) {
    if (food.category === "chocolate" && drink.category === "rum") score += 10;
    if (food.category === "cheese" && drink.category === "wine") score += 10;
  }

  score = Math.min(100, Math.max(0, score));

  let label: AffinityResult["label"] = "DYNAMIC";
  if (score >= 85) label = "HARMONIC";
  else if (score < 60) label = "DISCORD";

  const feedback = label === "HARMONIC" 
    ? "The flavor profiles resonate in perfect synchronicity."
    : label === "DYNAMIC"
    ? "A bold interplay of contrasting notes creates a complex experience."
    : "The profiles clash, disrupting the intended ritual.";

  return { score, label, feedback };
}

export function getAffinityLabel(score: number): string {
  if (score >= 85) return "HARMONIC";
  if (score >= 60) return "DYNAMIC";
  return "DISCORD";
}

export function getPairingXP(score: number, hasFood: boolean): number {
  let xp = 5; // Base for cigar
  if (score >= 60) xp += 5; // Drink bonus
  if (hasFood) xp += 10; // Food bonus
  return xp;
}
