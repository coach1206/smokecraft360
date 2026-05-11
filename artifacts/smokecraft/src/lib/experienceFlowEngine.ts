/**
 * ExperienceFlowEngine — SmokeCraftFlow · The Global Bridge
 * Titan V · 360 Enterprises Services LLC · Johnie Manuel Lee Collins
 *
 * 8-step cinematic guest ritual. Single locked-step formation for UI,
 * Audio, and SSE Environmental streams.
 *
 *   Step 1  CRAFTHUB_SELECTION   /craft-hub
 *   Step 2  CINEMATIC_INTRO      /experience/:type
 *   Step 3  EXPERIENCE_OVERVIEW  /experience-overview/:type
 *   Step 4  CHALLENGE_SELECTION  /experience/:type   (CraftEntryChamber)
 *   Step 5  MENTOR_REVEAL        /experience/:type
 *   Step 6  IDENTITY_ENROLLMENT  /experience/:type
 *   Step 7  SYNCHRONIZATION      /synchronization/:type
 *   Step 8  SWIPE_RITUAL         /experience/:type
 *
 * PhantomHUD is suppressed during Steps 1–7. It only activates in SWIPE_RITUAL.
 */

// ── Step sequence ──────────────────────────────────────────────────────────────

export type EFEStep =
  | "CRAFTHUB_SELECTION"
  | "CINEMATIC_INTRO"
  | "EXPERIENCE_OVERVIEW"
  | "CHALLENGE_SELECTION"
  | "MENTOR_REVEAL"
  | "IDENTITY_ENROLLMENT"
  | "SYNCHRONIZATION"
  | "SWIPE_RITUAL";

export const EFE_SEQUENCE: EFEStep[] = [
  "CRAFTHUB_SELECTION",
  "CINEMATIC_INTRO",
  "EXPERIENCE_OVERVIEW",
  "CHALLENGE_SELECTION",
  "MENTOR_REVEAL",
  "IDENTITY_ENROLLMENT",
  "SYNCHRONIZATION",
  "SWIPE_RITUAL",
];

// PhantomHUD only activates at this step and beyond
const HUD_STEP: EFEStep = "SWIPE_RITUAL";

// Flavor cards / swipe content unlock at this step
const UNLOCK_STEP: EFEStep = "SYNCHRONIZATION";

// ── Environment telemetry payloads per step ────────────────────────────────────
// Matches the spec: smoke density, lighting preset, audio layer

export interface EnvPayload {
  smoke:    number;
  lighting: string;
  audio:    string;
}

const ENV_MAP: Partial<Record<EFEStep, EnvPayload>> = {
  CINEMATIC_INTRO:     { smoke: 0.8, lighting: "amber_pulse",  audio: "deep_drone"    },
  EXPERIENCE_OVERVIEW: { smoke: 0.2, lighting: "warm_static",  audio: "meditative"    },
  CHALLENGE_SELECTION: { smoke: 0.4, lighting: "warm_static",  audio: "meditative"    },
  MENTOR_REVEAL:       { smoke: 0.5, lighting: "amber_pulse",  audio: "mentor_hum"    },
  IDENTITY_ENROLLMENT: { smoke: 0.3, lighting: "warm_static",  audio: "meditative"    },
  SYNCHRONIZATION:     { smoke: 1.0, lighting: "strobe_slow",  audio: "whisper_layer" },
  SWIPE_RITUAL:        { smoke: 0.6, lighting: "ember_steady", audio: "ritual_pulse"  },
};

// ── Route map ─────────────────────────────────────────────────────────────────

const ROUTES: Record<EFEStep, (craft?: string) => string> = {
  CRAFTHUB_SELECTION:  ()           => "/craft-hub",
  CINEMATIC_INTRO:     (c = "smoke") => `/experience/${c}`,
  EXPERIENCE_OVERVIEW: (c = "smoke") => `/experience-overview/${c}`,
  CHALLENGE_SELECTION: (c = "smoke") => `/experience/${c}`,
  MENTOR_REVEAL:       (c = "smoke") => `/experience/${c}`,
  IDENTITY_ENROLLMENT: (c = "smoke") => `/experience/${c}`,
  SYNCHRONIZATION:     (c = "smoke") => `/synchronization/${c}`,
  SWIPE_RITUAL:        (c = "smoke") => `/experience/${c}`,
};

// ── Persistent state — sessionStorage ────────────────────────────────────────

const SS_KEY = "titan_efe_v2";

interface EFEState {
  currentStep: EFEStep;
  craftType:   string;
}

function load(): EFEState {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (raw) return JSON.parse(raw) as EFEState;
  } catch { /* SSR / private mode */ }
  return { currentStep: "CRAFTHUB_SELECTION", craftType: "smoke" };
}

