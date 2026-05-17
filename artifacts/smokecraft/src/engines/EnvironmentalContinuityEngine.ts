/**
 * EnvironmentalContinuityEngine — Seamless craft-to-craft atmospheric morphing.
 *
 * Prevents any "page-switch" feeling between craft experiences by managing
 * a continuous environment state that morphs across SmokeCraft → PourCraft
 * → BrewCraft → VapeCraft rather than cutting between them.
 *
 * Each craft has a full sensory profile. When transitioning, the engine
 * produces a morphing interpolation sequence — subscribers receive per-frame
 * intermediate states to apply to the live DOM, not a discrete before/after.
 *
 * Morphing algorithm:
 *   1. Snapshot outgoing craft profile (A)
 *   2. Lock target incoming craft profile (B)
 *   3. Emit interpolated states at 60fps-equivalent ticks over durationMs
 *   4. Commit to B on completion
 *
 * Usage:
 *   EnvironmentalContinuityEngine.morphToCraft("pour", { durationMs: 1200 });
 *   EnvironmentalContinuityEngine.subscribe(state => applyAtmosphere(state));
 */

import { ExperienceStateEngine, type CraftType } from "./ExperienceStateEngine";

// ── Sensory profiles ──────────────────────────────────────────────────────────

export interface SensoryProfile {
  craft:              NonNullable<CraftType>;
  primaryColor:       string;    // dominant particle / glow hex
  secondaryColor:     string;    // secondary accent hex
  ambientLux:         number;    // 0–100 — how much light fills the space
  warmth:             number;    // 0–100 — warm (100) → cool (0) temperature
  density:            number;    // 0–100 — particle / atmosphere density
  refractionStrength: number;    // 0–100 — liquid / glass shimmer intensity
  breathAmplitude:    number;    // 0–1 — scale of breathing oscillation
  breathFrequency:    number;    // breaths per second (0.1–0.5)
  motionInertia:      number;    // 0–1 — 1 = very heavy/slow, 0 = snappy
  particleSize:       number;    // base radius px
  particleOpacity:    number;    // 0–1
  glowRadius:         number;    // px blur on ambient glow
  glowOpacity:        number;    // 0–1
  backgroundFilter:   string;    // CSS filter string for bg image
  soundTexture:       "thick" | "crystalline" | "warm" | "vaporous" | "neutral";
}

