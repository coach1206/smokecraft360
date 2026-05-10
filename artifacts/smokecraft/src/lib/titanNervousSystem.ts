/**
 * TITAN V — GLOBAL NERVOUS SYSTEM (HARDENED)
 * Version: 5.1.0 (Global Sovereign)
 *
 * Changes from 5.0.0:
 *  - Dual-stage long-press authentication (validateCommand, 2 s minimum hold)
 *  - override() is now async — rejects with error haptic if hold insufficient
 *  - Socket event renamed → SOVEREIGN_GLOBAL_COMMAND (supports venueId targeting)
 *  - calculateTrifecta gains regional palate overlay (DR / US / EU)
 *  - haptics.heavy() + haptics.error() added
 */

import { groupEnergyEngine }  from "./groupEnergyEngine";
import { socket }              from "./socket";
import { vibrate }             from "./haptics";
import {
  playSovereignSweep,
  playPillClink,
  playSwitch,
  playClick,
} from "./audioEngine";

// ── Types ──────────────────────────────────────────────────────────────────────

export type LoungeMood  = "MEDITATIVE" | "FOCUSED" | "HIGH_ENERGY";
export type OverrideType = "BLACKOUT" | "API_LOCK" | "PURGE";
export type Region       = "DR" | "US" | "EU";

export interface TrifectaProfile {
  craftType:   "smoke" | "pour" | "brew" | "vape";
  boldness:    number;        // 0–100 from enrollment
  atmosphere:  string;        // "bold" | "relaxed" | "reflective" | "social"
  guestTier?:  "ENTRY" | "RISING" | "REFINED" | "ELITE" | "MASTER";
  lastCigar?:  string;
}

export interface TrifectaRecommendation {
  label:          string;
  rationale:      string;
  isReserve?:     boolean;
  isChefSpecial?: boolean;
}

export interface TrifectaResult {
  affinityScore: number;
  region:        Region;
  craft:         TrifectaRecommendation;
  pour:          TrifectaRecommendation;
  plate:         TrifectaRecommendation;
  upsell:        boolean;
}

// ── Safety constants ───────────────────────────────────────────────────────────

/** Minimum sustained hold in milliseconds before a sovereign command fires */
const HOLD_THRESHOLD_MS = 2_000;

/**
 * Sentinel value for pre-authenticated callers (e.g. socket commands that
 * have already been verified server-side). Bypasses the hold check entirely.
 */
export const PREAUTH_HOLD = Infinity;

// ── Speed map ─────────────────────────────────────────────────────────────────

const SPEED: Record<LoungeMood, number> = {
  MEDITATIVE:  0.5,
  FOCUSED:     0.85,
  HIGH_ENERGY: 1.25,
};

// ── Audio hooks ───────────────────────────────────────────────────────────────

const AUDIO_HOOKS: Record<string, () => void> = {
  SOVEREIGN_SWEEP: playSovereignSweep,
  PILL_CLINK:      playPillClink,
  SWITCH:          playSwitch,
  CLICK:           playClick,
};

// ── Regional palate inventory map ─────────────────────────────────────────────
//
// Highest-priority signal — regional market data overrides the global affinity
// matrix for pour and plate labels when a region is supplied.

const REGIONAL_MAP: Record<Region, {
  pour:  { label: string; isReserve: boolean };
  plate: { label: string; isChefSpecial: boolean };
}> = {
  DR: {
    pour:  { label: "Brugal 1888 Reserve",   isReserve: true  },
    plate: { label: "Wagyu Carpaccio",        isChefSpecial: true  },
  },
  US: {
    pour:  { label: "Pappy Van Winkle 15yr", isReserve: true  },
    plate: { label: "Prime Ribeye",           isChefSpecial: true  },
  },
  EU: {
    pour:  { label: "Macallan 25yr",          isReserve: true  },
    plate: { label: "Truffle Fromage",        isChefSpecial: true  },
  },
};

// ── Global pour affinity fallback (no region / unknown region) ────────────────

