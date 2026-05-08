/**
 * SensoryWeightEngine — Physical emotional weight and tactile illusion layer.
 *
 * Controls the motion physics properties that make AXIOM OS feel cinematic,
 * heavy, intentional — not like software.
 *
 * Outputs CSS custom property values and motion configs that components apply
 * directly to their animation layers. Subscribes to EnvironmentalContinuityEngine
 * and ExperienceStateEngine to derive contextually appropriate physics.
 *
 * Produced values:
 *   inertia          0–1 → controls how slowly elements respond to state changes
 *   breathScale      scale factor for ambient breathing oscillation
 *   breathDuration   ms for one full breath cycle
 *   pulseInterval    ms between ambient signal pulses
 *   rippleDecay      how fast ripple waves dissipate (0=instant, 1=very slow)
 *   particleWeight   effective gravitational pull on particle drift
 *   touchResponseMs  how long touch feedback lingers
 *   resonanceHz      base frequency for synchronized environmental oscillation
 *   pressureLevel    0–100 — simulated "atmospheric pressure" in space
 *   motionBlur       px of CSS motion-blur equivalent to apply to fast elements
 *
 * Usage:
 *   SensoryWeightEngine.subscribe(weight => applyCssVars(weight));
 *   SensoryWeightEngine.registerTouchEvent({ x, y }); // on guest touch
 */

import { ExperienceStateEngine }          from "./ExperienceStateEngine";
import { EnvironmentalContinuityEngine }  from "./EnvironmentalContinuityEngine";

export interface SensoryWeightState {
  // Motion physics
  inertia:          number;   // 0–1
  breathScale:      number;   // scale delta (e.g. 0.012 → scale 1.000..1.024)
  breathDuration:   number;   // ms per breath cycle
  pulseInterval:    number;   // ms between ambient pulses
  rippleDecay:      number;   // 0–1
  particleWeight:   number;   // 0–1 — high = slow heavy float, low = snappy
  touchResponseMs:  number;   // ms touch feedback lingers
  resonanceHz:      number;   // Hz — synchronized oscillation base frequency
  pressureLevel:    number;   // 0–100
  motionBlur:       number;   // px

  // Derived CSS-ready values
  cssTransitionDuration: string;   // e.g. "680ms"
  cssEasing:             string;   // cubic-bezier string
  cssBreathKeyframe:     string;   // scale range "1.000 1.024"
  cssGlowPulse:          string;   // opacity range "0.12 0.34"

  // Touch ripple state
  activeTouchRipples: TouchRipple[];
}

export interface TouchRipple {
  id:       string;
  x:        number;
  y:        number;
  strength: number;   // 0–1 based on gesture velocity
  startMs:  number;
  decayMs:  number;
}

type WeightListener = (state: SensoryWeightState) => void;

let _rippleId = 0;

class SensoryWeightEngineClass {
  private state:     SensoryWeightState;
  private listeners = new Set<WeightListener>();
  private pulseTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.state = this.derive(0, 0.72, 0.16);
    this.attach();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  getState(): SensoryWeightState {
    return { ...this.state, activeTouchRipples: [...this.state.activeTouchRipples] };
  }

  /**
   * Register a guest touch event. Generates a weighted ripple that
   * components animate as a tactile "press" wave in the environment.
   * @param pos      Viewport coordinates
   * @param velocity Gesture speed 0–1 (default 0.5)
   */
  registerTouchEvent(pos: { x: number; y: number }, velocity = 0.5): void {
    const ripple: TouchRipple = {
      id:       `ripple_${++_rippleId}`,
      x:        pos.x,
      y:        pos.y,
      strength: 0.4 + velocity * 0.6,
      startMs:  Date.now(),
      decayMs:  600 + this.state.rippleDecay * 1400,
    };

    this.state = {
      ...this.state,
      activeTouchRipples: [...this.state.activeTouchRipples, ripple],
    };

    this.emit();

    // Auto-prune ripple after decay
    setTimeout(() => {
      this.state = {
        ...this.state,
        activeTouchRipples: this.state.activeTouchRipples.filter(r => r.id !== ripple.id),
      };
      this.emit();
    }, ripple.decayMs + 100);
  }