const SENSORY_PROFILES: Record<NonNullable<CraftType>, SensoryProfile> = {
  smoke: {
    craft:              "smoke",
    primaryColor:       "#F4A03A",
    secondaryColor:     "#D4682E",
    ambientLux:         28,
    warmth:             88,      // richer warmth — deep ember heat
    density:            78,      // denser smoke cloud
    refractionStrength: 14,
    breathAmplitude:    0.042,   // deeper breathing — more alive
    breathFrequency:    0.13,    // slower — meditative ember rhythm
    motionInertia:      0.88,    // heavier — smoke moves with weight
    particleSize:       6,
    particleOpacity:    0.56,
    glowRadius:         110,     // broader amber warmth
    glowOpacity:        0.22,
    backgroundFilter:   "brightness(0.27) saturate(1.3) sepia(0.22)",
    soundTexture:       "thick",
  },
  pour: {
    craft:              "pour",
    primaryColor:       "#E8C060",
    secondaryColor:     "#D48B00",
    ambientLux:         45,
    warmth:             72,
    density:            40,
    refractionStrength: 88,      // champagne gold liquid shimmer at full strength
    breathAmplitude:    0.026,
    breathFrequency:    0.20,
    motionInertia:      0.66,
    particleSize:       3,
    particleOpacity:    0.74,
    glowRadius:         140,     // wider champagne halo
    glowOpacity:        0.32,    // brighter — reflective glass feeling
    backgroundFilter:   "brightness(0.32) saturate(1.5) sepia(0.08)",
    soundTexture:       "crystalline",
  },
  brew: {
    craft:              "brew",
    primaryColor:       "#C4782A",
    secondaryColor:     "#8B5E3C",
    ambientLux:         35,
    warmth:             58,
    density:            62,
    refractionStrength: 34,
    breathAmplitude:    0.032,   // industrial rhythm — copper machinery
    breathFrequency:    0.16,
    motionInertia:      0.78,    // heavier industrial weight
    particleSize:       7,
    particleOpacity:    0.48,
    glowRadius:         90,
    glowOpacity:        0.16,
    backgroundFilter:   "brightness(0.26) saturate(1.15) sepia(0.26)",
    soundTexture:       "warm",
  },
  vape: {
    craft:              "vape",
    primaryColor:       "#A08EFF",
    secondaryColor:     "#4A90D9",
    ambientLux:         58,
    warmth:             18,      // cooler — ethereal chill
    density:            86,      // dense vapor cloud
    refractionStrength: 52,
    breathAmplitude:    0.020,
    breathFrequency:    0.26,
    motionInertia:      0.52,    // lighter — vapor drifts freely
    particleSize:       16,      // larger cloud blobs
    particleOpacity:    0.30,
    glowRadius:         160,     // wide cool halo
    glowOpacity:        0.26,
    backgroundFilter:   "brightness(0.33) saturate(0.75) hue-rotate(210deg)",
    soundTexture:       "vaporous",
  },
  wine: {
    craft:              "wine",
    primaryColor:       "#9B1C1C",
    secondaryColor:     "#722F37",
    ambientLux:         42,
    warmth:             70,
    density:            30,
    refractionStrength: 60,
    breathAmplitude:    0.022,
    breathFrequency:    0.18,
    motionInertia:      0.72,
    particleSize:       4,
    particleOpacity:    0.62,
    glowRadius:         120,
    glowOpacity:        0.24,
    backgroundFilter:   "brightness(0.30) saturate(1.4) sepia(0.30)",
    soundTexture:       "warm",
  },
};

// ── Interpolated environment state ────────────────────────────────────────────

export interface ContinuousEnvironmentState extends SensoryProfile {
  morphProgress: number;    // 0 = full A, 1 = full B (during transition)
  isMorphing:    boolean;
  prevCraft:     CraftType;
}

type ContinuityListener = (state: ContinuousEnvironmentState) => void;

// ── Engine ────────────────────────────────────────────────────────────────────

class EnvironmentalContinuityEngineClass {
  private current:   ContinuousEnvironmentState;
  private listeners = new Set<ContinuityListener>();
  private morphRaf:  number | null = null;

  constructor() {
    const defaultProfile = SENSORY_PROFILES["smoke"];
    this.current = {
      ...defaultProfile,
      morphProgress: 1,
      isMorphing:    false,
      prevCraft:     null,
    };

    // Track ExperienceStateEngine craft changes
    ExperienceStateEngine.subscribe(exp => {
      if (exp.activeCraft && exp.activeCraft !== this.current.craft) {
        this.morphToCraft(exp.activeCraft);
      }
    });
  }

  // ── API ───────────────────────────────────────────────────────────────────

  getCurrent(): ContinuousEnvironmentState {
    return { ...this.current };
  }

  getProfile(craft: NonNullable<CraftType>): SensoryProfile {
    return { ...SENSORY_PROFILES[craft] };
  }

