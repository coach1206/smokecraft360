import { Product, ScoredProduct } from "./types";

/**
 * Semantic pairing rules.
 *
 * Maps a product trait (derived from strength range or flavor note) to
 * descriptors that make a good pairing in the complementary category.
 *
 * Rules are evaluated in order; all matching rules contribute to the score.
 *
 * Format:
 *   { match: fn(product) => bool, keywords: string[], points: number }
 *
 * To add new rules, push entries here — no other logic needs to change.
 */
const PAIRING_RULES: Array<{
  match: (p: Product) => boolean;
  keywords: string[];
  points: number;
}> = [
  // --- Strength-based rules ---
  {
    // Strong cigar → bold, peaty, or full-bodied whiskey
    match: (p) => p.category === "cigar" && p.strength >= 4,
    keywords: ["bold", "peaty", "rye", "scotch", "full-body", "smoky", "intense"],
    points: 3,
  },
  {
    // Medium cigar → bourbon or smooth whiskey
    match: (p) => p.category === "cigar" && p.strength === 3,
    keywords: ["bourbon", "medium-body", "vanilla", "oak", "smooth"],
    points: 2,
  },
  {
    // Mild cigar → approachable, sweet spirits
    match: (p) => p.category === "cigar" && p.strength <= 2,
    keywords: ["mild", "light", "rum", "cognac", "sweet", "fruity", "caramel"],
    points: 3,
  },
  {
    // Strong alcohol → full-body, bold cigars
    match: (p) => p.category === "alcohol" && p.strength >= 4,
    keywords: ["full-body", "bold", "leather", "dark", "earthy", "intense"],
    points: 3,
  },
  {
    // Mild/medium alcohol → mild or medium cigars
    match: (p) => p.category === "alcohol" && p.strength <= 3,
    keywords: ["mild", "medium-body", "sweet", "creamy", "smooth", "nutty"],
    points: 2,
  },

  // --- Flavor-based rules ---
  {
    // Sweet cigar → smooth bourbon, rum, or cognac
    match: (p) => p.category === "cigar" && p.flavorNotes.some((n) => ["sweet", "honey", "cream", "nutty"].includes(n)),
    keywords: ["bourbon", "rum", "cognac", "sweet", "caramel", "vanilla", "fruity"],
    points: 2,
  },
  {
    // Smoky/earthy cigar → peaty scotch or mezcal
    match: (p) => p.category === "cigar" && p.flavorNotes.some((n) => ["smoky", "earthy", "leather"].includes(n)),
    keywords: ["smoky", "peaty", "scotch", "rye", "mezcal", "maritime"],
    points: 2,
  },
  {
    // Spicy cigar → rye or bold whiskey
    match: (p) => p.category === "cigar" && p.flavorNotes.some((n) => ["spicy", "pepper"].includes(n)),
    keywords: ["rye", "spicy", "pepper", "bold", "scotch"],
    points: 2,
  },
  {
    // Sweet/vanilla spirit → sweet or nutty cigar
    match: (p) => p.category === "alcohol" && p.flavorNotes.some((n) => ["vanilla", "caramel", "sweet", "fruity"].includes(n)),
    keywords: ["sweet", "nutty", "mild", "honey", "cream", "floral"],
    points: 2,
  },
  {
    // Smoky/peaty spirit → earthy or strong cigar
    match: (p) => p.category === "alcohol" && p.flavorNotes.some((n) => ["smoky", "peaty", "maritime"].includes(n)),
    keywords: ["earthy", "full-body", "leather", "dark", "bold", "intense"],
    points: 2,
  },

  // --- Beer ↔ cigar rules (BrewCraft) ---
  // Beers reuse the same flavor vocabulary as spirits, so the rules mirror
  // the alcohol set above but stay scoped to category === "beer" for clarity
  // and so future tuning can diverge per category.
  {
    // Light/sessionable beer → mild, sweet, creamy cigars
    match: (p) => p.category === "beer" && p.strength <= 2,
    keywords: ["mild", "medium-body", "sweet", "creamy", "smooth", "nutty"],
    points: 2,
  },
  {
    // Hoppy / spicy / citrus beer (IPAs, pale ales) → medium spicy cigars
    match: (p) => p.category === "beer" && p.flavorNotes.some((n) => ["citrus", "spicy", "pepper", "floral", "fruity"].includes(n)),
    keywords: ["spicy", "pepper", "medium-body", "habano", "cedar"],
    points: 2,
  },
  {
    // Dark/roasted beer (stouts, porters) → full-body, earthy, dark cigars
    match: (p) => p.category === "beer" && p.flavorNotes.some((n) => ["dark-chocolate", "cocoa", "smoky"].includes(n)),
    keywords: ["earthy", "full-body", "leather", "dark", "bold", "intense", "maduro"],
    points: 3,
  },
  {
    // Strong beer (imperial / barrel-aged) → bold cigars
    match: (p) => p.category === "beer" && p.strength >= 4,
    keywords: ["full-body", "bold", "leather", "dark", "earthy", "intense"],
    points: 3,
  },

  // --- Cigar → beer (reverse direction, used by BrewCraft results) ---
  {
    // Mild cigar → light, crisp lagers
    match: (p) => p.category === "cigar" && p.strength <= 2,
    keywords: ["light", "crisp", "lager", "wheat", "citrus", "pilsner"],
    points: 2,
  },
  {
    // Medium cigar → amber lagers, balanced ales
    match: (p) => p.category === "cigar" && p.strength === 3,
    keywords: ["amber", "lager", "toasted", "caramel", "nutty", "balanced"],
    points: 2,
  },
  {
    // Full-body / smoky / earthy cigar → stouts, porters, dark beers
    match: (p) => p.category === "cigar" && (p.strength >= 4 || p.flavorNotes.some((n) => ["smoky", "earthy", "leather"].includes(n))),
    keywords: ["stout", "porter", "dark-chocolate", "cocoa", "roasted", "smoky"],
    points: 3,
  },
  {
    // Spicy / pepper cigar → hoppy IPAs and pale ales
    match: (p) => p.category === "cigar" && p.flavorNotes.some((n) => ["spicy", "pepper"].includes(n)),
    keywords: ["ipa", "hoppy", "citrus", "pale-ale", "spicy", "pepper"],
    points: 2,
  },
];

