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

  // ── Titan V profiles ──────────────────────────────────────────────────────

  /** Dual-pulse "Tactile Confirmed" — action success feedback */
  confirm: [20, 30, 20] as number[],

  /** Heavy singular "Mechanical Disconnect" — sovereign kill-switch */
  sovereign: 100,

  /** Material weight thud — weighted slider / toggle engagement */
  thud: 40,

  /** Deep "Engage" thud — sovereign command authorized (Titan V 5.1) */
  heavy: 150,

  /** Aggressive triple-buzz "Reject" — insufficient hold / unauthorized (Titan V 5.1) */
  error: [50, 10, 50, 10, 50] as number[],
} as const;
