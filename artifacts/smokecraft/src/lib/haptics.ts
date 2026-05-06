/**
 * Axiom OS — Haptics Engine
 *
 * Thin wrapper around the Web Vibration API.
 * Silent no-op on browsers / desktop environments that don't support it.
 * No external dependencies — zero bundle impact.
 *
 * Usage:
 *   import { vibrate, HAPTIC } from "@/lib/haptics";
 *   vibrate(HAPTIC.rankUp);
 */

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined") return;
  if (!("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore — some browsers throw if vibration is blocked by policy
  }
}

/**
 * Named haptic presets.
 * Keep durations low so the feedback feels "precision hardware" not
 * a notification buzz.
 */
export const HAPTIC = {
  /** Lightweight tap — price ticker flip, button press */
  tap: 28,

  /** Double pulse — rank-up achievement */
  rankUp: [55, 28, 85] as number[],

  /** Heavy handoff sequence — patron → staff mode transition */
  handoff: [90, 45, 90, 45, 140] as number[],
} as const;
