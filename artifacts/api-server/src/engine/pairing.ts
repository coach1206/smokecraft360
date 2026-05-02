import { Product, ScoredProduct } from "./types";

/**
 * Finds the best cross-category pairings for a set of recommended products.
 *
 * Strategy: collect all pairingTags from the recommendations, then score
 * candidates in the pairing pool by how many of those tags appear in their
 * own flavorNotes or name (case-insensitive substring match). Return the
 * top N unique results.
 *
 * This keeps pairing logic decoupled from the main scorer so each can evolve
 * independently (e.g. more sophisticated NLP matching later).
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
  // Build a unified set of pairing keywords from all recommended products
  const pairingKeywords = new Set<string>(
    recommendations.flatMap((r) =>
      r.pairingTags.map((tag) => tag.toLowerCase()),
    ),
  );

  if (pairingKeywords.size === 0) {
    return [];
  }

  // Score each candidate in the pairing pool
  const scored: ScoredProduct[] = pairingPool.map((candidate) => {
    let score = 0;

    // Check each pairing keyword against the candidate's flavor notes
    for (const keyword of pairingKeywords) {
      for (const note of candidate.flavorNotes) {
        if (note.toLowerCase().includes(keyword) || keyword.includes(note.toLowerCase())) {
          score += 1;
        }
      }
      // Also match against the product name for broad descriptors like "bourbon"
      if (candidate.name.toLowerCase().includes(keyword)) {
        score += 2;
      }
    }

    // Bonus: match pairing tags between recommendation and candidate
    for (const keyword of pairingKeywords) {
      for (const tag of candidate.pairingTags) {
        if (tag.toLowerCase().includes(keyword) || keyword.includes(tag.toLowerCase())) {
          score += 1;
        }
      }
    }

    return { ...candidate, score };
  });

  return scored
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
