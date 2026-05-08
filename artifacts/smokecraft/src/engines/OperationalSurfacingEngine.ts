/**
 * OperationalSurfacingEngine — Hidden intelligence becoming visible.
 *
 * The EEIS (Experience + Environmental Intelligence System) operational
 * layer should feel like the venue's nervous system surfacing from within
 * the environment — not an overlay being placed on top.
 *
 * This engine manages the transition sequence from guest-facing atmosphere
 * to operational state and back:
 *
 *   Phase 0 — AMBIENT:    full guest atmosphere, zero operational UI visible
 *   Phase 1 — DISTORTION: ripple wave propagates from touch origin
 *   Phase 2 — DIMMING:    guest layer dims, environment "pulls back"
 *   Phase 3 — EMERGENCE:  signal nodes pulse into visibility
 *   Phase 4 — OPERATIONAL: full telemetry state, staff interface visible
 *   Phase 5 — RESTORE:    reverse ripple, guest environment reclaims space
 *
 * The engine does NOT render anything. It emits phase transition events
 * that components (EeisOverlay, EnvironmentalBreath, EnvironmentalOrchestrator)
 * consume to drive their own animations.
 *
 * Usage:
 *   OperationalSurfacingEngine.beginHandoff({ x, y });
 *   OperationalSurfacingEngine.onPhaseChange(phase => updateLayers(phase));
 *   OperationalSurfacingEngine.releaseHandoff();
 */

import { ExperienceStateEngine }             from "./ExperienceStateEngine";
import { EnvironmentalOrchestratorEngine }    from "./EnvironmentalOrchestratorEngine";
import { SignalVisualizationEngine }          from "./SignalVisualizationEngine";
import { CinematicTransitionEngine }          from "./CinematicTransitionEngine";

export type SurfacingPhase =
  | "ambient"       // Phase 0 — normal guest state
  | "distortion"    // Phase 1 — ripple propagating
  | "dimming"       // Phase 2 — guest layer retreating
  | "emergence"     // Phase 3 — signal nodes appearing
  | "operational"   // Phase 4 — full staff operational state
  | "restoring";    // Phase 5 — reverse ripple, returning to guest

export interface SurfacingState {
  phase:          SurfacingPhase;
  progress:       number;         // 0–1 within current phase
  rippleOrigin:   { x: number; y: number };
  guestOpacity:   number;         // 0–1 — guest layer alpha
  telemetryAlpha: number;         // 0–1 — telemetry/EEIS layer alpha
  signalBrightness: number;       // 0–1 — signal node glow intensity
  distortionMag:  number;         // 0–1 — ripple distortion magnitude
  staffPin?:      string;         // optional staff PIN context
}

type PhaseListener  = (state: SurfacingState) => void;

// Phase timing in ms
const PHASE_DURATIONS: Record<SurfacingPhase, number> = {
  ambient:     0,
  distortion:  380,
  dimming:     420,
  emergence:   500,
  operational: 0,    // held until releaseHandoff() called
  restoring:   680,
};

class OperationalSurfacingEngineClass {
  private state: SurfacingState = {
    phase:            "ambient",
    progress:         0,
    rippleOrigin:     { x: 0, y: 0 },
    guestOpacity:     1,
    telemetryAlpha:   0,
    signalBrightness: 0,
    distortionMag:    0,
  };

  private listeners  = new Set<PhaseListener>();
  private phaseTimer: ReturnType<typeof setTimeout>  | null = null;
  private rafHandle:  number | null = null;

  // ── Handoff initiation ────────────────────────────────────────────────────

  /**
   * Begin staff handoff sequence from touch origin point.
   * Works through phases: distortion → dimming → emergence → operational.
   */
  beginHandoff(origin: { x: number; y: number }, pin?: string): void {
    if (this.state.phase !== "ambient") return;
    if (this.phaseTimer) clearTimeout(this.phaseTimer);

    this.state = {
      ...this.state,
      phase:        "distortion",
      progress:     0,
      rippleOrigin: origin,
      staffPin:     pin,
    };

    // Notify engines
    ExperienceStateEngine.beginHandoff();
    EnvironmentalOrchestratorEngine.enterOperational();

    // Queue cinematic ripple
    CinematicTransitionEngine.queue("staff_handoff", {
      origin,
      craft: ExperienceStateEngine.getState().activeCraft ?? undefined,
    });

    // Fire signal burst
    SignalVisualizationEngine.fireSignal("handoff_signal", 90);

    this.emit();
    this.runPhaseSequence();
  }

