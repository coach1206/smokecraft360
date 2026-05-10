/**
 * TITAN V — GLOBAL NERVOUS SYSTEM (HARDENED)
 * Version: 5.2.0 // Global Market Disturber
 * Security: Dual-Stage Long-Press & Regional Palate Mapping
 *
 * API surface changes from 5.1.0:
 *  - validateCommand(holdDuration)  — drops _command string first arg
 *  - executeGlobalCommand()         — replaces override(); emits SOVEREIGN_GLOBAL_DISRUPTION
 *  - getTrifecta()                  — replaces calculateTrifecta(); adds matchAffinity + visualState
 *  - setSystemHeartbeat()           — replaces pulse(); uses haptics.thud() instead of audio
 *  - SOVEREIGN_GLOBAL_DISRUPTION    — new socket event name
 * Backward-compat aliases: override(), calculateTrifecta(), pulse() preserved.
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

export type LoungeMood      = "MEDITATIVE" | "FOCUSED" | "HIGH_ENERGY";
export type OverrideType    = "BLACKOUT" | "API_LOCK" | "PURGE";
/** 5.2.0 canonical command type — same domain as OverrideType */
export type SovereignCommand = "BLACKOUT" | "API_LOCK" | "PURGE";
export type Region           = "DR" | "US" | "EU" | "GLOBAL";

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
  /** 5.2.0 alias for affinityScore — "Apple-level" precision 92–100 */
  matchAffinity: number;
  /** 5.2.0 visual state signal for the cube renderer */
  visualState:   "BREATHING_GOLD";
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
  GLOBAL: {
    pour:  { label: "The Macallan Rare Cask", isReserve: true  },
    plate: { label: "Chef's Signature Reserve", isChefSpecial: true  },
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
   * 5.2.0: single-arg signature — holdDuration only.
   */
  async validateCommand(holdDuration: number): Promise<boolean> {
    if (holdDuration < HOLD_THRESHOLD_MS) {
      console.warn(`TITAN_V: SAFETY TRIGGERED - HOLD DURATION INSUFFICIENT (${holdDuration}ms)`);
      return false;
    }
    return true;
  },

  // ── 2. GLOBAL OVERRIDE EXECUTION (5.2.0) ────────────────────────────────────
  /**
   * Primary sovereign command API for 5.2.0.
   * Validates hold duration internally, then broadcasts SOVEREIGN_GLOBAL_DISRUPTION
   * to all tablets across the node network.
   *
   * @param type         Sovereign command type
   * @param holdDuration Measured press duration in ms (must be ≥ 2000)
   */
  async executeGlobalCommand(type: SovereignCommand, holdDuration: number): Promise<void> {
    const authorized = await TitanNervousSystem.validateCommand(holdDuration);

    if (!authorized) {
      TitanNervousSystem.haptics.error();
      return;
    }

    TitanNervousSystem.haptics.heavy(); // The "Thud" of authority

    socket.emit("SOVEREIGN_GLOBAL_DISRUPTION", {
      type,
      timestamp: Date.now(),
      origin:    "SUPER_ADMIN_MOBILE",
      mode:      "ABSOLUTE",
    });

    if (type === "BLACKOUT") {
      document.body.classList.add("titan-blackout-active");
    }
  },

  /**
   * @deprecated 5.1.0 compat alias — use executeGlobalCommand().
   * Bridges the old venueId-based payload into the new DISRUPTION event.
   */
  async override(type: OverrideType, holdTime: number): Promise<void> {
    return TitanNervousSystem.executeGlobalCommand(type as SovereignCommand, holdTime);
  },

  // ── 3. METABOLIC SYNC (5.2.0) ───────────────────────────────────────────────
  /**
   * Sets the speed of every animation via --hb-mult CSS variable.
   * Syncs GroupEnergyEngine and fires the "Sovereign Sweep" thud haptic.
   * 5.2.0 name: setSystemHeartbeat (replaces pulse).
   */
  setSystemHeartbeat(mood: LoungeMood): void {
    document.documentElement.style.setProperty("--hb-mult", String(SPEED[mood]));
    groupEnergyEngine.setMood(mood);
    TitanNervousSystem.haptics.thud(); // Sovereign Sweep signal
  },

  /** @deprecated 5.1.0 compat alias — use setSystemHeartbeat(). */
  pulse(mood: LoungeMood): void {
    TitanNervousSystem.setSystemHeartbeat(mood);
  },

  // ── 4. TRIFECTA PAIRING BRAIN (5.2.0) ───────────────────────────────────────
  /**
   * Regional + palate affinity matrix: Craft ↔ Pour ↔ Plate.
   * 5.2.0 name: getTrifecta. Return adds matchAffinity + visualState fields.
   *
   * Priority order:
   *   1. Regional inventory map (DR / US / EU) → sets pour & plate labels
   *   2. Global affinity matrix → supplies rationale + fallback labels
   *   3. Upsell flag (ELITE / MASTER or score ≥ 93)
   *
   * @param profile  Guest palate profile from enrollment
   * @param region   Venue region code — defaults to 'DR'
   */
  getTrifecta(profile: TrifectaProfile, region: Region = "DR"): TrifectaResult {
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
      matchAffinity: score,       // 5.2.0 alias
      visualState:   "BREATHING_GOLD",
      region,
      craft:  craftNote(profile),
      pour,
      plate,
      upsell,
    };
  },

  /** @deprecated 5.1.0 compat alias — use getTrifecta(). */
  calculateTrifecta(profile: TrifectaProfile, region: Region = "DR"): TrifectaResult {
    return TitanNervousSystem.getTrifecta(profile, region);
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
