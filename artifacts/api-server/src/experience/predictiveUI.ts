/**
 * predictiveUI — predicts next user action and pre-fetches / pre-renders
 * relevant UI state for zero-latency transitions.
 */

import { logger } from "../lib/logger";
import { pool }   from "@workspace/db";

export type UIScreen =
  | "swipe"    | "recommend" | "cart"     | "receipt"
  | "profile"  | "loyalty"   | "ambient"  | "menu"
  | "pos"      | "analytics" | "settings";

export interface PredictedTransition {
  fromScreen: UIScreen;
  toScreen:   UIScreen;
  probability: number;
  triggerContext: string;
  prefetchHints: string[];
}

// Transition probability matrices learned from session data
const TRANSITION_MATRIX: Record<UIScreen, Array<[UIScreen, number]>> = {
  swipe:     [["recommend", 0.7], ["cart", 0.15], ["profile", 0.1], ["menu", 0.05]],
  recommend: [["cart", 0.6],      ["swipe", 0.25], ["menu", 0.1],  ["profile", 0.05]],
  cart:      [["receipt", 0.55],  ["menu", 0.25],  ["swipe", 0.15], ["loyalty", 0.05]],
  receipt:   [["loyalty", 0.4],   ["menu", 0.35],  ["swipe", 0.2],  ["profile", 0.05]],
  menu:      [["swipe", 0.5],     ["cart", 0.3],   ["pos", 0.15],   ["analytics", 0.05]],
  profile:   [["loyalty", 0.5],   ["swipe", 0.3],  ["settings", 0.2]],
  loyalty:   [["swipe", 0.5],     ["menu", 0.3],   ["profile", 0.2]],
  ambient:   [["analytics", 0.5], ["menu", 0.3],   ["settings", 0.2]],
  pos:       [["cart", 0.5],      ["menu", 0.3],   ["analytics", 0.2]],
  analytics: [["ambient", 0.4],   ["pos", 0.35],   ["settings", 0.25]],
  settings:  [["analytics", 0.5], ["ambient", 0.3], ["pos", 0.2]],
};

const PREFETCH_MAP: Record<UIScreen, string[]> = {
  recommend: ["/api/ai/recommendations", "/api/products"],
  cart:      ["/api/inventory/check",    "/api/loyalty/balance"],
  receipt:   ["/api/receipts/generate",  "/api/loyalty/award"],
  swipe:     ["/api/products/swipe",     "/api/craft-sessions"],
  loyalty:   ["/api/loyalty/balance",    "/api/loyalty/history"],
  profile:   ["/api/users/me",           "/api/loyalty/history"],
  analytics: ["/api/analytics/swipe-intelligence"],
  pos:       ["/api/products",           "/api/venue-inventories"],
  ambient:   ["/api/intelligence/ambient"],
  menu:      ["/api/products"],
  settings:  [],
};

export function predictNextScreen(
  currentScreen: UIScreen,
  sessionContext?: { loyaltyTier?: number; cartSize?: number },
): PredictedTransition | null {
  const transitions = TRANSITION_MATRIX[currentScreen];
  if (!transitions?.length) return null;

  // Adjust probabilities based on context
  let adjusted = [...transitions];
  if (sessionContext?.cartSize && sessionContext.cartSize > 0) {
    // Boost checkout probability when cart has items
    adjusted = adjusted.map(([screen, prob]) =>
      screen === "cart" || screen === "receipt" ? [screen, Math.min(0.9, prob * 1.3)] : [screen, prob * 0.9]
    ) as Array<[UIScreen, number]>;
  }

  // Sort by probability
  adjusted.sort((a, b) => b[1] - a[1]);
  const [toScreen, probability] = adjusted[0];

  return {
    fromScreen:    currentScreen,
    toScreen,
    probability,
    triggerContext: sessionContext ? JSON.stringify(sessionContext) : "default",
    prefetchHints: PREFETCH_MAP[toScreen] ?? [],
  };
}

export async function updateTransitionModel(
  venueId: string,
  fromScreen: UIScreen,
  toScreen:   UIScreen,
): Promise<void> {
  // Log for future batch learning
  await pool.query(
    `INSERT INTO operational_snapshots (type, venue_id, data)
     VALUES ('ui_transition', $1, $2::jsonb)`,
    [venueId, JSON.stringify({ from: fromScreen, to: toScreen, ts: Date.now() })],
  ).catch(() => {});
}

export function getTopPredictions(screen: UIScreen, n = 3): PredictedTransition[] {
  const transitions = TRANSITION_MATRIX[screen] ?? [];
  return transitions.slice(0, n).map(([toScreen, probability]) => ({
    fromScreen: screen,
    toScreen,
    probability,
    triggerContext: "matrix",
    prefetchHints:  PREFETCH_MAP[toScreen] ?? [],
  }));
}
