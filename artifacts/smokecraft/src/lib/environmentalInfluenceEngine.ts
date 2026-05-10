/**
 * EnvironmentalInfluenceEngine — Invisible Guest Guidance + Sovereign Lighting Sync
 *
 * Two responsibilities:
 *   1. Hesitation detection: if a guest has been on a sensory card screen for
 *      > HESITATION_THRESHOLD_MS without selecting, it identifies the "most
 *      harmonious" card based on longitudinal memory and triggers a callback
 *      so the UI can pulse that card's glow to guide choice invisibly.
 *
 *   2. Sovereign Lighting Sync: derives a color-hex signal from the active
 *      flavor/mood state — ready to be sent to venue smart lighting hardware.
 *      emitLightingSync() returns the hex + an explanatory label.
 *
 * Pure TS singleton — no React deps.
 */

import { crossSessionMemory } from "./crossSessionMemory";
import { groupEnergyEngine }  from "./groupEnergyEngine";

const HESITATION_THRESHOLD_MS = 10_000;   // 10 seconds

// ── Lighting palette ──────────────────────────────────────────────────────────
// Maps flavor → venue smart lighting hex
const LIGHTING_PALETTE: Record<string, { hex: string; label: string }> = {
  earthy:   { hex: "#7A4F1A", label: "Deep Amber — forest floor warmth" },
  cedar:    { hex: "#C87941", label: "Warm Cedar — aromatic wood glow"  },
  leather:  { hex: "#5C3A1E", label: "Maduro Brown — cured tobacco depth" },
  spiced:   { hex: "#A83820", label: "Ember Red — assertive spice heat"  },
  default:  { hex: "#D48B00", label: "Honey Amber — NOVEE OS signature"  },
};

// ── Harmony affinity map: flavor × dominant memory → suggested card ───────────
// Which card "resonates" most given what we know about this guest?
const AFFINITY: Record<string, string[]> = {
  earthy:  ["earthy", "cedar",  "leather", "spiced"],
  cedar:   ["cedar",  "earthy", "leather", "spiced"],
  leather: ["leather","cedar",  "spiced",  "earthy"],
  spiced:  ["spiced", "leather","cedar",   "earthy"],
};

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LightingSyncPayload {
  hex:       string;
  label:     string;
  intensity: number;    // 0–100 — for DMX-capable fixtures
  flavor:    string;
}

// ── Singleton ─────────────────────────────────────────────────────────────────

class EnvironmentalInfluenceEngineClass {
  private timerId:   ReturnType<typeof setTimeout> | null = null;
  private startedAt: number | null = null;

  // ── Hesitation detection ────────────────────────────────────────────────────

  /**
   * Call when the sensory selection screen mounts.
   * @param availableCards  The flavor IDs visible on screen
   * @param onHesitation    Called with the suggested card ID after threshold
   */
  startHesitationTimer(availableCards: string[], onHesitation: (suggestedCardId: string) => void): void {
    this.clearHesitationTimer();
    this.startedAt = Date.now();
    this.timerId = setTimeout(() => {
      const suggested = this.deriveSuggestedCard(availableCards);
      if (suggested) onHesitation(suggested);
    }, HESITATION_THRESHOLD_MS);
  }

  clearHesitationTimer(): void {
    if (this.timerId !== null) { clearTimeout(this.timerId); this.timerId = null; }
    this.startedAt = null;
  }

  /** How long (ms) the guest has been on the screen without selecting. */
  getHesitationMs(): number {
    return this.startedAt !== null ? Date.now() - this.startedAt : 0;
  }

  // ── Card suggestion logic ────────────────────────────────────────────────────

  /**
   * Returns the card ID that best matches the guest's longitudinal memory.
   * Falls back to the first card if no memory exists.
   */
  deriveSuggestedCard(availableCards: string[]): string | null {
    if (availableCards.length === 0) return null;
    const dom = crossSessionMemory.getDominantFlavor();
    if (!dom) return availableCards[0];

    const preference = AFFINITY[dom] ?? [dom, ...availableCards];
    for (const p of preference) {
      if (availableCards.includes(p)) return p;
    }
    return availableCards[0];
  }

  // ── Sovereign Lighting Sync ─────────────────────────────────────────────────

  /**
   * Returns a lighting sync payload for the active flavor / mood.
   * In a hardware-ready venue, POST this payload to the venue's DMX bridge.
   */
  getLightingSyncPayload(activeFlavor?: string): LightingSyncPayload {
    const flavor  = activeFlavor ?? crossSessionMemory.getDominantFlavor() ?? "default";
    const palette = LIGHTING_PALETTE[flavor] ?? LIGHTING_PALETTE.default;
    const energy  = groupEnergyEngine.getState();

    // Intensity: HIGH_ENERGY → brighter fixtures, MEDITATIVE → dim
    const intensityMap: Record<string, number> = {
      HIGH_ENERGY: 85,
      FOCUSED:     65,
      MEDITATIVE:  40,
    };
    const intensity = intensityMap[energy.mood] ?? 65;

    return { hex: palette.hex, label: palette.label, intensity, flavor };
  }

  /** Glow intensity for premium buttons (0–1 range for CSS opacity/shadow scale). */
  getGlowIntensity(): number {
    const { visual } = groupEnergyEngine.getState();
    return Math.min(1, visual.emberGlowIntensity * 0.75);
  }
}

export const environmentalInfluenceEngine = new EnvironmentalInfluenceEngineClass();
