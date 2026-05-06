/**
 * revenueBrain — revenue-aware scoring for recommendations.
 *
 * Formula (v2):
 *   40% taste match    — tag overlap with user memory
 *   25% margin         — product margin %
 *   15% stock          — hard-block at 0, strong penalty below threshold
 *   10% reliability    — vendor reliability (< 60 = soft penalty)
 *   10% premium boost  — price above average = stronger boost
 *
 * Hard rules:
 *   stock = 0          → null (never recommend)
 *   stock < threshold  → −25 stock score penalty
 *   reliability < 60   → −10 soft penalty applied to reliabilityScore
 *   margin high        → boosted marginScore
 */

import type { TasteProfile } from "./memoryBrain";

export interface InventoryCandidate {
  id:                 string;
  name:               string;
  image?:             string | null;
  tags:               string[];
  costCents?:         number | null;
  priceCents?:        number | null;
  quantity?:          number | null;
  lowStockThreshold?: number;
  vendorReliability?: number;   // 0-100
  category?:          string;
  description?:       string;
}

export interface ScoredRecommendation {
  item:          InventoryCandidate;
  score:         number;
  reason:        string;
  revenueReason: string;       // internal (admin analytics only)
  tasteMatch:    number;       // 0-100
  marginPct:     number;
  stockStatus:   "ok" | "low" | "out";
  pairingNote?:  string;
}

const AVERAGE_PRICE_CENTS     = 2500;   // $25 reference point
const LOW_RELIABILITY_CUTOFF  = 60;     // below this = soft penalty
const RELIABILITY_PENALTY     = 10;     // deducted from reliability score

export function scoreRevenueOpportunity(
  item: InventoryCandidate,
  tasteProfile: TasteProfile,
): ScoredRecommendation | null {
  const qty = item.quantity ?? 999;

  // ── Hard block: out of stock ──────────────────────────────────────────────
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

  // ── Stock score (−25 hard penalty below threshold, normal = 0) ────────────
  const threshold = item.lowStockThreshold ?? 5;
  const stockStatus: "ok" | "low" | "out" =
    qty === 0 ? "out" : qty < threshold ? "low" : "ok";
  const stockScore = stockStatus === "ok" ? 0 : stockStatus === "low" ? -25 : -50;

  // ── Reliability score (0-20, soft penalty < 60) ───────────────────────────
  const reliability     = item.vendorReliability ?? 80;
  const reliabilityBase = reliability / 5;
  const reliabilityScore = reliability < LOW_RELIABILITY_CUTOFF
    ? Math.max(0, reliabilityBase - RELIABILITY_PENALTY)
    : reliabilityBase;

  // ── Premium boost (0-20, stronger than before) ────────────────────────────
  const premiumBoost = price > AVERAGE_PRICE_CENTS
    ? Math.min(20, Math.round(((price - AVERAGE_PRICE_CENTS) / AVERAGE_PRICE_CENTS) * 20))
    : 0;

  // ── Final composite score (v2 formula) ────────────────────────────────────
  const raw = Math.round(
    tasteScore       * 0.40 +
    marginScore      * 0.25 +
    stockScore       * 0.15 +
    reliabilityScore * 0.10 +
    premiumBoost     * 0.10
  );
  const score = Math.max(0, Math.min(100, raw));

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
    `stock=${stockStatus}(qty=${qty})`,
    `reliability=${reliability}${reliability < LOW_RELIABILITY_CUTOFF ? "(penalised)" : ""}`,
    premiumBoost ? `premium_boost=${premiumBoost}` : "",
  ].filter(Boolean).join(", ");

  return {
    item,
    score,
    reason,
    revenueReason,
    tasteMatch:  Math.round(tasteScore),
    marginPct,
    stockStatus,
    pairingNote: buildPairingNote(item, tasteProfile),
  };
}

function buildPairingNote(item: InventoryCandidate, profile: TasteProfile): string | undefined {
  const tags = item.tags.map(t => t.toLowerCase());
  if (tags.includes("smoky") || tags.includes("bold"))       return "Pairs well with dark chocolate or aged cheese";
  if (tags.includes("oak")   || tags.includes("vanilla"))    return "Try alongside smoked nuts or charcuterie";
  if (tags.includes("hoppy") || tags.includes("crisp"))      return "Excellent with light appetizers or salted snacks";
  if (tags.includes("mint")  || tags.includes("tropical"))   return "Best enjoyed in a relaxed social setting";
  if (tags.includes("peat")  || tags.includes("peated"))     return "Complement with a rich espresso or dark truffle";
  if (tags.includes("citrus")|| tags.includes("bright"))     return "Light and refreshing with seafood or fresh herbs";
  if (profile.topTags.includes("sweet"))                     return "Complements dessert or fruit-forward starters";
  return undefined;
}

export function rankRecommendations(
  candidates: InventoryCandidate[],
  tasteProfile: TasteProfile,
  limit = 3,
): ScoredRecommendation[] {
  return candidates
    .map(c  => scoreRevenueOpportunity(c, tasteProfile))
    .filter((r): r is ScoredRecommendation => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
