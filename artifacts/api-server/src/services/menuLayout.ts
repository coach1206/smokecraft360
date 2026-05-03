/**
 * Menu Layout Engine — orders items by expected revenue contribution.
 *
 * Pure function. The caller is responsible for providing `popularity`
 * (raw order count over the period) and `conversionRate` (0..1, view→order).
 * We weight margin × popularity × conversion so high-margin slow-movers
 * don't drown out high-volume crowd-pleasers.
 *
 * Sold-out items are pushed to the bottom but not removed — staff still
 * need to see them to know what to restock. Frontend can choose to hide.
 *
 * Scoring is intentionally simple and explainable; the goal is an
 * auditable layout that an operator can sanity-check, not a black box.
 */

import { calculateProfit } from "./profitEngine";

export interface LayoutCandidate {
  id:              string;
  name:            string;
  priceCents:      number;
  costCents?:      number | null;
  /** Raw order count over the scoring window. Default 0. */
  popularity?:     number;
  /** view → order rate, 0..1. Default 0. */
  conversionRate?: number;
  available?:      boolean;
}

export interface LayoutResult extends LayoutCandidate {
  marginRatio: number;
  score:       number;
  reason:      string;
}

/* Weights chosen so a typical "high margin / low volume" item and a
 * "low margin / high volume" item end up in roughly the same band, with
 * conversion as the tiebreaker. Tunable but documented per the brief. */
const W_MARGIN     = 50;
const W_POPULARITY = 1;
const W_CONVERSION = 30;
const SOLD_OUT_PENALTY = 10_000;

export function optimizeMenuLayout(items: LayoutCandidate[]): LayoutResult[] {
  return items
    .map((item): LayoutResult => {
      const profit       = calculateProfit({ priceCents: item.priceCents, costCents: item.costCents });
      const marginRatio  = profit?.marginRatio ?? 0;
      const popularity   = Math.max(0, item.popularity     ?? 0);
      const conversion   = Math.max(0, Math.min(1, item.conversionRate ?? 0));

      let score = (marginRatio * W_MARGIN)
                + (popularity  * W_POPULARITY)
                + (conversion  * W_CONVERSION);

      const soldOut = item.available === false;
      if (soldOut) score -= SOLD_OUT_PENALTY;

      const reason = soldOut
        ? "sold-out"
        : marginRatio > 0.5 && popularity > 5 ? "high-margin & popular"
        : marginRatio > 0.5                   ? "high-margin"
        : popularity > 10                     ? "crowd-favorite"
        : conversion > 0.3                    ? "high-converting"
        : "baseline";

      return { ...item, marginRatio, score, reason };
    })
    .sort((a, b) => b.score - a.score);
}