/**
 * Scores a pairing candidate against a set of active keywords.
 * Checks candidate name, flavor notes, and pairing tags for keyword overlap.
 */
function scorePairingCandidate(candidate: Product, activeKeywords: Set<string>): number {
  let score = 0;

  for (const keyword of activeKeywords) {
    // Name match (broad, e.g. "bourbon" in product name)
    if (candidate.name.toLowerCase().includes(keyword)) {
      score += 2;
    }
    // Flavor note match
    for (const note of candidate.flavorNotes) {
      if (note.toLowerCase().includes(keyword) || keyword.includes(note.toLowerCase())) {
        score += 1;
      }
    }
    // Pairing tag match
    for (const tag of candidate.pairingTags) {
      if (tag.toLowerCase().includes(keyword) || keyword.includes(tag.toLowerCase())) {
        score += 1;
      }
    }
  }

  return score;
}

/**
 * Finds the best cross-category pairings using semantic rule-based logic.
 *
 * Strategy:
 *  1. Apply all matching pairing rules against the recommended products
 *     to build a weighted keyword set.
 *  2. Score each candidate in the pairing pool against those keywords.
 *  3. Return the top N unique results.
 *
 * To add new pairing logic, add entries to PAIRING_RULES above.
 *
 * @param recommendations  The top-ranked products from the primary category.
 * @param pairingPool      Products from the complementary category.
 * @param topN             Maximum number of pairings to return.
 * @returns                Ranked pairing products with scores.
 */
export function findPairings(
  recommendations: ScoredProduct[],
  pairingPool: Product[],
  topN: number,
): ScoredProduct[] {
  if (pairingPool.length === 0 || recommendations.length === 0) return [];

  // Build a weighted keyword map from all matching rules
  const keywordWeights = new Map<string, number>();

  for (const rec of recommendations) {
    for (const rule of PAIRING_RULES) {
      if (rule.match(rec)) {
        for (const keyword of rule.keywords) {
          keywordWeights.set(keyword, (keywordWeights.get(keyword) ?? 0) + rule.points);
        }
      }
    }
  }

  if (keywordWeights.size === 0) return [];

  const activeKeywords = new Set(keywordWeights.keys());

  // Score each pairing candidate
  const scored: ScoredProduct[] = pairingPool.map((candidate) => {
    const baseScore = scorePairingCandidate(candidate, activeKeywords);

    // Apply keyword weight multiplier for heavier-weighted keywords
    let weightedScore = 0;
    for (const keyword of activeKeywords) {
      const weight = keywordWeights.get(keyword) ?? 1;
      const candidateText = [
        candidate.name,
        ...candidate.flavorNotes,
        ...candidate.pairingTags,
      ].join(" ").toLowerCase();

      if (candidateText.includes(keyword)) {
        weightedScore += weight;
      }
    }

    return { ...candidate, score: baseScore + weightedScore, boostApplied: 0 };
  });

  return scored
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