  /**
   * Begin a seamless morph to a new craft atmosphere.
   * @param craft       Target craft
   * @param durationMs  Morph duration (default: driven by current motionInertia)
   */
  morphToCraft(craft: NonNullable<CraftType>, durationMs?: number): void {
    if (this.current.craft === craft && !this.current.isMorphing) return;
    if (this.morphRaf !== null) cancelAnimationFrame(this.morphRaf);

    const fromProfile = { ...this.current };
    const toProfile   = SENSORY_PROFILES[craft];
    // Luxury weight: minimum 1100ms, scales with inertia up to 2500ms
    const duration    = durationMs ?? (1100 + this.current.motionInertia * 1600);
    const startTs     = performance.now();
    const prevCraft   = this.current.craft as CraftType;

    const tick = (now: number) => {
      const elapsed  = now - startTs;
      const rawT     = Math.min(1, elapsed / duration);
      const t        = this.easeInOutQuart(rawT);

      // Atmospheric carryover: outgoing properties linger in the first 40%
      // of the transition — the new atmosphere has to "earn" its space.
      const carryoverT = rawT < 0.40
        ? this.easeInExpo(rawT / 0.40) * 0.55   // very slow start
        : 0.55 + this.easeInOutQuart((rawT - 0.40) / 0.60) * 0.45;

      this.current = {
        ...this.lerpProfile(fromProfile, toProfile, carryoverT),
        morphProgress: carryoverT,
        isMorphing:    rawT < 1,
        prevCraft,
      };

      this.emit();

      if (rawT < 1) {
        this.morphRaf = requestAnimationFrame(tick);
      } else {
        this.morphRaf = null;
      }
    };

    this.morphRaf = requestAnimationFrame(tick);
  }

  /** Instantly commit to a craft profile (no interpolation — for initialization). */
  snapToCraft(craft: NonNullable<CraftType>): void {
    if (this.morphRaf !== null) cancelAnimationFrame(this.morphRaf);
    const profile = SENSORY_PROFILES[craft];
    this.current = { ...profile, morphProgress: 1, isMorphing: false, prevCraft: null };
    this.emit();
  }

  // ── Subscription ─────────────────────────────────────────────────────────

  subscribe(fn: ContinuityListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private lerpProfile(
    a: SensoryProfile,
    b: SensoryProfile,
    t: number,
  ): SensoryProfile {
    const lerp = (x: number, y: number) => x + (y - x) * t;
    return {
      craft:              b.craft,
      primaryColor:       this.lerpHex(a.primaryColor,   b.primaryColor,   t),
      secondaryColor:     this.lerpHex(a.secondaryColor, b.secondaryColor, t),
      ambientLux:         lerp(a.ambientLux,         b.ambientLux),
      warmth:             lerp(a.warmth,              b.warmth),
      density:            lerp(a.density,             b.density),
      refractionStrength: lerp(a.refractionStrength,  b.refractionStrength),
      breathAmplitude:    lerp(a.breathAmplitude,     b.breathAmplitude),
      breathFrequency:    lerp(a.breathFrequency,     b.breathFrequency),
      motionInertia:      lerp(a.motionInertia,       b.motionInertia),
      particleSize:       lerp(a.particleSize,        b.particleSize),
      particleOpacity:    lerp(a.particleOpacity,     b.particleOpacity),
      glowRadius:         lerp(a.glowRadius,          b.glowRadius),
      glowOpacity:        lerp(a.glowOpacity,         b.glowOpacity),
      // Filter crossfade: blur out at t=0.35, commit at t=0.50, clear at t=0.65
      backgroundFilter:   t < 0.50 ? a.backgroundFilter : b.backgroundFilter,
      soundTexture:       t < 0.55 ? a.soundTexture    : b.soundTexture,
    };
  }

  private lerpHex(a: string, b: string, t: number): string {
    const parse = (hex: string) => {
      const n = hex.replace("#", "");
      return [
        parseInt(n.slice(0, 2), 16),
        parseInt(n.slice(2, 4), 16),
        parseInt(n.slice(4, 6), 16),
      ];
    };
    const [ar, ag, ab] = parse(a);
    const [br, bg, bb] = parse(b);
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bv= Math.round(ab + (bb - ab) * t);
    return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${bv.toString(16).padStart(2,"0")}`;
  }

  private easeInOutQuart(t: number): number {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
  }

  /** Very slow entry, fast exit — makes outgoing atmosphere feel heavy to leave. */
  private easeInExpo(t: number): number {
    return t === 0 ? 0 : Math.pow(2, 10 * t - 10);
  }

  private emit(): void {
    const snap = { ...this.current };
    this.listeners.forEach(fn => fn(snap));
  }
}

export const EnvironmentalContinuityEngine = new EnvironmentalContinuityEngineClass();
