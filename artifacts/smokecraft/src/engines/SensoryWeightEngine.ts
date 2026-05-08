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

  // Extended luxury physics
  luxuryTransitionMs:    number;   // premium transition duration for high-inertia states
  environmentalVibration: number;  // 0–1 — micro-oscillation magnitude
  resonancePulse:        number;   // live sin-wave value (-1..1) for synchronized breathing
  dampingRatio:          number;   // 0–1 — spring damping (1 = critically damped, no bounce)
  liquidGlassEase:       string;   // specialized cubic-bezier for liquid morphing

  // Derived CSS-ready values
  cssTransitionDuration: string;   // e.g. "680ms"
  cssLuxuryDuration:     string;   // e.g. "1400ms" for landmark transitions
  cssEasing:             string;   // cubic-bezier string
  cssBreathKeyframe:     string;   // scale range "1.000 1.024"
  cssGlowPulse:          string;   // opacity range "0.12 0.34"

  // Touch ripple state
  activeTouchRipples: TouchRipple[];
}

export interface TouchRipple {
  id:        string;
  x:         number;
  y:         number;
  strength:  number;   // 0–1 based on gesture velocity
  startMs:   number;
  decayMs:   number;
  waveCount: number;   // secondary ripple rings (luxury feel = 2–3 trailing waves)
}

type WeightListener = (state: SensoryWeightState) => void;

let _rippleId = 0;

class SensoryWeightEngineClass {
  private state:      SensoryWeightState;
  private listeners = new Set<WeightListener>();
  private resonanceRaf: number | null = null;
  private resonanceStartMs = Date.now();

  constructor() {
    this.state = this.derive(0, 0.72, 0.16);
    this.attach();
    this.startResonanceLoop();
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
    // Luxury ripple: high-inertia environments produce more trailing waves
    const waveCount = this.state.inertia > 0.70 ? 3 : this.state.inertia > 0.50 ? 2 : 1;
    const ripple: TouchRipple = {
      id:        `ripple_${++_rippleId}`,
      x:         pos.x,
      y:         pos.y,
      strength:  0.40 + velocity * 0.60,
      startMs:   Date.now(),
      decayMs:   800 + this.state.rippleDecay * 1800,  // longer linger
      waveCount,
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

  /**
   * Low-frequency resonance loop — runs at ~30fps (not 60) to produce a
   * living sin-wave `resonancePulse` that components sync breathing to.
   * Frequency matches the current craft's breathFrequency.
   */
  private startResonanceLoop(): void {
    const tick = () => {
      const elapsedSec = (Date.now() - this.resonanceStartMs) / 1000;
      const resonancePulse = Math.sin(2 * Math.PI * this.state.resonanceHz * elapsedSec);
      this.state = { ...this.state, resonancePulse };
      this.emit();
      // ~33ms = 30fps — enough for smooth breathing, cheap on CPU
      setTimeout(() => {
        this.resonanceRaf = requestAnimationFrame(tick);
      }, 33);
    };
    this.resonanceRaf = requestAnimationFrame(tick);
  }

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
    // Engagement nudges inertia down slightly — more responsive but never app-like
    const inertia              = Math.max(0.48, motionInertia - engagementScore * 0.002);
    const breathDuration       = Math.round(1000 / breathFrequency);
    const breathScale          = 0.010 + inertia * 0.034;    // deeper breathing amplitude
    const pulseInterval        = Math.round(breathDuration * 0.68);
    const rippleDecay          = 0.55 + inertia * 0.42;      // always linger heavily
    const particleWeight       = 0.38 + inertia * 0.58;
    const touchResponseMs      = 360 + Math.round(inertia * 680);  // more tactile presence
    const resonanceHz          = breathFrequency * 0.5;
    const pressureLevel        = 25 + Math.round(engagementScore * 0.58);
    const motionBlur           = Math.round(inertia * 5);

    // Extended luxury physics
    const luxuryTransitionMs    = Math.round(680 + inertia * 1200);
    const environmentalVibration = inertia * 0.0035;   // micro-oscillation — barely perceptible
    const dampingRatio           = 0.60 + inertia * 0.38; // 0.60 to 0.98

    // CSS-ready derivations
    const transitionMs  = Math.round(320 + inertia * 680);
    const lo            = 1.000;
    const hi            = +(lo + breathScale).toFixed(4);
    const glowLo        = +(0.07 + engagementScore * 0.001).toFixed(3);
    const glowHi        = +(glowLo + 0.14 + inertia * 0.16).toFixed(3);

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
      luxuryTransitionMs,
      environmentalVibration,
      resonancePulse:        0,   // updated by resonance loop
      dampingRatio,
      liquidGlassEase:       "cubic-bezier(0.16, 1.2, 0.30, 1)",
      cssTransitionDuration: `${transitionMs}ms`,
      cssLuxuryDuration:     `${luxuryTransitionMs}ms`,
      cssEasing:             this.inertiaToEasing(inertia),
      cssBreathKeyframe:     `${lo} ${hi}`,
      cssGlowPulse:          `${glowLo} ${glowHi}`,
      activeTouchRipples:    [],
    };
  }

  private inertiaToEasing(inertia: number): string {
    // Luxury spectrum: ultra-heavy regal → light vaporous
    if (inertia > 0.84) return "cubic-bezier(0.16, 1, 0.30, 1)";   // smoke: majestic
    if (inertia > 0.70) return "cubic-bezier(0.22, 1, 0.36, 1)";   // brew: cinematic
    if (inertia > 0.58) return "cubic-bezier(0.34, 1.06, 0.64, 1)"; // pour: liquid glass
    if (inertia > 0.48) return "cubic-bezier(0.34, 1.20, 0.64, 1)"; // vape: slight float
    return "cubic-bezier(0.68, -0.30, 0.27, 1.35)";                 // reserved fallback
  }

  private emit(): void {
    const snap = this.getState();
    this.listeners.forEach(fn => fn(snap));
  }
}

export const SensoryWeightEngine = new SensoryWeightEngineClass();