  /**
   * Release handoff and restore guest environment.
   */
  releaseHandoff(): void {
    if (this.state.phase === "ambient") return;
    if (this.phaseTimer) clearTimeout(this.phaseTimer);
    if (this.rafHandle)  cancelAnimationFrame(this.rafHandle);

    this.state = { ...this.state, phase: "restoring", progress: 0 };
    this.emit();

    CinematicTransitionEngine.queue("handoff_release", {
      origin: this.state.rippleOrigin,
    });

    // Animate restore
    this.animatePhase("restoring", PHASE_DURATIONS.restoring, () => {
      this.state = {
        ...this.state,
        phase:            "ambient",
        progress:         0,
        guestOpacity:     1,
        telemetryAlpha:   0,
        signalBrightness: 0,
        distortionMag:    0,
        staffPin:         undefined,
      };
      ExperienceStateEngine.releaseHandoff();
      EnvironmentalOrchestratorEngine.exitOperational();
      SignalVisualizationEngine.fireSignal("orchestration_route", 55);
      this.emit();
    });
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  getState(): SurfacingState {
    return { ...this.state };
  }

  getPhase(): SurfacingPhase {
    return this.state.phase;
  }

  isOperational(): boolean {
    return this.state.phase === "operational";
  }

  isInTransition(): boolean {
    return this.state.phase !== "ambient" && this.state.phase !== "operational";
  }

  // ── Subscription ─────────────────────────────────────────────────────────

  subscribe(fn: PhaseListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── Internal phase sequencer ──────────────────────────────────────────────

  private runPhaseSequence(): void {
    const sequence: SurfacingPhase[] = ["distortion", "dimming", "emergence", "operational"];
    let index = 0;

    const advance = () => {
      const phase = sequence[index];
      if (!phase) return;

      const duration = PHASE_DURATIONS[phase];
      if (duration === 0) {
        // Held phase — wait for external release
        this.state = { ...this.state, phase, progress: 1 };
        this.state = this.deriveLayerValues(this.state);
        this.emit();
        return;
      }

      this.animatePhase(phase, duration, () => {
        index++;
        advance();
      });
    };

    advance();
  }

  private animatePhase(
    phase:      SurfacingPhase,
    durationMs: number,
    onComplete: () => void,
  ): void {
    const startTs = performance.now();

    const tick = (now: number) => {
      const rawT = Math.min(1, (now - startTs) / durationMs);
      const t    = this.easeOut(rawT);

      this.state = this.deriveLayerValues({ ...this.state, phase, progress: t });
      this.emit();

      if (rawT < 1) {
        this.rafHandle = requestAnimationFrame(tick);
      } else {
        this.rafHandle = null;
        onComplete();
      }
    };

    this.rafHandle = requestAnimationFrame(tick);
  }

  private deriveLayerValues(state: SurfacingState): SurfacingState {
    switch (state.phase) {
      case "ambient":
        return { ...state, guestOpacity: 1, telemetryAlpha: 0, signalBrightness: 0, distortionMag: 0 };

      case "distortion":
        return {
          ...state,
          guestOpacity:     1,
          telemetryAlpha:   0,
          signalBrightness: 0,
          distortionMag:    state.progress < 0.5
            ? state.progress * 2          // build up
            : 1 - (state.progress - 0.5) * 2, // decay
        };

      case "dimming":
        return {
          ...state,
          guestOpacity:     1 - state.progress * 0.72,
          telemetryAlpha:   state.progress * 0.20,
          signalBrightness: state.progress * 0.15,
          distortionMag:    0,
        };

      case "emergence":
        return {
          ...state,
          guestOpacity:     0.28,
          telemetryAlpha:   0.20 + state.progress * 0.80,
          signalBrightness: 0.15 + state.progress * 0.85,
          distortionMag:    0,
        };

      case "operational":
        return {
          ...state,
          guestOpacity:     0.28,
          telemetryAlpha:   1,
          signalBrightness: 1,
          distortionMag:    0,
        };

      case "restoring":
        return {
          ...state,
          guestOpacity:     0.28 + state.progress * 0.72,
          telemetryAlpha:   1 - state.progress,
          signalBrightness: 1 - state.progress,
          distortionMag:    state.progress < 0.3 ? state.progress * 0.5 : 0,
        };
    }
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private emit(): void {
    const snap = { ...this.state };
    this.listeners.forEach(fn => fn(snap));
  }
}

export const OperationalSurfacingEngine = new OperationalSurfacingEngineClass();
