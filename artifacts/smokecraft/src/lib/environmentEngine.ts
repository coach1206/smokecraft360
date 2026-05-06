/**
 * environmentEngine — reactive ambient state machine for the Swipe Experience.
 *
 * Tracks craft type, dominant flavor tags, session intensity, and lighting mood.
 * Reacts to swipe choices and morph through emotional transitions.
 * Persists to localStorage so returning users restore their atmosphere.
 *
 * Design philosophy:
 *   - Pure state machine — no React dependencies
 *   - Subscribe/notify pattern for reactive consumption
 *   - All mutations are small incremental nudges, not hard resets
 */

export type CraftType = "smoke" | "pour" | "brew" | "vape";

export type LightingMood =
  | "warm_amber"    // smoky / bold / earthy → warmer ember
  | "deep_shadow"   // intense / dark / peat → heavier darkness
  | "crystal_clean" // crisp / light / citrus → bright clarity
  | "neon_pulse"    // vape / cool / mint → neon ambient
  | "golden_soft"   // sweet / vanilla / caramel → warm softness
  | "neutral";      // default

export type PerformanceMode = "cinematic" | "balanced" | "low-power";

export interface ExperienceControlSettings {
  atmosphereIntensity: number;   // 0–100
  particleDensity:     number;   // 0–100
  motionCalmness:      number;   // 0–100 (100 = slowest/calmest)
  revealPacing:        number;   // 0–100 (100 = most dramatic)
  soundVolume:         number;   // 0–100
  performanceMode:     PerformanceMode;
}

export interface EnvironmentState {
  craftType:       CraftType;
  dominantTags:    string[];           // top 5 tags by weight
  tagWeights:      Record<string, number>; // tag → cumulative score
  lightingMood:    LightingMood;
  intensity:       number;             // 0–100 — increases with bold swipes
  particleDensity: number;             // 0–1 — particle system density
  bgBrightness:    number;             // 0.3–0.85 — background brightness
  glowStrength:    number;             // 0–1 — ambient glow overlay
  sessionSwipes:   number;
  lastCraftSeen:   string | null;
  returnVisit:     boolean;
  // Experience Control Panel settings (venue-tunable)
  motionCalmness:   number;            // 0–100 from control panel
  revealPacing:     number;            // 0–100 from control panel
  soundVolume:      number;            // 0–100 from control panel
  performanceMode:  PerformanceMode;   // cinematic | balanced | low-power
  controlSettings:  ExperienceControlSettings | null; // currently active settings
}

type EnvironmentListener = (state: EnvironmentState) => void;

const STORAGE_KEY = "axiom_env_state_v2";
const PERSIST_KEYS: (keyof EnvironmentState)[] = [
  "craftType", "dominantTags", "tagWeights",
  "lightingMood", "intensity", "particleDensity",
  "bgBrightness", "glowStrength", "lastCraftSeen",
];

// ── Tag → lighting mood mapping ───────────────────────────────────────────────

const TAG_MOOD_MAP: Record<string, LightingMood> = {
  // Smoky / dark / earthy → warm ember
  smoky: "warm_amber", bold: "warm_amber", earthy: "warm_amber",
  cedar: "warm_amber", tobacco: "warm_amber", leather: "warm_amber",
  roasted: "warm_amber", spicy: "warm_amber",
  // Intense / peat → deep shadow
  peat: "deep_shadow", peated: "deep_shadow", dark: "deep_shadow",
  intense: "deep_shadow", bitter: "deep_shadow",
  // Crisp / light / citrus → crystal clean
  crisp: "crystal_clean", light: "crystal_clean", citrus: "crystal_clean",
  floral: "crystal_clean", wheat: "crystal_clean", delicate: "crystal_clean",
  fresh: "crystal_clean",
  // Sweet / vanilla / caramel → golden soft
  sweet: "golden_soft", vanilla: "golden_soft", caramel: "golden_soft",
  smooth: "golden_soft", creamy: "golden_soft", honey: "golden_soft",
  // Vape / cool / mint → neon pulse
  mint: "neon_pulse", cool: "neon_pulse", "dense cloud": "neon_pulse",
  tropical: "neon_pulse", fruity: "neon_pulse", vapor: "neon_pulse",
};