function save(s: EFEState): void {
  try { sessionStorage.setItem(SS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

// ── Infrastructure bridge ─────────────────────────────────────────────────────

function syncEnvironment(step: EFEStep): void {
  const payload = ENV_MAP[step];
  if (!payload) return;
  try {
    window.dispatchEvent(new CustomEvent("efe:env_update", { detail: { step, ...payload } }));
  } catch { /* ignore */ }
}

function triggerHaptics(): void {
  try {
    if ("vibrate" in navigator) navigator.vibrate([12, 40, 12]);
  } catch { /* ignore */ }
}

// ── Engine — exported as both SmokeCraftFlow (spec name) and ExperienceFlowEngine ──

export const SmokeCraftFlow = {
  get currentStep(): EFEStep { return load().currentStep; },
  get craftType():   string  { return load().craftType;   },

  get steps(): EFEStep[] { return [...EFE_SEQUENCE]; },

  next(): EFEStep {
    const s   = load();
    const idx = EFE_SEQUENCE.indexOf(s.currentStep);
    const next = EFE_SEQUENCE[Math.min(idx + 1, EFE_SEQUENCE.length - 1)];
    save({ ...s, currentStep: next });
    syncEnvironment(next);
    triggerHaptics();
    return next;
  },

  syncEnvironment,
  triggerHaptics,
};

export const ExperienceFlowEngine = {
  // ── Reads ──────────────────────────────────────────────────────────────────

  get currentStep(): EFEStep { return load().currentStep; },
  get craftType():   string  { return load().craftType;   },

  getRoute(step?: EFEStep): string {
    const s = load();
    return ROUTES[step ?? s.currentStep](s.craftType);
  },

  /** True only in SWIPE_RITUAL — guards PhantomHUD activation */
  isHudAllowed(): boolean {
    return load().currentStep === HUD_STEP;
  },

  /** True from SYNCHRONIZATION onward — guards flavor cards + swipe content */
  isRitualUnlocked(): boolean {
    const s = load();
    return EFE_SEQUENCE.indexOf(s.currentStep) >= EFE_SEQUENCE.indexOf(UNLOCK_STEP);
  },

  stepIndex(): number {
    return EFE_SEQUENCE.indexOf(load().currentStep);
  },

  // ── Writes ─────────────────────────────────────────────────────────────────

  setCraft(craftType: string): void {
    save({ ...load(), craftType });
  },

  goTo(step: EFEStep): void {
    save({ ...load(), currentStep: step });
    syncEnvironment(step);
  },

  /** Advance one step; fires env sync + haptics; returns route to navigate to */
  advance(): string {
    const next = SmokeCraftFlow.next();
    return ROUTES[next](load().craftType);
  },

  /** Step back; returns route */
  back(): string {
    const s    = load();
    const idx  = EFE_SEQUENCE.indexOf(s.currentStep);
    const prev = EFE_SEQUENCE[Math.max(0, idx - 1)];
    save({ ...s, currentStep: prev });
    syncEnvironment(prev);
    return ROUTES[prev](s.craftType);
  },

  /** Begin a new craft journey from CraftHub → CINEMATIC_INTRO */
  startCraft(craftType: string): string {
    save({ currentStep: "CINEMATIC_INTRO", craftType });
    syncEnvironment("CINEMATIC_INTRO");
    triggerHaptics();
    return ROUTES["CINEMATIC_INTRO"](craftType);
  },

  /** Advance from EXPERIENCE_OVERVIEW to CHALLENGE_SELECTION */
  enterChallenge(): string {
    const s = load();
    save({ ...s, currentStep: "CHALLENGE_SELECTION" });
    syncEnvironment("CHALLENGE_SELECTION");
    triggerHaptics();
    return ROUTES["CHALLENGE_SELECTION"](s.craftType);
  },

  /** Mark SYNCHRONIZATION entered — gate unlocks; returns SYNCHRONIZATION route */
  enterSynchronization(): string {
    const s = load();
    save({ ...s, currentStep: "SYNCHRONIZATION" });
    syncEnvironment("SYNCHRONIZATION");
    return ROUTES["SYNCHRONIZATION"](s.craftType);
  },

  /** Mark SYNCHRONIZATION complete — unlocks SWIPE_RITUAL */
  completeSynchronization(): string {
    const s = load();
    save({ ...s, currentStep: "SWIPE_RITUAL" });
    syncEnvironment("SWIPE_RITUAL");
    triggerHaptics();
    return ROUTES["SWIPE_RITUAL"](s.craftType);
  },

  reset(): void {
    save({ currentStep: "CRAFTHUB_SELECTION", craftType: "smoke" });
  },
};
