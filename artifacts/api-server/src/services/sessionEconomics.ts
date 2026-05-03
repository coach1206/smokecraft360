/**
 * sessionEconomics — pure, deterministic per-session revenue forecasting and
 * dynamic pricing helpers. No DB writes, no randomness, fully unit-testable.
 *
 * Two functions:
 *
 *  predictSessionRevenue(session)
 *    Given the in-session signals (basePrice, interactions, optional
 *    timeOnScreen) returns expectedRevenue and upsellProbability. Used
 *    to surface "expected pour-attach value" in admin dashboards and to
 *    drive the timed PourCraft upsell on the kiosk.
 *
 *  getSmartPrice(basePrice, context)
 *    Returns a markup-adjusted display price WITHIN safe bounds (-8% to +12%).
 *    NEVER mutates the supplier base price (priceCents in venue_inventory) —
 *    callers receive a separate dynamicPriceCents to render. Adjustments are
 *    pure context-driven heuristics (intent signal: interactions × dwell time);
 *    no randomness, fully deterministic.
 *
 * Cap rationale: ±8/12% is the brief's locked guardrail. Going beyond risks
 * looking like price-gouging; going below would make the system pointless.
 */

export interface SessionSignals {
  /** Supplier base price in cents (from venue_inventory.priceCents). */
  basePriceCents: number;
  /** Count of meaningful interactions in this session (swipes, card picks). */
  interactions:   number;
  /** Optional dwell time in milliseconds. */
  timeOnScreen?:  number;
}

export interface RevenueForecast {
  /** Expected total revenue including upsell (cents, integer). */
  expectedRevenueCents: number;
  /** Probability (0–1) that an upsell will close. */
  upsellProbability:    number;
  /** Average upsell value used in the calc (cents, integer). */
  avgUpsellCents:       number;
}

/**
 * Average upsell ticket size (cents). $18 placeholder per brief; replace
 * with the rolling average of order_items.upsell_value when checkout
 * analytics are available.
 */
const DEFAULT_AVG_UPSELL_CENTS = 1800;

/** Round half-cent to nearest integer cent. */
function roundCents(n: number): number {
  return Math.round(n);
}

export function predictSessionRevenue(
  session:          SessionSignals,
  avgUpsellCents:   number = DEFAULT_AVG_UPSELL_CENTS,
): RevenueForecast {
  const base = Math.max(0, session.basePriceCents | 0);

  // Higher interaction count = warmer intent = more likely to add the pour.
  // Buckets sourced from brief; fully deterministic.
  const upsellProbability =
    session.interactions > 2 ? 0.55 :
    session.interactions > 1 ? 0.35 :
                               0.15;

  const expected = base + upsellProbability * avgUpsellCents;

  return {
    expectedRevenueCents: roundCents(expected),
    upsellProbability,
    avgUpsellCents,
  };
}

export interface SmartPriceContext {
  /** Count of meaningful interactions in this session. */
  interactions: number;
  /** Dwell time on the result screen in ms (optional). */
  timeOnScreen?: number;
}

export interface SmartPrice {
  /** Final display price in cents (integer). */
  finalPriceCents: number;
  /** Adjustment percent applied (-0.08 … +0.12). */
  adjustment:      number;
  /** Original base price (cents) — never mutated, returned for diff display. */
  basePriceCents:  number;
}

/** Hard caps on dynamic adjustment per brief. */
const ADJ_MAX = 0.12;
const ADJ_MIN = -0.08;

export function getSmartPrice(
  basePriceCents: number,
  context:        SmartPriceContext,
): SmartPrice {
  const base = Math.max(0, basePriceCents | 0);
  let adjustment = 0;

  // High intent → allow modest premium.
  if (context.interactions > 2 && (context.timeOnScreen ?? 0) > 1500) {
    adjustment += 0.08;
  }
  // Cold session → soften to convert.
  if (context.interactions === 0) {
    adjustment -= 0.05;
  }

  // Hard cap — defensive, in case future tweaks add more rules.
  if (adjustment > ADJ_MAX) adjustment = ADJ_MAX;
  if (adjustment < ADJ_MIN) adjustment = ADJ_MIN;

  return {
    finalPriceCents: roundCents(base * (1 + adjustment)),
    adjustment,
    basePriceCents:  base,
  };
}