// ── Craft → default environment parameters ────────────────────────────────────

const CRAFT_DEFAULTS: Record<CraftType, Partial<EnvironmentState>> = {
  smoke: { lightingMood: "warm_amber",    bgBrightness: 0.38, glowStrength: 0.55, particleDensity: 0.6 },
  pour:  { lightingMood: "golden_soft",   bgBrightness: 0.45, glowStrength: 0.40, particleDensity: 0.3 },
  brew:  { lightingMood: "crystal_clean", bgBrightness: 0.52, glowStrength: 0.30, particleDensity: 0.5 },
  vape:  { lightingMood: "neon_pulse",    bgBrightness: 0.30, glowStrength: 0.80, particleDensity: 0.9 },
};

// ── Lighting mood → visual parameters ────────────────────────────────────────

export const MOOD_VISUALS: Record<LightingMood, {
  filterStr: string; tintColor: string; accentOpacity: number;
}> = {
  warm_amber:    { filterStr: "brightness(0.42) saturate(1.35)",                    tintColor: "rgba(28,14,4,0.64)",  accentOpacity: 0.65 },
  deep_shadow:   { filterStr: "brightness(0.30) saturate(1.55)",                    tintColor: "rgba(8,4,1,0.76)",    accentOpacity: 0.80 },
  crystal_clean: { filterStr: "brightness(0.60) saturate(1.10) hue-rotate(-8deg)",  tintColor: "rgba(20,16,10,0.44)", accentOpacity: 0.40 },
  neon_pulse:    { filterStr: "brightness(0.28) saturate(1.80) hue-rotate(260deg)", tintColor: "rgba(8,4,18,0.72)",   accentOpacity: 0.90 },
  golden_soft:   { filterStr: "brightness(0.58) saturate(1.05) hue-rotate(-6deg)",  tintColor: "rgba(26,16,6,0.50)",  accentOpacity: 0.50 },
  neutral:       { filterStr: "brightness(0.50) saturate(1.10)",                    tintColor: "rgba(15,10,5,0.55)",  accentOpacity: 0.50 },
};

// ── Default state ─────────────────────────────────────────────────────────────

export const DEFAULT_CONTROL_SETTINGS: ExperienceControlSettings = {
  atmosphereIntensity: 70,
  particleDensity:     65,
  motionCalmness:      55,
  revealPacing:        70,
  soundVolume:         40,
  performanceMode:     "balanced",
};

function defaultState(): EnvironmentState {
  return {
    craftType:       "smoke",
    dominantTags:    [],
    tagWeights:      {},
    lightingMood:    "warm_amber",
    intensity:       30,
    particleDensity: 0.5,
    bgBrightness:    0.42,
    glowStrength:    0.50,
    sessionSwipes:   0,
    lastCraftSeen:   null,
    returnVisit:     false,
    motionCalmness:  DEFAULT_CONTROL_SETTINGS.motionCalmness,
    revealPacing:    DEFAULT_CONTROL_SETTINGS.revealPacing,
    soundVolume:     DEFAULT_CONTROL_SETTINGS.soundVolume,
    performanceMode: DEFAULT_CONTROL_SETTINGS.performanceMode,
    controlSettings: null,
  };
}

// ── Environment Engine ────────────────────────────────────────────────────────

export class EnvironmentEngine {
  private state:     EnvironmentState;
  private listeners: Set<EnvironmentListener> = new Set();

  constructor() {
    this.state = this.loadPersistedState();
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  private loadPersistedState(): EnvironmentState {
    const base = defaultState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return base;
      const saved = JSON.parse(raw) as Partial<EnvironmentState>;
      const merged: EnvironmentState = { ...base };
      for (const key of PERSIST_KEYS) {
        if (saved[key] !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (merged as unknown as Record<string, unknown>)[key] = (saved as unknown as Record<string, unknown>)[key];
        }
      }
      merged.sessionSwipes = 0;       // reset per session
      merged.returnVisit   = Object.keys(saved).length > 0;
      return merged;
    } catch {
      return base;
    }
  }

