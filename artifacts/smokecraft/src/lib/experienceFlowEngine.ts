/**
 * ExperienceFlowEngine — The Global Bridge
 * Titan V · 360 Enterprises Services LLC · Johnie Manuel Lee Collins
 *
 * Centralized navigation state manager for the 7-step cinematic guest ritual.
 * All "Next" button handlers call EFE.advance() instead of raw navigate().
 * isRitualUnlocked() gates flavor cards and swipe content until SYNCHRONIZATION.
 */

// ── Step sequence ──────────────────────────────────────────────────────────────

export type EFEStep =
  | "CRAFTHUB"
  | "CINEMATIC_INTRO"
  | "EXPERIENCE_OVERVIEW"
  | "MENTOR_REVEAL"
  | "IDENTITY_ENROLLMENT"
  | "SYNCHRONIZATION"
  | "SWIPE_RITUAL";

export const EFE_SEQUENCE: EFEStep[] = [
  "CRAFTHUB",
  "CINEMATIC_INTRO",
  "EXPERIENCE_OVERVIEW",
  "MENTOR_REVEAL",
  "IDENTITY_ENROLLMENT",
  "SYNCHRONIZATION",
  "SWIPE_RITUAL",
];

// Step at which ritual content unlocks — flavor cards, swipe recommendations
const UNLOCK_STEP: EFEStep = "SYNCHRONIZATION";

// ── Route map ─────────────────────────────────────────────────────────────────

const ROUTES: Record<EFEStep, (craft?: string) => string> = {
  CRAFTHUB:            ()           => "/craft-hub",
  CINEMATIC_INTRO:     (c = "smoke") => `/experience/${c}`,
  EXPERIENCE_OVERVIEW: (c = "smoke") => `/experience-overview/${c}`,
  MENTOR_REVEAL:       (c = "smoke") => `/experience/${c}`,
  IDENTITY_ENROLLMENT: (c = "smoke") => `/experience/${c}`,
  SYNCHRONIZATION:     (c = "smoke") => `/experience/${c}`,
  SWIPE_RITUAL:        (c = "smoke") => `/experience/${c}`,
};

// ── Persistent state — sessionStorage ────────────────────────────────────────

const SS_KEY = "titan_efe_v1";

interface EFEState {
  currentStep: EFEStep;
  craftType:   string;
}

function load(): EFEState {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (raw) return JSON.parse(raw) as EFEState;
  } catch { /* SSR / private mode */ }
  return { currentStep: "CRAFTHUB", craftType: "smoke" };
}

function save(state: EFEState): void {
  try { sessionStorage.setItem(SS_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

// ── Engine ────────────────────────────────────────────────────────────────────

export const ExperienceFlowEngine = {
  // ── Reads ──────────────────────────────────────────────────────────────────

  get currentStep(): EFEStep { return load().currentStep; },
  get craftType():   string  { return load().craftType;   },

  getRoute(step?: EFEStep): string {
    const s = load();
    return ROUTES[step ?? s.currentStep](s.craftType);
  },

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
  },

  /** Advance to next step; returns the route string to navigate to */
  advance(): string {
    const s   = load();
    const idx = EFE_SEQUENCE.indexOf(s.currentStep);
    const next = EFE_SEQUENCE[Math.min(idx + 1, EFE_SEQUENCE.length - 1)];
    save({ ...s, currentStep: next });
    return ROUTES[next](s.craftType);
  },

  /** Step back; returns the route string to navigate to */
  back(): string {
    const s    = load();
    const idx  = EFE_SEQUENCE.indexOf(s.currentStep);
    const prev = EFE_SEQUENCE[Math.max(0, idx - 1)];
    save({ ...s, currentStep: prev });
    return ROUTES[prev](s.craftType);
  },

  /**
   * Start a new craft journey from CraftHub.
   * Sets craft, advances to CINEMATIC_INTRO, returns the route.
   */
  startCraft(craftType: string): string {
    save({ currentStep: "CINEMATIC_INTRO", craftType });
    return ROUTES["CINEMATIC_INTRO"](craftType);
  },

  /**
   * Mark SYNCHRONIZATION complete — unlocks ritual content.
   * Returns SWIPE_RITUAL route.
   */
  completeSynchronization(): string {
    const s = load();
    save({ ...s, currentStep: "SYNCHRONIZATION" });
    return ROUTES["SWIPE_RITUAL"](s.craftType);
  },

  reset(): void {
    save({ currentStep: "CRAFTHUB", craftType: "smoke" });
  },
};
