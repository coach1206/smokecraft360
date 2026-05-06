/**
 * revenueBrain — revenue-aware scoring for recommendations.
 *
 * Scores each candidate item by blending:
 *   45% taste match (tag overlap with user memory)
 *   25% margin      (product margin %)
 *   15% stock       (above threshold = +20, zero = block, below = penalty)
 *   10% reliability (vendor reliability / 5)
 *    5% premium     (price > average → small boost)
 *
 * Returns a 0-100 score and a customer-safe reason string.
 */

import type { TasteProfile } from "./memoryBrain";

export interface InventoryCandidate {
  id:               string;
  name:             string;
  image?:           string | null;
  tags:             string[];
  costCents?:       number | null;
  priceCents?:      number | null;
  quantity?:        number | null;
  lowStockThreshold?: number;
  vendorReliability?: number;   // 0-100
  category?:        string;
  description?:     string;
}

export interface ScoredRecommendation {
  item:         InventoryCandidate;
  score:        number;
  reason:       string;
  revenueReason: string;         // internal (shown in admin analytics only)
  tasteMatch:   number;          // 0-100
  marginPct:    number;
  stockStatus:  "ok" | "low" | "out";
  pairingNote?: string;
}

const AVERAGE_PRICE_CENTS = 2500; // $25 reference point

export function scoreRevenueOpportunity(
  item: InventoryCandidate,
  tasteProfile: TasteProfile,
): ScoredRecommendation | null {
  const qty = item.quantity ?? 999;

  // Fully out-of-stock items are never recommended
  if (qty === 0) return null;

  // ── Taste score (0-100) ───────────────────────────────────────────────────
  const tagWeights = tasteProfile.tagWeights;
  const itemTags   = item.tags.map(t => t.toLowerCase());
  let tasteRaw = 0;
  for (const tag of itemTags) {
    tasteRaw += tagWeights[tag] ?? 0;
  }
  const tasteScore = itemTags.length
    ? Math.max(0, Math.min(100, 50 + tasteRaw * 2))
    : 50;

  // ── Margin score (0-100) ──────────────────────────────────────────────────
  const cost  = item.costCents  ?? 0;
  const price = item.priceCents ?? AVERAGE_PRICE_CENTS;
  const marginPct = price > 0 && cost > 0
    ? Math.round(((price - cost) / price) * 100)
    : 60; // assume 60% if unknown
  const marginScore = Math.min(100, marginPct);

  // ── Stock score ───────────────────────────────────────────────────────────
  const threshold  = item.lowStockThreshold ?? 5;
  const stockStatus: "ok" | "low" | "out" = qty === 0 ? "out"
    : qty < threshold ? "low"
    : "ok";
  const stockScore = stockStatus === "ok" ? 20 : stockStatus === "low" ? -10 : -30;

  // ── Reliability score (0-20) ──────────────────────────────────────────────
  const reliability = item.vendorReliability ?? 80;
  const reliabilityScore = reliability / 5;

  // ── Premium boost (0-10) ─────────────────────────────────────────────────
  const premiumBoost = price > AVERAGE_PRICE_CENTS ? 10 : 0;

  // ── Final composite score ─────────────────────────────────────────────────
  const score = Math.round(
    tasteScore    * 0.45 +
    marginScore   * 0.25 +
    stockScore    * 0.15 +
    reliabilityScore * 0.10 +
    premiumBoost  * 0.05
  );

  // ── Customer-friendly reason ──────────────────────────────────────────────
  const topMatchTags = itemTags.filter(t => (tagWeights[t] ?? 0) > 3).slice(0, 2);
  let reason = "Selected based on your craft profile";
  if (topMatchTags.length) {
    reason = `Chosen because it matches your ${topMatchTags.join(" and ")} preferences`;
  } else if (tasteProfile.topTags.length) {
    reason = `Recommended for your ${tasteProfile.topTags.slice(0, 2).join(", ")} taste profile`;
  }
  if (stockStatus === "low") reason += " — limited availability";

  // ── Internal revenue reason ───────────────────────────────────────────────
  const revenueReason = [
    `taste=${tasteScore}`,
    `margin=${marginPct}%`,
    `stock=${stockStatus}(${qty})`,
    `reliability=${reliability}`,
    premiumBoost ? "premium_boosted" : "",
  ].filter(Boolean).join(", ");

  const pairingNote = buildPairingNote(item, tasteProfile);

  return {
    item,
    score: Math.max(0, Math.min(100, score)),
    reason,
    revenueReason,
    tasteMatch: Math.round(tasteScore),
    marginPct,
    stockStatus,
    pairingNote,
  };
}

function buildPairingNote(item: InventoryCandidate, profile: TasteProfile): string | undefined {
  const tags = item.tags.map(t => t.toLowerCase());
  if (tags.includes("smoky") || tags.includes("bold"))     return "Pairs well with dark chocolate or aged cheese";
  if (tags.includes("oak") || tags.includes("vanilla"))    return "Try alongside smoked nuts or charcuterie";
  if (tags.includes("hoppy") || tags.includes("crisp"))    return "Excellent with light appetizers or salted snacks";
  if (tags.includes("mint") || tags.includes("tropical"))  return "Best enjoyed in a relaxed social setting";
  if (profile.topTags.includes("sweet"))                   return "Complements dessert or fruit-forward starters";
  return undefined;
}

export function rankRecommendations(
  candidates: InventoryCandidate[],
  tasteProfile: TasteProfile,
  limit = 3,
): ScoredRecommendation[] {
  const scored = candidates
    .map(c => scoreRevenueOpportunity(c, tasteProfile))
    .filter((r): r is ScoredRecommendation => r !== null)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}