  private persist(): void {
    try {
      const toSave: Partial<EnvironmentState> = {};
      for (const key of PERSIST_KEYS) {
        (toSave as Record<string, unknown>)[key] = this.state[key];
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch { /* quota exceeded — ignore */ }
  }

  // ── Subscribe/notify ─────────────────────────────────────────────────────────

  subscribe(listener: EnvironmentListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l({ ...this.state });
  }

  getState(): EnvironmentState { return { ...this.state }; }

  // ── Craft change ──────────────────────────────────────────────────────────────

  setCraft(craftType: CraftType): void {
    if (this.state.craftType === craftType) return;
    const defaults = CRAFT_DEFAULTS[craftType];
    this.state = {
      ...this.state,
      craftType,
      lastCraftSeen: craftType,
      ...defaults,
    };
    this.notify();
    this.persist();
  }

  // ── Swipe reactions ───────────────────────────────────────────────────────────

  onSwipeAdd(tags: string[]): void {
    const weights = { ...this.state.tagWeights };
    for (const tag of tags) {
      weights[tag.toLowerCase()] = (weights[tag.toLowerCase()] ?? 0) + 3;
    }
    this.applyTagUpdate(weights, "add");
  }

  onSwipeSkip(tags: string[]): void {
    const weights = { ...this.state.tagWeights };
    for (const tag of tags) {
      const key = tag.toLowerCase();
      weights[key] = (weights[key] ?? 0) - 1;
    }
    this.applyTagUpdate(weights, "skip");
  }

  private applyTagUpdate(weights: Record<string, number>, action: "add" | "skip"): void {
    const sorted = Object.entries(weights)
      .filter(([, w]) => w > 0)
      .sort(([, a], [, b]) => b - a);
    const dominantTags = sorted.slice(0, 5).map(([t]) => t);
    const topTag       = dominantTags[0];
    const lightingMood = topTag
      ? (TAG_MOOD_MAP[topTag] ?? CRAFT_DEFAULTS[this.state.craftType].lightingMood ?? "neutral")
      : this.state.lightingMood;

    // Intensity: bold/smoky/peat/intense push up; light/crisp/delicate pull down
    let intensity = this.state.intensity;
    const boldTags    = ["bold", "smoky", "peat", "intense", "spicy", "roasted"];
    const delicateTags = ["light", "crisp", "delicate", "smooth", "floral", "wheat"];
    if (action === "add") {
      const hasBold    = dominantTags.some(t => boldTags.includes(t));
      const hasDelicate = dominantTags.some(t => delicateTags.includes(t));
      if (hasBold)     intensity = Math.min(100, intensity + 6);
      if (hasDelicate) intensity = Math.max(10, intensity - 4);
    }

    // Particle density: more swipes + bold → denser
    const swipes        = this.state.sessionSwipes + 1;
    const particleDensity = Math.min(1, 0.3 + swipes * 0.04 + intensity * 0.003);

    // Background brightness: bold → darker, light → brighter
    const moodVisuals   = MOOD_VISUALS[lightingMood];
    const bgBrightness  = this.parseBrightness(moodVisuals.filterStr);
    const glowStrength  = moodVisuals.accentOpacity;

    this.state = {
      ...this.state,
      tagWeights:      weights,
      dominantTags,
      lightingMood,
      intensity,
      particleDensity,
      bgBrightness,
      glowStrength,
      sessionSwipes:   swipes,
    };
    this.notify();
    this.persist();
  }

  // ── Emotional transitions ─────────────────────────────────────────────────────

  onRevealStart(): void {
    // Darken slightly + increase particles as we approach the reveal climax
    this.state = {
      ...this.state,
      bgBrightness:    Math.max(0.22, this.state.bgBrightness - 0.08),
      particleDensity: Math.min(1, this.state.particleDensity + 0.25),
      glowStrength:    Math.min(1, this.state.glowStrength + 0.15),
    };
    this.notify();
  }

  onOrderConfirm(): void {
    // Satisfaction surge — glow pulse, then settle
    this.state = {
      ...this.state,
      glowStrength:    Math.min(1, this.state.glowStrength + 0.30),
      particleDensity: Math.max(0.1, this.state.particleDensity - 0.20),
    };
    this.notify();
    // Settle back after 2s
    setTimeout(() => {
      this.state = {
        ...this.state,
        glowStrength: Math.max(0.3, this.state.glowStrength - 0.20),
      };
      this.notify();
    }, 2000);
  }

  // ── Atmospheric memory restore ────────────────────────────────────────────────

  /**
   * wakeUpAtmosphere — gradually restores atmosphere on return visit.
   * Instead of instantly snapping to saved state, ramps from dormant values
   * (glow 12%, particles 8%) to target over ~4 seconds.
   * The atmosphere "wakes up" — feels alive, not reset.
   */
  wakeUpAtmosphere(): void {
    if (!this.state.returnVisit) return;

    const target = {
      glowStrength:    this.state.glowStrength,
      particleDensity: this.state.particleDensity,
      bgBrightness:    this.state.bgBrightness,
    };

    // Start from dormant values — very faint
    this.state = {
      ...this.state,
      glowStrength:    target.glowStrength * 0.10,
      particleDensity: target.particleDensity * 0.06,
      bgBrightness:    Math.min(0.85, target.bgBrightness + 0.18), // slightly washed out at start
    };
    this.notify();

    const STEPS       = 12;
    const INTERVAL_MS = 340; // ~4s total
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const t    = step / STEPS;
      // easeInOut curve
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      this.state = {
        ...this.state,
        glowStrength:    target.glowStrength    * (0.10 + ease * 0.90),
        particleDensity: target.particleDensity * (0.06 + ease * 0.94),
        bgBrightness:    target.bgBrightness    + (1 - ease) * 0.18,
      };
      this.notify();

      if (step >= STEPS) clearInterval(timer);
    }, INTERVAL_MS);
  }