const POUR_MATRIX: {
  boldMin: number;
  atmosphere?: string;
  label: string;
  rationale: string;
  isReserve: boolean;
}[] = [
  { boldMin: 85, atmosphere: "bold",       label: "Pappy Van Winkle 15yr",  rationale: "Rare bourbon depth matches the authority of a full-bodied smoke",  isReserve: true  },
  { boldMin: 85, atmosphere: "reflective", label: "Glenfarclas 25yr",        rationale: "Sherried complexity echoes the contemplative weight of aged leaf",  isReserve: true  },
  { boldMin: 75,                           label: "Brugal 1888 Reserve",     rationale: "Rich molasses and dried fruit mirror earthy Maduro undertones",     isReserve: true  },
  { boldMin: 55, atmosphere: "social",     label: "Moët & Chandon Impérial", rationale: "Effervescent contrast cleanses the palate between draws",           isReserve: false },
  { boldMin: 50,                           label: "Balvenie DoubleWood 12yr",rationale: "Gentle oak and honey bridge medium-strength craft",                 isReserve: false },
  { boldMin: 30, atmosphere: "relaxed",    label: "Diplomático Mantuano",    rationale: "Soft vanilla warmth complements lighter, aromatic leaf",            isReserve: false },
  { boldMin: 0,                            label: "Casamigos Añejo",         rationale: "Agave earthiness opens the palate for delicate craft experiences",  isReserve: false },
];

const PLATE_MATRIX: {
  boldMin: number;
  atmosphere?: string;
  label: string;
  rationale: string;
  isChefSpecial: boolean;
}[] = [
  { boldMin: 80, atmosphere: "bold",       label: "Wagyu Beef Carpaccio",        rationale: "Fat-rich proteins soften strength, extending the ritual",          isChefSpecial: true  },
  { boldMin: 80,                           label: "Smoked Duck Breast",           rationale: "Shared smoke language deepens the sensory loop",                   isChefSpecial: true  },
  { boldMin: 60, atmosphere: "reflective", label: "Aged Manchego + Truffle Honey",rationale: "Salt and fat balance sustains mid-ritual complexity",              isChefSpecial: true  },
  { boldMin: 55,                           label: "Charcuterie Reserve Board",    rationale: "Cured complexity complements the draw without competing",          isChefSpecial: false },
  { boldMin: 35, atmosphere: "social",     label: "Burrata with Heirloom Tomato", rationale: "Bright acidity refreshes the palate between rounds",              isChefSpecial: false },
  { boldMin: 0,                            label: "Smoked Salmon Blini",          rationale: "Delicate smoke echo without overpowering lighter craft",           isChefSpecial: false },
];

// ── Affinity helpers ───────────────────────────────────────────────────────────

function rationalePour(profile: TrifectaProfile): string {
  const row = POUR_MATRIX.find(p =>
    profile.boldness >= p.boldMin &&
    (!p.atmosphere || p.atmosphere === profile.atmosphere),
  ) ?? POUR_MATRIX[POUR_MATRIX.length - 1];
  return row.rationale;
}

function rationalePlate(profile: TrifectaProfile): string {
  const row = PLATE_MATRIX.find(p =>
    profile.boldness >= p.boldMin &&
    (!p.atmosphere || p.atmosphere === profile.atmosphere),
  ) ?? PLATE_MATRIX[PLATE_MATRIX.length - 1];
  return row.rationale;
}

function globalPour(profile: TrifectaProfile): TrifectaRecommendation {
  const row = POUR_MATRIX.find(p =>
    profile.boldness >= p.boldMin &&
    (!p.atmosphere || p.atmosphere === profile.atmosphere),
  ) ?? POUR_MATRIX[POUR_MATRIX.length - 1];
  return { label: row.label, rationale: row.rationale, isReserve: row.isReserve };
}

function globalPlate(profile: TrifectaProfile): TrifectaRecommendation {
  const row = PLATE_MATRIX.find(p =>
    profile.boldness >= p.boldMin &&
    (!p.atmosphere || p.atmosphere === profile.atmosphere),
  ) ?? PLATE_MATRIX[PLATE_MATRIX.length - 1];
  return { label: row.label, rationale: row.rationale, isChefSpecial: row.isChefSpecial };
}

function craftNote(profile: TrifectaProfile): TrifectaRecommendation {
  const tier = profile.boldness >= 75 ? "Full-Bodied" : profile.boldness >= 45 ? "Medium" : "Mild";
  return {
    label:     profile.lastCigar ?? `${tier} Selection`,
    rationale: `${tier} profile guided Pour and Plate selection for maximum palate harmony`,
  };
}

function computeAffinityScore(profile: TrifectaProfile): number {
  let score = 87;
  if (profile.boldness >= 80 || profile.boldness <= 25) score += 4;
  if (profile.atmosphere !== "social") score += 3;
  if (profile.guestTier === "MASTER" || profile.guestTier === "ELITE") score += 6;
  return Math.min(score, 100);
}

// ── TITAN V CENTRAL NERVOUS SYSTEM ────────────────────────────────────────────

