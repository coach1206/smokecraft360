/**
 * EnvironmentalOrchestratorEngine — Atmospheric morphing and sensory pacing.
 *
 * Manages the living environment layer independently of React rendering.
 * Responds to ExperienceStateEngine signals and derives visual parameters
 * that components consume via subscription.
 *
 * Output drives:
 *   - Particle density and velocity
 *   - Ambient glow intensity
 *   - Background saturation / brightness
 *   - Atmospheric zone weights (which zone dominates)
 *   - Sensory rhythm (breath cycle duration)
 *
 * Usage:
 *   EnvironmentalOrchestratorEngine.subscribe(env => applyAtmosphere(env));
 *   EnvironmentalOrchestratorEngine.morphTo("smoke", 0.8);
 */

import { ExperienceStateEngine, type CraftType, type EmotionalPacing } from "./ExperienceStateEngine";

export type AtmosphericMode =
  | "neutral"      // blank/resting — no craft selected
  | "discovery"    // light ambient — gentle first impression
  | "immersive"    // full atmosphere — deep engagement
  | "cinematic"    // transition moment — all particles at peak
  | "operational"; // staff handoff — environment dimmed, telemetry emerges

export interface EnvironmentalState {
  activeCraft:        CraftType;
  mode:               AtmosphericMode;
  intensity:          number;       // 0–100
  particleDensity:    number;       // 0–100
  breathCycleMs:      number;       // ambient breath duration
  glowOpacity:        number;       // 0–1
  backgroundDim:      number;       // 0–1 (1 = fully dark)
  atmosphereColor:    string;       // dominant hex color for glow
  saturation:         number;       // 0–100
  transitionEase:     string;       // CSS easing
}

const CRAFT_COLORS: Record<NonNullable<CraftType>, string> = {
  smoke: "#D4682E",
  pour:  "#D48B00",
  brew:  "#C4782A",
  vape:  "#7C5CF6",
};

const DEFAULT_STATE: EnvironmentalState = {
  activeCraft:     null,
  mode:            "neutral",
  intensity:       20,
  particleDensity: 20,
  breathCycleMs:   4500,
  glowOpacity:     0.06,
  backgroundDim:   0.88,
  atmosphereColor: "#D48B00",
  saturation:      30,
  transitionEase:  "cubic-bezier(0.22, 1, 0.36, 1)",
};

type EnvListener = (state: EnvironmentalState) => void;

class EnvironmentalOrchestratorEngineClass {
  private state: EnvironmentalState = { ...DEFAULT_STATE };
  private listeners = new Set<EnvListener>();
  private morphTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // React to experience state changes
    ExperienceStateEngine.subscribe(expState => {
      this.syncFromExperience(expState.activeCraft, expState.pacing, expState.engagementScore);
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────

  getState(): EnvironmentalState {
    return { ...this.state };
  }

  /**
   * Direct morph — called by components on craft hover/enter.
   * @param craft  The craft zone being entered, or null to return to neutral
   * @param targetIntensity  Desired intensity 0–100 (default: 60)
   */
  morphTo(craft: CraftType, targetIntensity = 60): void {
    if (this.morphTimeout) clearTimeout(this.morphTimeout);

    const color = craft ? CRAFT_COLORS[craft] : "#D48B00";
    const mode: AtmosphericMode = craft ? "immersive" : "neutral";

    this.state = {
      ...this.state,
      activeCraft:     craft,
      mode,
      intensity:       targetIntensity,
      particleDensity: Math.round(targetIntensity * 0.85),
      breathCycleMs:   this.pacingToBreath("building"),
      glowOpacity:     0.04 + (targetIntensity / 100) * 0.22,
      backgroundDim:   0.82 + (targetIntensity / 100) * 0.12,
      atmosphereColor: color,
      saturation:      40 + Math.round(targetIntensity * 0.5),
      transitionEase:  "cubic-bezier(0.22, 1, 0.36, 1)",
    };
    this.emit();
  }

  /** Called when transitioning to a full cinematic state (pre-navigation). */
  triggerCinematic(craft: CraftType): void {
    const color = craft ? CRAFT_COLORS[craft] : "#D48B00";
    this.state = {
      ...this.state,
      mode:            "cinematic",
      intensity:       100,
      particleDensity: 100,
      breathCycleMs:   1200,
      glowOpacity:     0.45,
      backgroundDim:   0.98,
      atmosphereColor: color,
      saturation:      100,
      transitionEase:  "cubic-bezier(0.76, 0, 0.24, 1)",
    };
    this.emit();

    // Auto-return to immersive after cinematic peak
    this.morphTimeout = setTimeout(() => this.morphTo(craft, 70), 900);
  }

  /** Called when staff handoff begins — dims environment, surfaces telemetry. */
  enterOperational(): void {
    if (this.morphTimeout) clearTimeout(this.morphTimeout);
    this.state = {
      ...this.state,
      mode:            "operational",
      intensity:       25,
      particleDensity: 10,
      breathCycleMs:   6000,
      glowOpacity:     0.03,
      backgroundDim:   0.96,
      saturation:      15,
      transitionEase:  "cubic-bezier(0.76, 0, 0.24, 1)",
    };
    this.emit();
  }

  /** Restores environment to guest state after handoff release. */
  exitOperational(): void {
    const { activeCraft } = this.state;
    this.morphTo(activeCraft, 65);
  }

  reset(): void {
    if (this.morphTimeout) clearTimeout(this.morphTimeout);
    this.state = { ...DEFAULT_STATE };
    this.emit();
  }

  // ── Subscription ─────────────────────────────────────────────────────────

  subscribe(fn: EnvListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private syncFromExperience(
    craft: CraftType,
    pacing: EmotionalPacing,
    score: number,
  ): void {
    if (this.state.mode === "cinematic" || this.state.mode === "operational") return;

    const color = craft ? CRAFT_COLORS[craft] : this.state.atmosphereColor;
    const intensity = Math.min(95, 20 + score * 0.75);

    this.state = {
      ...this.state,
      activeCraft:     craft,
      mode:            craft ? (score > 40 ? "immersive" : "discovery") : "neutral",
      intensity:       Math.round(intensity),
      particleDensity: Math.round(intensity * 0.8),
      breathCycleMs:   this.pacingToBreath(pacing),
      glowOpacity:     0.04 + (intensity / 100) * 0.18,
      backgroundDim:   0.80 + (intensity / 100) * 0.14,
      atmosphereColor: color,
      saturation:      30 + Math.round(intensity * 0.55),
    };
    this.emit();
  }

  private pacingToBreath(pacing: EmotionalPacing): number {
    switch (pacing) {
      case "ambient":   return 5000;
      case "building":  return 3200;
      case "peak":      return 1800;
      case "cooling":   return 4200;
      case "suspended": return 7000;
    }
  }

  private emit(): void {
    const snap = this.getState();
    this.listeners.forEach(fn => fn(snap));
  }
}

export const EnvironmentalOrchestratorEngine = new EnvironmentalOrchestratorEngineClass();
