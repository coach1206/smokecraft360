/**
 * SovereignExperienceOrchestrator
 *
 * Master state engine for the SmokeCraft / NOVEE OS experience.
 * Controls the single continuous journey — progression phases,
 * cinematic pacing, atmosphere, mentor influence, session persistence,
 * and transition timing.
 *
 * Architecture: singleton service — import { SovereignOrchestrator }
 * and call methods directly. React components subscribe via
 * useSovereignOrchestrator() hook.
 */

// ── Phase definitions ─────────────────────────────────────────────────────────

export type ExperiencePhase =
  | "boot"              // sovereign boot sequence
  | "craft_hub"         // four-portal craft selection
  | "ritual_intro"      // smokecraft ritual introduction
  | "profile_identity"  // palate + flavor identity
  | "mentor_selection"  // mentor pairing
  | "leaf_education"    // leaf profiles + regional science
  | "blend_construction" // master blend assembly
  | "cut_and_light"     // cut + lighting ritual
  | "pairing_intel"     // AI pairing intelligence
  | "inventory_match"   // venue inventory comparison
  | "xp_rewards"        // XP reveal + reward delivery
  | "leaderboard"       // prestige leaderboard
  | "loyalty_return";   // loyalty + return progression

export type CraftType = "smoke" | "pour" | "brew" | "wine";

export interface ExperienceSession {
  sessionId:       string;
  craftType:       CraftType;
  phase:           ExperiencePhase;
  guestId:         string | null;
  mentorId:        string | null;
  flavorProfile:   FlavorProfile;
  xp:              number;
  startedAt:       number;
  lastActiveAt:    number;
  phaseHistory:    ExperiencePhase[];
  scrollPosition:  number;
  activeRoute:     string;
  onboardingDone:  boolean;
}

export interface FlavorProfile {
  strength:   number; // 0–100
  body:       number; // 0–100
  complexity: number; // 0–100
  mood:       string;
  notes:      string[];
}

// ── Atmosphere configuration per phase ───────────────────────────────────────

export interface AtmosphereConfig {
  smokeIntensity:  number; // 0–1
  emberDensity:    number; // 0–1
  glowPulse:       "slow" | "medium" | "fast" | "off";
  ambientLighting: "warm" | "neutral" | "cool";
  transitionEase:  [number, number, number, number]; // cubic-bezier
  pauseMs:         number; // inter-phase pause
}

const PHASE_ATMOSPHERE: Record<ExperiencePhase, AtmosphereConfig> = {
  boot:              { smokeIntensity: 0.0, emberDensity: 0.0, glowPulse: "off",    ambientLighting: "cool",    transitionEase: [0.22, 1, 0.36, 1], pauseMs: 400 },
  craft_hub:         { smokeIntensity: 0.4, emberDensity: 0.3, glowPulse: "slow",   ambientLighting: "warm",    transitionEase: [0.25, 0.1, 0.25, 1], pauseMs: 320 },
  ritual_intro:      { smokeIntensity: 0.8, emberDensity: 0.5, glowPulse: "slow",   ambientLighting: "warm",    transitionEase: [0.22, 1, 0.36, 1], pauseMs: 600 },
  profile_identity:  { smokeIntensity: 0.5, emberDensity: 0.3, glowPulse: "medium", ambientLighting: "warm",    transitionEase: [0.4, 0, 0.2, 1],   pauseMs: 280 },
  mentor_selection:  { smokeIntensity: 0.6, emberDensity: 0.4, glowPulse: "slow",   ambientLighting: "warm",    transitionEase: [0.22, 1, 0.36, 1], pauseMs: 500 },
  leaf_education:    { smokeIntensity: 0.55, emberDensity: 0.35, glowPulse: "slow", ambientLighting: "warm",    transitionEase: [0.4, 0, 0.2, 1],   pauseMs: 320 },
  blend_construction:{ smokeIntensity: 0.7, emberDensity: 0.6, glowPulse: "medium", ambientLighting: "warm",    transitionEase: [0.4, 0, 0.2, 1],   pauseMs: 300 },
  cut_and_light:     { smokeIntensity: 0.9, emberDensity: 0.8, glowPulse: "fast",   ambientLighting: "warm",    transitionEase: [0.22, 1, 0.36, 1], pauseMs: 700 },
  pairing_intel:     { smokeIntensity: 0.5, emberDensity: 0.4, glowPulse: "slow",   ambientLighting: "neutral", transitionEase: [0.4, 0, 0.2, 1],   pauseMs: 350 },
  inventory_match:   { smokeIntensity: 0.3, emberDensity: 0.2, glowPulse: "slow",   ambientLighting: "neutral", transitionEase: [0.25, 0.1, 0.25, 1], pauseMs: 260 },
  xp_rewards:        { smokeIntensity: 0.6, emberDensity: 0.7, glowPulse: "fast",   ambientLighting: "warm",    transitionEase: [0.22, 1, 0.36, 1], pauseMs: 800 },
  leaderboard:       { smokeIntensity: 0.4, emberDensity: 0.5, glowPulse: "medium", ambientLighting: "warm",    transitionEase: [0.4, 0, 0.2, 1],   pauseMs: 400 },
  loyalty_return:    { smokeIntensity: 0.3, emberDensity: 0.3, glowPulse: "slow",   ambientLighting: "warm",    transitionEase: [0.25, 0.1, 0.25, 1], pauseMs: 500 },
};

// ── Route map — phase → canonical route ──────────────────────────────────────

