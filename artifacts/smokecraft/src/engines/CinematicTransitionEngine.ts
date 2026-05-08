/**
 * CinematicTransitionEngine — Cinematic state transition orchestrator.
 *
 * Manages ripple waves, liquid-glass morphs, phase-shift distortions,
 * and environmental overlays. Coordinates with the HandoffContext's
 * clip-path ripple via callbacks.
 *
 * Transition types:
 *   craft_entry    — zone activation → experience navigation
 *   staff_handoff  — ripple from touch point, operational overlay emerges
 *   handoff_release — reverse ripple, guest environment restores
 *   reveal_emergence — recommendation reveal emerges from darkness
 *   order_confirm  — quick flash of confirmation energy
 *   session_return — welcoming ambient return
 *
 * Usage:
 *   CinematicTransitionEngine.queue("craft_entry", { origin: {x,y}, craft: "smoke" });
 *   CinematicTransitionEngine.onTransitionStart(event => showOverlay(event));
 *   CinematicTransitionEngine.onTransitionMidpoint(event => navigate(event.path));
 */

export type TransitionType =
  | "craft_entry"
  | "staff_handoff"
  | "handoff_release"
  | "reveal_emergence"
  | "order_confirm"
  | "session_return"
  | "phase_shift";

export interface TransitionOrigin {
  x: number; // viewport px
  y: number;
}

export interface TransitionConfig {
  type:          TransitionType;
  origin:        TransitionOrigin;
  durationMs:    number;
  holdMs:        number;
  ease:          string;
  color:         string;    // primary overlay color
  glowColor:     string;    // secondary radial glow
  clipExpansion: boolean;   // whether to use clip-path circle expansion
  distortion:    boolean;   // whether to show liquid-glass shimmer
  dimBackground: number;    // 0–1
  path?:         string;    // target route to fire at midpoint
  craft?:        string;
}

type TransitionListener = (config: TransitionConfig) => void;
type PhaseListener = (config: TransitionConfig) => void;

const TRANSITION_PRESETS: Record<TransitionType, Omit<TransitionConfig, "type" | "origin" | "path" | "craft">> = {
  craft_entry: {
    durationMs:    680,
    holdMs:        120,
    ease:          "cubic-bezier(0.22, 1, 0.36, 1)",
    color:         "rgba(212,139,0,0.08)",
    glowColor:     "#D48B00",
    clipExpansion: false,
    distortion:    false,
    dimBackground: 0.70,
  },
  staff_handoff: {
    durationMs:    700,
    holdMs:        0,
    ease:          "cubic-bezier(0.22, 1, 0.36, 1)",
    color:         "rgba(30,28,25,0.92)",
    glowColor:     "#D48B00",
    clipExpansion: true,
    distortion:    true,
    dimBackground: 0.95,
  },
  handoff_release: {
    durationMs:    580,
    holdMs:        0,
    ease:          "cubic-bezier(0.76, 0, 0.24, 1)",
    color:         "rgba(30,28,25,0.40)",
    glowColor:     "#D48B00",
    clipExpansion: true,
    distortion:    false,
    dimBackground: 0.35,
  },
  reveal_emergence: {
    durationMs:    900,
    holdMs:        250,
    ease:          "cubic-bezier(0.4, 0, 0.2, 1)",
    color:         "rgba(8,4,1,1)",
    glowColor:     "#F4A03A",
    clipExpansion: false,
    distortion:    false,
    dimBackground: 0.92,
  },
  order_confirm: {
    durationMs:    320,
    holdMs:        80,
    ease:          "ease-out",
    color:         "rgba(245,242,237,0.90)",
    glowColor:     "#D48B00",
    clipExpansion: false,
    distortion:    false,
    dimBackground: 0.55,
  },
  session_return: {
    durationMs:    600,
    holdMs:        300,
    ease:          "cubic-bezier(0.22, 1, 0.36, 1)",
    color:         "rgba(10,8,5,0.85)",
    glowColor:     "#D48B00",
    clipExpansion: false,
    distortion:    false,
    dimBackground: 0.75,
  },
  phase_shift: {
    durationMs:    800,
    holdMs:        150,
    ease:          "cubic-bezier(0.4, 0, 0.2, 1)",
    color:         "rgba(18,12,6,0.82)",
    glowColor:     "#D4682E",
    clipExpansion: false,
    distortion:    true,
    dimBackground: 0.88,
  },
};

class CinematicTransitionEngineClass {
  private activeTransition: TransitionConfig | null = null;
  private startListeners:     Set<TransitionListener> = new Set();
  private midpointListeners:  Set<PhaseListener>      = new Set();
  private completeListeners:  Set<PhaseListener>      = new Set();

  // ── Queuing ───────────────────────────────────────────────────────────────

  queue(
    type:   TransitionType,
    opts:   { origin?: TransitionOrigin; path?: string; craft?: string; color?: string } = {},
  ): TransitionConfig {
    const preset = TRANSITION_PRESETS[type];
    const origin = opts.origin ?? {
      x: typeof window !== "undefined" ? window.innerWidth  / 2 : 540,
      y: typeof window !== "undefined" ? window.innerHeight / 2 : 960,
    };

    // Craft-specific glow color override
    const craftGlows: Record<string, string> = {
      smoke: "#D4682E",
      pour:  "#D48B00",
      brew:  "#C4782A",
      vape:  "#7C5CF6",
    };

    const config: TransitionConfig = {
      ...preset,
      type,
      origin,
      path:      opts.path,
      craft:     opts.craft,
      glowColor: opts.craft ? (craftGlows[opts.craft] ?? preset.glowColor) : preset.glowColor,
      color:     opts.color ?? preset.color,
    };

    this.activeTransition = config;

    // Fire start listeners
    this.startListeners.forEach(fn => fn(config));

    // Fire midpoint listeners
    const midMs = config.durationMs * 0.5 + config.holdMs;
    setTimeout(() => {
      if (this.activeTransition?.type === type) {
        this.midpointListeners.forEach(fn => fn(config));
      }
    }, midMs);

    // Fire complete listeners
    const totalMs = config.durationMs + config.holdMs;
    setTimeout(() => {
      if (this.activeTransition?.type === type) {
        this.activeTransition = null;
        this.completeListeners.forEach(fn => fn(config));
      }
    }, totalMs);

    return config;
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  getActive(): TransitionConfig | null {
    return this.activeTransition;
  }

  isActive(): boolean {
    return this.activeTransition !== null;
  }

  getPreset(type: TransitionType): Omit<TransitionConfig, "type" | "origin"> {
    return { ...TRANSITION_PRESETS[type] } as Omit<TransitionConfig, "type" | "origin">;
  }

  // ── Listeners ─────────────────────────────────────────────────────────────

  onTransitionStart(fn: TransitionListener):    () => void {
    this.startListeners.add(fn);
    return () => this.startListeners.delete(fn);
  }

  onTransitionMidpoint(fn: PhaseListener):  () => void {
    this.midpointListeners.add(fn);
    return () => this.midpointListeners.delete(fn);
  }

  onTransitionComplete(fn: PhaseListener): () => void {
    this.completeListeners.add(fn);
    return () => this.completeListeners.delete(fn);
  }
}

export const CinematicTransitionEngine = new CinematicTransitionEngineClass();
