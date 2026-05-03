/**
 * Tablet/phone haptic feedback wrapper.
 *
 * Why this exists:
 * - On Android Chrome (and most kiosk tablets) the Vibration API is the only
 *   tactile channel we have. iOS Safari ignores it silently — that's fine,
 *   the call is a no-op there, no error.
 * - All durations are short, single-pulse buzzes tuned for kiosk use:
 *   noticeable but never startling, never long enough to feel like an error.
 * - Wrapped in try/catch because some embedded WebViews throw on
 *   `navigator.vibrate` even when the property is defined.
 *
 * Usage:
 *   import { haptic } from "../utils/haptics";
 *   onClick={() => { haptic.tap(); doThing(); }}
 */

type HapticPattern = "tap" | "select" | "swipe" | "success" | "warn";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap:     12,           // light card / button press
  select:  25,           // committing a choice (category, flavor pick)
  swipe:   18,           // swipe completion on the card deck
  success: [20, 40, 30], // saved blend, order placed
  warn:    [40, 60],     // upsell required, locked feature
};

function fire(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate !== "function") return;
  try { nav.vibrate(pattern); } catch { /* swallow — never let haptics break UX */ }
}

export const haptic = {
  tap:     (): void => fire(PATTERNS.tap),
  select:  (): void => fire(PATTERNS.select),
  swipe:   (): void => fire(PATTERNS.swipe),
  success: (): void => fire(PATTERNS.success),
  warn:    (): void => fire(PATTERNS.warn),
};