  /**
   * Momentarily spike sensory weight for a cinematic moment (e.g. handoff).
   * Fades back over returnMs.
   */
  spike(pressureDelta: number, returnMs = 1200): void {
    const prev = this.state.pressureLevel;
    const peaked = Math.min(100, prev + pressureDelta);

    this.state = { ...this.state, pressureLevel: peaked };
    this.emit();

    const stepMs = 80;
    const steps  = Math.ceil(returnMs / stepMs);
    const delta  = (peaked - prev) / steps;
    let s = 0;

    const decay = setInterval(() => {
      s++;
      const p = Math.max(prev, this.state.pressureLevel - delta);
      this.state = { ...this.state, pressureLevel: p };
      this.emit();
      if (s >= steps) clearInterval(decay);
    }, stepMs);
  }

  // ── Subscription ─────────────────────────────────────────────────────────

  subscribe(fn: WeightListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private attach(): void {
    ExperienceStateEngine.subscribe(exp => {
      const contEnv  = EnvironmentalContinuityEngine.getCurrent();
      const newState = this.derive(exp.engagementScore, contEnv.motionInertia, contEnv.breathFrequency);
      this.state = { ...newState, activeTouchRipples: this.state.activeTouchRipples };
      this.emit();
    });

    EnvironmentalContinuityEngine.subscribe(env => {
      const expScore = ExperienceStateEngine.getEngagementScore();
      const newState = this.derive(expScore, env.motionInertia, env.breathFrequency);
      this.state = { ...newState, activeTouchRipples: this.state.activeTouchRipples };
      this.emit();
    });
  }

  private derive(
    engagementScore: number,
    motionInertia:   number,
    breathFrequency: number,
  ): SensoryWeightState {
    // High engagement → slightly lighter inertia (more responsive but still cinematic)
    const inertia         = Math.max(0.40, motionInertia - engagementScore * 0.003);
    const breathDuration  = Math.round(1000 / breathFrequency);
    const breathScale     = 0.008 + inertia * 0.028;
    const pulseInterval   = Math.round(breathDuration * 0.75);
    const rippleDecay     = 0.35 + inertia * 0.55;
    const particleWeight  = 0.30 + inertia * 0.60;
    const touchResponseMs = 280 + Math.round(inertia * 520);
    const resonanceHz     = breathFrequency * 0.5;
    const pressureLevel   = 20 + Math.round(engagementScore * 0.6);
    const motionBlur      = Math.round(inertia * 4);

    // CSS-ready derivations
    const transitionMs         = Math.round(280 + inertia * 600);
    const lo  = 1.000;
    const hi  = +(lo + breathScale).toFixed(4);
    const glowLo = +(0.06 + engagementScore * 0.001).toFixed(3);
    const glowHi = +(glowLo + 0.12 + inertia * 0.14).toFixed(3);

    return {
      inertia,
      breathScale,
      breathDuration,
      pulseInterval,
      rippleDecay,
      particleWeight,
      touchResponseMs,
      resonanceHz,
      pressureLevel,
      motionBlur,
      cssTransitionDuration: `${transitionMs}ms`,
      cssEasing:             this.inertiaToEasing(inertia),
      cssBreathKeyframe:     `${lo} ${hi}`,
      cssGlowPulse:          `${glowLo} ${glowHi}`,
      activeTouchRipples:    [],
    };
  }

  private inertiaToEasing(inertia: number): string {
    // Low inertia → snappier overshoot; high inertia → slow, regal ease-out
    if (inertia > 0.75) return "cubic-bezier(0.22, 1, 0.36, 1)";
    if (inertia > 0.55) return "cubic-bezier(0.34, 1.06, 0.64, 1)";
    if (inertia > 0.40) return "cubic-bezier(0.34, 1.20, 0.64, 1)";
    return "cubic-bezier(0.68, -0.55, 0.27, 1.55)";  // bouncy for vape
  }

  private emit(): void {
    const snap = this.getState();
    this.listeners.forEach(fn => fn(snap));
  }
}

export const SensoryWeightEngine = new SensoryWeightEngineClass();
