/**
 * ExperienceFlowEngine — SmokeCraftFlow · The Global Bridge
 * Titan V · 360 Enterprises Services LLC · Johnie Manuel Lee Collins
 *
 * 9-step cinematic guest ritual. Single locked-step formation for UI,
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
 *   Step 9  LEGACY_HANDOFF       /legacy-handoff/:sessionId/:craftType
 *
 * PhantomHUD suppressed Steps 1–7 and 9. Activates in SWIPE_RITUAL only.
 * LEGACY_HANDOFF is LOCKDOWN mode — all swipe gestures disabled.
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
  | "SWIPE_RITUAL"
  | "SPIRIT_CONSTRUCTION"
  | "LEGACY_HANDOFF";

export const EFE_SEQUENCE: EFEStep[] = [
  "CRAFTHUB_SELECTION",
  "CINEMATIC_INTRO",
  "EXPERIENCE_OVERVIEW",
  "CHALLENGE_SELECTION",
  "MENTOR_REVEAL",
  "IDENTITY_ENROLLMENT",
  "SYNCHRONIZATION",
  "SWIPE_RITUAL",
  "SPIRIT_CONSTRUCTION",
  "LEGACY_HANDOFF",
];

// PhantomHUD only activates at this step and beyond
const HUD_STEP: EFEStep = "SWIPE_RITUAL";

// Flavor cards / swipe content unlock at this step
const UNLOCK_STEP: EFEStep = "SYNCHRONIZATION";

// ── Environment telemetry payloads per step ────────────────────────────────────
// Matches the spec: smoke density, lighting preset, audio layer

export interface EnvPayload {
  smoke:              number;
  lighting:           string;
  audio:              string;
  /** KINETIC_FEEDBACK — silences standard HUDs; activates drag-driven overlays */
  mode?:              string;
  /** 0–1 room atmosphere tension — deepens lighting on SWIPE_RITUAL entry */
  atmosphereTension?: number;
}

const ENV_MAP: Partial<Record<EFEStep, EnvPayload>> = {
  CINEMATIC_INTRO:     { smoke: 0.8, lighting: "amber_pulse",  audio: "deep_drone"    },
  EXPERIENCE_OVERVIEW: { smoke: 0.2, lighting: "warm_static",  audio: "meditative"    },
  CHALLENGE_SELECTION: { smoke: 0.4, lighting: "warm_static",  audio: "meditative"    },
  MENTOR_REVEAL:       { smoke: 0.5, lighting: "amber_pulse",  audio: "mentor_hum"    },
  IDENTITY_ENROLLMENT: { smoke: 0.3, lighting: "warm_static",  audio: "meditative"    },
  SYNCHRONIZATION:     { smoke: 1.0, lighting: "strobe_slow",  audio: "whisper_layer" },
  SWIPE_RITUAL:        { smoke: 0.6, lighting: "ember_steady", audio: "ritual_pulse",    mode: "KINETIC_FEEDBACK", atmosphereTension: 0.8  },
  LEGACY_HANDOFF:      { smoke: 1.0, lighting: "white_peak",   audio: "silence_break",   mode: "LOCKDOWN",         atmosphereTension: 1.0  },
};

// ── Route map ─────────────────────────────────────────────────────────────────

const ROUTES: Record<EFEStep, (craft?: string) => string> = {
  CRAFTHUB_SELECTION:   ()            => "/craft-hub",
  CINEMATIC_INTRO:      (c = "smoke") => `/experience/${c}`,
  EXPERIENCE_OVERVIEW:  (c = "smoke") => `/experience-overview/${c}`,
  CHALLENGE_SELECTION:  (c = "smoke") => `/experience/${c}`,
  MENTOR_REVEAL:        (c = "smoke") => `/experience/${c}`,
  IDENTITY_ENROLLMENT:  (c = "smoke") => `/experience/${c}`,
  SYNCHRONIZATION:      (c = "smoke") => `/synchronization/${c}`,
  SWIPE_RITUAL:         (c = "smoke") => `/experience/${c}`,
  // SPIRIT_CONSTRUCTION is an in-page overlay — stays on /experience/:type.
  SPIRIT_CONSTRUCTION:  (c = "smoke") => `/experience/${c}`,
  // LEGACY_HANDOFF route includes sessionId — built externally by handleFinish.
  LEGACY_HANDOFF:       (c = "smoke") => `/legacy-handoff/unknown/${c}`,
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

  /**
   * Advance from SWIPE_RITUAL to SPIRIT_CONSTRUCTION (pour-craft Step 10).
   * Only called for pour; other crafts skip directly to LEGACY_HANDOFF.
   */
  enterSpiritConstruction(): void {
    const s = load();
    save({ ...s, currentStep: "SPIRIT_CONSTRUCTION" });
    syncEnvironment("SPIRIT_CONSTRUCTION");
    triggerHaptics();
  },

  /**
   * True when the guest has accepted enough swipes to unlock the Signature Studio.
   * ExperiencePage increments "titan_swipe_accepts" in sessionStorage on each accepted swipe.
   * Default threshold: 3 accepted swipes.
   */
  isSignatureStudioEligible(threshold = 3): boolean {
    try {
      const ritualDone = sessionStorage.getItem("titan_ritual_complete") === "true";
      const accepts    = parseInt(sessionStorage.getItem("titan_swipe_accepts") ?? "0", 10);
      return ritualDone && accepts >= threshold;
    } catch { return false; }
  },

  /**
   * Mark SWIPE_RITUAL (or SPIRIT_CONSTRUCTION) complete — advances to LEGACY_HANDOFF.
   * Route is NOT returned here because it includes sessionId — ExperiencePage
   * builds the URL as `/legacy-handoff/:sessionId/:craftType` directly.
   */
  completeLegacy(): void {
    const s = load();
    save({ ...s, currentStep: "LEGACY_HANDOFF" });
    syncEnvironment("LEGACY_HANDOFF");
    triggerHaptics();
  },

  reset(): void {
    save({ currentStep: "CRAFTHUB_SELECTION", craftType: "smoke" });
  },
};