  // ── Experience Control Panel settings ────────────────────────────────────────

  /**
   * applyControlSettings — maps venue-tunable 0–100 panel values to internal
   * engine state. Called by EnvironmentContext after fetching from the API.
   * Per-craft overrides can be applied on top of the global row.
   */
  applyControlSettings(settings: ExperienceControlSettings, craftType?: CraftType): void {
    // Only apply per-craft if it matches the currently active craft
    if (craftType !== undefined && craftType !== this.state.craftType) return;

    // Map 0–100 slider values to internal 0–1 ranges
    const glowStrength    = 0.05 + (settings.atmosphereIntensity / 100) * 0.85;
    const particleDensity = settings.particleDensity / 100;
    const bgBrightness    = 0.20 + (settings.atmosphereIntensity / 100) * 0.45;

    this.state = {
      ...this.state,
      glowStrength,
      particleDensity,
      bgBrightness,
      motionCalmness:  settings.motionCalmness,
      revealPacing:    settings.revealPacing,
      soundVolume:     settings.soundVolume,
      performanceMode: settings.performanceMode,
      controlSettings: settings,
    };
    this.notify();
  }

  // ── Session continuity ────────────────────────────────────────────────────────

  clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.state = defaultState();
    this.notify();
  }

  // ── Time-of-day context ───────────────────────────────────────────────────────

  applyTimeOfDay(): void {
    const hour = new Date().getHours();
    let modifier = 0;
    if (hour >= 0  && hour < 6)  modifier = -0.08; // late night — darker
    if (hour >= 6  && hour < 11) modifier = +0.10; // morning — brighter
    if (hour >= 17 && hour < 21) modifier = -0.04; // evening — slightly darker
    if (hour >= 21 || hour < 0)  modifier = -0.06; // night — darker
    this.state = {
      ...this.state,
      bgBrightness: Math.max(0.20, Math.min(0.85, this.state.bgBrightness + modifier)),
    };
    this.notify();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private parseBrightness(filterStr: string): number {
    const m = filterStr.match(/brightness\(([0-9.]+)\)/);
    return m ? parseFloat(m[1]!) : 0.50;
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const environmentEngine = new EnvironmentEngine();