export const TitanNervousSystem = {

  // ── 1. SAFETY LOCK ──────────────────────────────────────────────────────────
  /**
   * Dual-stage command authentication.
   * Returns true only when hold duration meets the 2 s threshold.
   * Pass PREAUTH_HOLD (Infinity) for server-side pre-authenticated commands.
   */
  async validateCommand(_command: string, duration: number): Promise<boolean> {
    if (duration < HOLD_THRESHOLD_MS) {
      console.warn(`TITAN_V: Command rejected — hold ${duration}ms < ${HOLD_THRESHOLD_MS}ms`);
      return false;
    }
    return true;
  },

  // ── 2. GLOBAL OVERRIDE ───────────────────────────────────────────────────────
  /**
   * Async authority override with dual-stage safety lock.
   * Rejects with error haptic if holdTime < 2 s.
   * On success: heavy haptic → SOVEREIGN_GLOBAL_COMMAND broadcast → DOM action.
   *
   * @param holdTime  Measured press duration in ms. Pass PREAUTH_HOLD to bypass.
   */
  async override(type: OverrideType, holdTime: number): Promise<void> {
    const authorized = await TitanNervousSystem.validateCommand(type, holdTime);

    if (!authorized) {
      TitanNervousSystem.haptics.error();
      return;
    }

    TitanNervousSystem.haptics.heavy();

    socket.emit("SOVEREIGN_GLOBAL_COMMAND", {
      type,
      venueId:        "GLOBAL_BROADCAST",
      timestamp:      Date.now(),
      authorityLevel: "SUPER_ADMIN_GLOBAL",
    });

    if (type === "BLACKOUT") {
      document.body.classList.add("titan-blackout-active");
    }
  },

  // ── 3. METABOLIC PULSE ───────────────────────────────────────────────────────
  /**
   * Syncs document animation speed, GroupEnergyEngine mood, and sovereign tone.
   */
  pulse(mood: LoungeMood): void {
    document.documentElement.style.setProperty("--hb-mult", String(SPEED[mood]));
    groupEnergyEngine.setMood(mood);
    TitanNervousSystem.audio.play("SOVEREIGN_SWEEP");
  },

  // ── 4. TRIFECTA PAIRING BRAIN ────────────────────────────────────────────────
  /**
   * Regional + palate affinity matrix: Craft ↔ Pour ↔ Plate.
   *
   * Priority order:
   *   1. Regional inventory map (DR / US / EU) → sets pour & plate labels
   *   2. Global affinity matrix → supplies rationale + fallback labels
   *   3. Upsell flag (ELITE / MASTER or score ≥ 93)
   *
   * @param profile  Guest palate profile from enrollment
   * @param region   Venue region code — defaults to 'DR'
   */
  calculateTrifecta(profile: TrifectaProfile, region: Region = "DR"): TrifectaResult {
    const score  = computeAffinityScore(profile);
    const upsell = score >= 93 ||
      profile.guestTier === "MASTER" ||
      profile.guestTier === "ELITE";

    const effectiveProfile = upsell
      ? { ...profile, boldness: Math.max(profile.boldness, 80) }
      : profile;

    const regional = REGIONAL_MAP[region] ?? REGIONAL_MAP.DR;

    const pour: TrifectaRecommendation = regional
      ? { ...regional.pour,  rationale: rationalePour(effectiveProfile)  }
      : globalPour(effectiveProfile);

    const plate: TrifectaRecommendation = regional
      ? { ...regional.plate, rationale: rationalePlate(effectiveProfile) }
      : globalPlate(effectiveProfile);

    return {
      affinityScore: score,
      region,
      craft:  craftNote(profile),
      pour,
      plate,
      upsell,
    };
  },

  // ── 5. SONIC ENGINE ──────────────────────────────────────────────────────────
  audio: {
    play(hook: string): void {
      const fn = AUDIO_HOOKS[hook];
      if (fn) fn();
    },
  },

  // ── 6. HARDWARE HAPTICS ──────────────────────────────────────────────────────
  haptics: {
    /** Dual-pulse "Tactile Confirmed" — action success */
    confirm(): void   { vibrate([20, 30, 20]); },
    /** Deep "Engage" thud — sovereign command authorized */
    heavy(): void     { vibrate(150); },
    /** Material weight thud — slider / toggle engagement */
    thud(): void      { vibrate(40); },
    /** Aggressive "No" buzz — command rejected / insufficient hold */
    error(): void     { vibrate([50, 10, 50, 10, 50]); },
    /**
     * @deprecated Use heavy() for sovereign overrides.
     * Kept for backward compatibility — maps to heavy().
     */
    sovereign(): void { vibrate(150); },
  },
};