const PHASE_ROUTE: Record<ExperiencePhase, string> = {
  boot:               "/",
  craft_hub:          "/craft-hub",
  ritual_intro:       "/master-blender",
  profile_identity:   "/smokecraft",
  mentor_selection:   "/smokecraft",
  leaf_education:     "/master-blender",
  blend_construction: "/master-blender",
  cut_and_light:      "/master-blender",
  pairing_intel:      "/reveal/smoke",
  inventory_match:    "/reveal/smoke",
  xp_rewards:         "/reveal/smoke",
  leaderboard:        "/craft-hub",
  loyalty_return:     "/craft-hub",
};

// ── Priority ordering for phase transitions ───────────────────────────────────

const PHASE_ORDER: ExperiencePhase[] = [
  "boot",
  "craft_hub",
  "ritual_intro",
  "profile_identity",
  "mentor_selection",
  "leaf_education",
  "blend_construction",
  "cut_and_light",
  "pairing_intel",
  "inventory_match",
  "xp_rewards",
  "leaderboard",
  "loyalty_return",
];

// ── Persistence key ───────────────────────────────────────────────────────────

const STORAGE_KEY = "sovereign_experience_session";

// ── Listener type ─────────────────────────────────────────────────────────────

type OrchestratorListener = (session: ExperienceSession) => void;

// ── Orchestrator singleton ────────────────────────────────────────────────────

class SovereignExperienceOrchestratorClass {
  private session: ExperienceSession;
  private listeners: Set<OrchestratorListener> = new Set();
  private transitionLock = false;

  constructor() {
    this.session = this.loadSession() ?? this.createSession();
  }

  // ── Session lifecycle ───────────────────────────────────────────────────────

  private createSession(craftType: CraftType = "smoke"): ExperienceSession {
    return {
      sessionId:      `sov_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      craftType,
      phase:          "craft_hub",
      guestId:        null,
      mentorId:       null,
      flavorProfile:  { strength: 50, body: 50, complexity: 50, mood: "deep", notes: [] },
      xp:             0,
      startedAt:      Date.now(),
      lastActiveAt:   Date.now(),
      phaseHistory:   [],
      scrollPosition: 0,
      activeRoute:    "/craft-hub",
      onboardingDone: false,
    };
  }

  private loadSession(): ExperienceSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw) as ExperienceSession;
      // Validate — if stale (>8 hours) create fresh
      if (Date.now() - s.lastActiveAt > 8 * 60 * 60 * 1000) return null;
      return s;
    } catch {
      return null;
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.session));
    } catch { /* storage unavailable */ }
  }

  private notify(): void {
    for (const fn of this.listeners) fn({ ...this.session });
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  getSession(): ExperienceSession {
    return { ...this.session };
  }

  hasResumableSession(): boolean {
    const s = this.loadSession();
    if (!s) return false;
    return s.phase !== "craft_hub" && s.phase !== "boot";
  }

  getAtmosphere(): AtmosphereConfig {
    return PHASE_ATMOSPHERE[this.session.phase];
  }

  getPhaseRoute(phase?: ExperiencePhase): string {
    return PHASE_ROUTE[phase ?? this.session.phase];
  }

  getCurrentPhaseIndex(): number {
    return PHASE_ORDER.indexOf(this.session.phase);
  }

  getNextPhase(): ExperiencePhase | null {
    const idx = this.getCurrentPhaseIndex();
    if (idx === -1 || idx >= PHASE_ORDER.length - 1) return null;
    return PHASE_ORDER[idx + 1] ?? null;
  }

  // ── Transitions ─────────────────────────────────────────────────────────────

  async transitionTo(phase: ExperiencePhase, meta?: Partial<ExperienceSession>): Promise<void> {
    if (this.transitionLock) return;
    this.transitionLock = true;

    const atmos = PHASE_ATMOSPHERE[phase];

    try {
      // Brief cinematic pause before phase change
      await new Promise(r => setTimeout(r, atmos.pauseMs));

      this.session = {
        ...this.session,
        ...meta,
        phase,
        phaseHistory: [...this.session.phaseHistory, this.session.phase],
        activeRoute:  PHASE_ROUTE[phase],
        lastActiveAt: Date.now(),
      };

      this.persist();
      this.notify();
    } finally {
      this.transitionLock = false;
    }
  }

  startCraft(craftType: CraftType): void {
    this.session = {
      ...this.session,
      craftType,
      lastActiveAt: Date.now(),
    };
    this.persist();
    this.notify();
  }

  setGuest(guestId: string): void {
    this.session = { ...this.session, guestId, lastActiveAt: Date.now() };
    this.persist();
    this.notify();
  }

  setMentor(mentorId: string): void {
    this.session = { ...this.session, mentorId, lastActiveAt: Date.now() };
    this.persist();
    this.notify();
  }

  updateFlavorProfile(update: Partial<FlavorProfile>): void {
    this.session = {
      ...this.session,
      flavorProfile: { ...this.session.flavorProfile, ...update },
      lastActiveAt: Date.now(),
    };
    this.persist();
    this.notify();
  }

  addXP(amount: number): void {
    this.session = { ...this.session, xp: this.session.xp + amount, lastActiveAt: Date.now() };
    this.persist();
    this.notify();
  }

  saveScrollPosition(y: number): void {
    this.session = { ...this.session, scrollPosition: y, lastActiveAt: Date.now() };
    this.persist();
  }

  markOnboardingDone(): void {
    this.session = { ...this.session, onboardingDone: true, lastActiveAt: Date.now() };
    this.persist();
    this.notify();
  }

  resetSession(craftType: CraftType = "smoke"): void {
    this.session = this.createSession(craftType);
    this.persist();
    this.notify();
  }

  // ── Subscriptions ───────────────────────────────────────────────────────────

  subscribe(fn: OrchestratorListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const SovereignOrchestrator = new SovereignExperienceOrchestratorClass();
