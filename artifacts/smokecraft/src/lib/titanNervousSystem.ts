/**
 * TITAN V — CENTRAL NERVOUS SYSTEM
 * Version: 5.0.0 (Sovereign Authority)
 *
 * Single import point for hardware haptics, sonic ignition, cognitive
 * pulse control, and the Trifecta pairing brain.
 *
 * All dependencies resolve to existing singletons — no new servers needed.
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

export type LoungeMood = "MEDITATIVE" | "FOCUSED" | "HIGH_ENERGY";

export interface TrifectaProfile {
  craftType:   "smoke" | "pour" | "brew" | "vape";
  boldness:    number;        // 0–100 from enrollment
  atmosphere:  string;        // "bold" | "relaxed" | "reflective" | "social"
  guestTier?:  "ENTRY" | "RISING" | "REFINED" | "ELITE" | "MASTER";
  lastCigar?:  string;
}

export interface TrifectaRecommendation {
  label:         string;
  rationale:     string;
  isReserve?:    boolean;
  isChefSpecial?: boolean;
}

export interface TrifectaResult {
  affinityScore: number;           // 85–100
  craft:         TrifectaRecommendation;
  pour:          TrifectaRecommendation;
  plate:         TrifectaRecommendation;
  upsell:        boolean;
}

// ── Internal affinity matrices ─────────────────────────────────────────────────

const SPEED: Record<LoungeMood, number> = {
  MEDITATIVE:  0.5,
  FOCUSED:     0.85,
  HIGH_ENERGY: 1.25,
};

const AUDIO_HOOKS: Record<string, () => void> = {
  SOVEREIGN_SWEEP: playSovereignSweep,
  PILL_CLINK:      playPillClink,
  SWITCH:          playSwitch,
  CLICK:           playClick,
};

// Pour affinity — keyed by boldness tier and atmosphere
const POUR_MATRIX: {
  boldMin: number;
  atmosphere?: string;
  label: string;
  rationale: string;
  isReserve: boolean;
}[] = [
  { boldMin: 85, atmosphere: "bold",        label: "Pappy Van Winkle 15yr",     rationale: "Rare bourbon depth matches the authority of a full-bodied smoke",    isReserve: true  },
  { boldMin: 85, atmosphere: "reflective",  label: "Glenfarclas 25yr",           rationale: "Sherried complexity echoes the contemplative weight of aged leaf",    isReserve: true  },
  { boldMin: 75,                            label: "Brugal 1888 Reserve",         rationale: "Rich molasses and dried fruit mirror earthy Maduro undertones",       isReserve: true  },
  { boldMin: 55, atmosphere: "social",      label: "Moët & Chandon Impérial",    rationale: "Effervescent contrast cleanses the palate between draws",             isReserve: false },
  { boldMin: 50,                            label: "Balvenie DoubleWood 12yr",    rationale: "Gentle oak and honey bridge medium-strength craft",                   isReserve: false },
  { boldMin: 30, atmosphere: "relaxed",     label: "Diplomático Mantuano Rum",    rationale: "Soft vanilla warmth complements lighter, aromatic leaf",              isReserve: false },
  { boldMin: 0,                             label: "Casamigos Añejo Tequila",     rationale: "Agave earthiness opens the palate for delicate craft experiences",    isReserve: false },
];

// Plate affinity — keyed by boldness tier and atmosphere
const PLATE_MATRIX: {
  boldMin: number;
  atmosphere?: string;
  label: string;
  rationale: string;
  isChefSpecial: boolean;
}[] = [
  { boldMin: 80, atmosphere: "bold",        label: "Wagyu Beef Carpaccio",        rationale: "Fat-rich proteins soften strength on the palate, extending the ritual", isChefSpecial: true  },
  { boldMin: 80,                            label: "Smoked Duck Breast",           rationale: "Shared smoke language deepens the sensory loop",                         isChefSpecial: true  },
  { boldMin: 60, atmosphere: "reflective",  label: "Aged Manchego + Truffle Honey",rationale: "Salt and fat balance sustains mid-ritual complexity",                    isChefSpecial: true  },
  { boldMin: 55,                            label: "Charcuterie Reserve Board",    rationale: "Cured complexity complements the draw without competing",                isChefSpecial: false },
  { boldMin: 35, atmosphere: "social",      label: "Burrata with Heirloom Tomato", rationale: "Bright acidity refreshes the palate between rounds",                    isChefSpecial: false },
  { boldMin: 0,                             label: "Smoked Salmon Blini",          rationale: "Delicate smoke echo without overpowering lighter craft",                 isChefSpecial: false },
];

function scoredPour(profile: TrifectaProfile): TrifectaRecommendation {
  const match = POUR_MATRIX.find(p =>
    profile.boldness >= p.boldMin &&
    (!p.atmosphere || p.atmosphere === profile.atmosphere),
  ) ?? POUR_MATRIX[POUR_MATRIX.length - 1];
  return { label: match.label, rationale: match.rationale, isReserve: match.isReserve };
}

function scoredPlate(profile: TrifectaProfile): TrifectaRecommendation {
  const match = PLATE_MATRIX.find(p =>
    profile.boldness >= p.boldMin &&
    (!p.atmosphere || p.atmosphere === profile.atmosphere),
  ) ?? PLATE_MATRIX[PLATE_MATRIX.length - 1];
  return { label: match.label, rationale: match.rationale, isChefSpecial: match.isChefSpecial };
}

function craftNote(profile: TrifectaProfile): TrifectaRecommendation {
  const tier = profile.boldness >= 75 ? "Full-Bodied" : profile.boldness >= 45 ? "Medium" : "Mild";
  return {
    label:     profile.lastCigar ?? `${tier} Selection`,
    rationale: `${tier} profile guided Pour and Plate selection for maximum palate harmony`,
  };
}

function affinityScore(profile: TrifectaProfile): number {
  // Base 87 + up to 13 points for boldness extremes and tier
  let score = 87;
  if (profile.boldness >= 80 || profile.boldness <= 25) score += 4;
  if (profile.atmosphere !== "social") score += 3;
  if (profile.guestTier === "MASTER" || profile.guestTier === "ELITE") score += 6;
  return Math.min(score, 100);
}

// ── TITAN V CENTRAL NERVOUS SYSTEM ────────────────────────────────────────────

export const TitanNervousSystem = {

  /**
   * 1. THE METABOLIC PULSE
   * Syncs document animation speed + GroupEnergyEngine + Sovereign Sweep sound.
   */
  pulse(mood: LoungeMood): void {
    document.documentElement.style.setProperty("--hb-mult", String(SPEED[mood]));
    groupEnergyEngine.setMood(mood);
    TitanNervousSystem.audio.play("SOVEREIGN_SWEEP");
  },

  /**
   * 2. THE AUTHORITY OVERRIDE
   * Freeze the room. Heavy haptic + socket broadcast + optional DOM class.
   */
  override(type: "BLACKOUT" | "API_LOCK" | "PURGE"): void {
    TitanNervousSystem.haptics.sovereign();
    socket.emit("SOVEREIGN_COMMAND", {
      type,
      timestamp:      Date.now(),
      authorityLevel: "SUPER_ADMIN",
    });
    if (type === "BLACKOUT") {
      document.body.classList.toggle("titan-blackout-active");
    }
  },

  /**
   * 3. THE TRIFECTA PAIRING BRAIN
   * Real affinity matrix: Craft ↔ Pour ↔ Plate.
   * Prioritises Reserve spirits and Chef Specials for ELITE/MASTER guests.
   */
  calculateTrifecta(profile: TrifectaProfile): TrifectaResult {
    const score  = affinityScore(profile);
    const upsell = score >= 93 ||
      profile.guestTier === "MASTER" ||
      profile.guestTier === "ELITE";

    // For upsell guests, force Reserve/ChefSpecial by boosting boldness read
    const effectiveBoldness = upsell
      ? Math.max(profile.boldness, 80)
      : profile.boldness;

    const effectiveProfile = { ...profile, boldness: effectiveBoldness };

    return {
      affinityScore: score,
      craft:         craftNote(profile),
      pour:          scoredPour(effectiveProfile),
      plate:         scoredPlate(effectiveProfile),
      upsell,
    };
  },

  /**
   * 4. THE SONIC ENGINE
   * Maps Titan V hook names to existing audioEngine functions.
   */
  audio: {
    play(hook: string): void {
      const fn = AUDIO_HOOKS[hook];
      if (fn) fn();
    },
  },

  /**
   * 5. HARDWARE HAPTICS
   * Named vibration profiles — wraps existing haptics.ts.
   */
  haptics: {
    /** Dual-pulse "Tactile Confirmed" — action success */
    confirm(): void   { vibrate([20, 30, 20]); },
    /** Heavy singular "Mechanical Disconnect" — sovereign override */
    sovereign(): void { vibrate(100); },
    /** Material weight thud — slider/toggle click */
    thud(): void      { vibrate(40); },
  },
};
