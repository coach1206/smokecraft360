/**
 * emotionalStateStore — EmotionalContinuityEngine
 *
 * Tracks the guest's emotional journey state across all routes.
 * Persists to sessionStorage so state survives navigation without resetting.
 *
 * Architecture: pure TS singleton, subscribe/notify pattern (same shape as
 * environmentEngine). No React dependencies — consumed via useEmotionalContinuity hook.
 *
 * Ritual Journey:  onboarding → mentor_selection → sensory_foundation →
 *                  artisan_engine → pairing_ritual → ordering → completion
 *
 * Escalation Arc:  DORMANT → AWAKENING → RESONATING → IMMERSED → SYNCHRONIZED
 * Ritual States:   CURIOUS · EXPLORING · FOCUSED · IMMERSED · SYNCHRONIZED · FATIGUED
 */

// ── Public types ───────────────────────────────────────────────────────────────

export type EscalationLevel =
  | "DORMANT"
  | "AWAKENING"
  | "RESONATING"
  | "IMMERSED"
  | "SYNCHRONIZED";

export type RitualState =
  | "CURIOUS"
  | "EXPLORING"
  | "FOCUSED"
  | "IMMERSED"
  | "SYNCHRONIZED"
  | "FATIGUED";

export type RitualPhase =
  | "onboarding"
  | "mentor_selection"
  | "sensory_foundation"
  | "artisan_engine"
  | "pairing_ritual"
  | "ordering"
  | "completion";

export type InterruptionWindow = "OPEN" | "CAUTION" | "CLOSED";

export interface StaffWhisper {
  id:       string;
  message:  string;
  category: "confidence" | "pacing" | "premium" | "pairing" | "fatigue" | "immersion";
  urgency:  "low" | "medium" | "high";
  ts:       number;
}

export interface EmotionalState {
  // ── Journey ──────────────────────────────────────────────────────────────
  ritualPhase:     RitualPhase;
  ritualDepth:     number;   // 0–100: cumulative progress through the ritual arc

  // ── Behavioral metrics ───────────────────────────────────────────────────
  confidence:      number;   // 0–100: exploration confidence — rises with decisive picks
  hesitationScore: number;   // 0–100: high = pausing, uncertain; low = decisive
  momentum:        number;   // 0–100: forward energy across interactions
  immersionDepth:  number;   // 0–100: depth of engagement
  emotionalIntensity: number; // 0–100: combined activation score

  // ── Sensory continuity ───────────────────────────────────────────────────
  selectedFlavor:  string | null;
  mentorResonance: string | null;
  sensorySyncPct:  number;   // 0–100: alignment between mentor + flavor choice

  // ── Commercial intelligence ──────────────────────────────────────────────
  premiumIntentProbability: number;   // 0–100
  pairingLikelihood:        number;   // 0–100
  recommendationAcceptance: number;   // 0–100

  // ── Derived classifications (auto-computed) ──────────────────────────────
  escalationLevel:    EscalationLevel;
  ritualState:        RitualState;
  interruptionWindow: InterruptionWindow;

  // ── Staff intelligence ───────────────────────────────────────────────────
  staffWhispers: StaffWhisper[];

  // ── Session bookkeeping ──────────────────────────────────────────────────
  interactionCount: number;
  sessionStartMs:   number;
  lastInteractionMs: number;
}

// ── Escalation level derivation ────────────────────────────────────────────────

function deriveEscalationLevel(immersionDepth: number): EscalationLevel {
  if (immersionDepth >= 80) return "SYNCHRONIZED";
  if (immersionDepth >= 60) return "IMMERSED";
  if (immersionDepth >= 40) return "RESONATING";
  if (immersionDepth >= 18) return "AWAKENING";
  return "DORMANT";
}

// ── Ritual state derivation ────────────────────────────────────────────────────

function deriveRitualState(s: EmotionalState): RitualState {
  const sessionMs = Date.now() - s.sessionStartMs;

  // Fatigue: long session + low momentum
  if (sessionMs > 8 * 60 * 1000 && s.momentum < 25) return "FATIGUED";

  // Synchronized: very deep immersion + high momentum
  if (s.immersionDepth > 82 && s.momentum > 78) return "SYNCHRONIZED";

  // Immersed: high immersion, active
  if (s.immersionDepth > 68) return "IMMERSED";

  // Focused: high confidence, low hesitation
  if (s.confidence > 65 && s.hesitationScore < 35) return "FOCUSED";

  // Curious: low confidence, high hesitation
  if (s.confidence < 35 && s.hesitationScore > 60) return "CURIOUS";

  return "EXPLORING";
}

// ── Interruption window derivation ────────────────────────────────────────────

function deriveInterruptionWindow(s: EmotionalState): InterruptionWindow {
  if (s.immersionDepth > 70 || s.ritualState === "IMMERSED" || s.ritualState === "SYNCHRONIZED") {
    return "CLOSED";
  }
  if (s.immersionDepth > 40 || s.ritualState === "FOCUSED") {
    return "CAUTION";
  }
  return "OPEN";
}

// ── Staff whisper generation ───────────────────────────────────────────────────

let whisperCounter = 0;

function generateStaffWhispers(s: EmotionalState): StaffWhisper[] {
  const whispers: StaffWhisper[] = [];

  const add = (
    message:  string,
    category: StaffWhisper["category"],
    urgency:  StaffWhisper["urgency"],
  ) => {
    whispers.push({ id: `w-${++whisperCounter}`, message, category, urgency, ts: Date.now() });
  };

  // Confidence signals
  if (s.confidence >= 75 && s.immersionDepth >= 50) {
    add("Guest confidence rising rapidly.", "confidence", "medium");
  } else if (s.confidence <= 30 && s.interactionCount > 2) {
    add("Guest showing signs of uncertainty — gentle guidance advised.", "confidence", "medium");
  }

  // Premium intent
  if (s.premiumIntentProbability >= 72) {
    add(`High likelihood of premium pairing acceptance.`, "premium", "high");
  }
  if (s.premiumIntentProbability >= 88) {
    add(`Pairing recommendation confidence: ${s.premiumIntentProbability}%`, "pairing", "high");
  }

  // Immersion depth
  if (s.immersionDepth >= 70) {
    add("Guest deeply immersed — avoid interruption.", "immersion", "high");
  } else if (s.immersionDepth >= 45) {
    add("Guest entering immersion phase — timing window narrowing.", "immersion", "medium");
  }

  // Pairing likelihood
  if (s.pairingLikelihood >= 65) {
    add(`Pairing likelihood elevated to ${s.pairingLikelihood}% — introduce complementary notes.`, "pairing", "medium");
  }

  // Fatigue
  if (s.ritualState === "FATIGUED") {
    add("Guest showing exploration fatigue — recommend a selection.", "fatigue", "high");
  }

  // Momentum
  if (s.momentum >= 80) {
    add("Momentum is strong — allow the ritual to flow.", "pacing", "low");
  }

  // Interruption window advisory
  if (s.interruptionWindow === "OPEN" && s.interactionCount >= 1) {
    add("Optimal interruption window — staff approach recommended.", "pacing", "medium");
  }

  // Sensory sync
  if (s.sensorySyncPct >= 80) {
    add(`Sensory profile synchronized — ${s.selectedFlavor} archetype locked.`, "immersion", "low");
  }

  // Return most relevant (highest urgency first, max 4)
  return whispers
    .sort((a, b) => (b.urgency === "high" ? 1 : 0) - (a.urgency === "high" ? 1 : 0))
    .slice(0, 4);
}

// ── Default state ─────────────────────────────────────────────────────────────

const STORAGE_KEY = "novee_emotional_state_v1";

function buildDefault(): EmotionalState {
  return {
    ritualPhase:              "onboarding",
    ritualDepth:              0,
    confidence:               20,
    hesitationScore:          55,
    momentum:                 15,
    immersionDepth:           0,
    emotionalIntensity:       10,
    selectedFlavor:           null,
    mentorResonance:          null,
    sensorySyncPct:           0,
    premiumIntentProbability: 30,
    pairingLikelihood:        20,
    recommendationAcceptance: 35,
    escalationLevel:          "DORMANT",
    ritualState:              "CURIOUS",
    interruptionWindow:       "OPEN",
    staffWhispers:            [],
    interactionCount:         0,
    sessionStartMs:           Date.now(),
    lastInteractionMs:        Date.now(),
  };
}

// ── Clamp helper ──────────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// ── EmotionalStateStore ───────────────────────────────────────────────────────

type Listener = (state: EmotionalState) => void;

// Phase ordering for ritual depth calculation
const PHASE_DEPTH: Record<RitualPhase, number> = {
  onboarding:         0,
  mentor_selection:   16,
  sensory_foundation: 32,
  artisan_engine:     50,
  pairing_ritual:     68,
  ordering:           84,
  completion:         100,
};

class EmotionalStateStore {
  private state:     EmotionalState;
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.state = this.hydrate();
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  private hydrate(): EmotionalState {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return buildDefault();
      const saved = JSON.parse(raw) as Partial<EmotionalState>;
      const base  = buildDefault();
      // Merge scalar fields — but recompute derived fields fresh
      const merged: EmotionalState = {
        ...base,
        ritualPhase:              saved.ritualPhase              ?? base.ritualPhase,
        confidence:               saved.confidence               ?? base.confidence,
        hesitationScore:          saved.hesitationScore          ?? base.hesitationScore,
        momentum:                 saved.momentum                 ?? base.momentum,
        immersionDepth:           saved.immersionDepth           ?? base.immersionDepth,
        emotionalIntensity:       saved.emotionalIntensity       ?? base.emotionalIntensity,
        selectedFlavor:           saved.selectedFlavor           ?? base.selectedFlavor,
        mentorResonance:          saved.mentorResonance          ?? base.mentorResonance,
        sensorySyncPct:           saved.sensorySyncPct           ?? base.sensorySyncPct,
        premiumIntentProbability: saved.premiumIntentProbability ?? base.premiumIntentProbability,
        pairingLikelihood:        saved.pairingLikelihood        ?? base.pairingLikelihood,
        recommendationAcceptance: saved.recommendationAcceptance ?? base.recommendationAcceptance,
        interactionCount:         saved.interactionCount         ?? base.interactionCount,
        sessionStartMs:           saved.sessionStartMs           ?? base.sessionStartMs,
        // Always reset last-interaction to now on hydration (new page load = new interaction)
        lastInteractionMs:        Date.now(),
      };
      merged.ritualDepth         = PHASE_DEPTH[merged.ritualPhase];
      merged.escalationLevel     = deriveEscalationLevel(merged.immersionDepth);
      merged.ritualState         = deriveRitualState(merged);
      merged.interruptionWindow  = deriveInterruptionWindow(merged);
      merged.staffWhispers       = generateStaffWhispers(merged);
      return merged;
    } catch {
      return buildDefault();
    }
  }

  private persist(): void {
    try {
      const snapshot: Partial<EmotionalState> = {
        ritualPhase:              this.state.ritualPhase,
        confidence:               this.state.confidence,
        hesitationScore:          this.state.hesitationScore,
        momentum:                 this.state.momentum,
        immersionDepth:           this.state.immersionDepth,
        emotionalIntensity:       this.state.emotionalIntensity,
        selectedFlavor:           this.state.selectedFlavor,
        mentorResonance:          this.state.mentorResonance,
        sensorySyncPct:           this.state.sensorySyncPct,
        premiumIntentProbability: this.state.premiumIntentProbability,
        pairingLikelihood:        this.state.pairingLikelihood,
        recommendationAcceptance: this.state.recommendationAcceptance,
        interactionCount:         this.state.interactionCount,
        sessionStartMs:           this.state.sessionStartMs,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch { /* sessionStorage unavailable — soft fail */ }
  }

  // ── Subscribe/notify ─────────────────────────────────────────────────────────

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l({ ...this.state });
  }

  getState(): EmotionalState {
    return { ...this.state };
  }

  // ── Internal state update helper ─────────────────────────────────────────────

  private update(partial: Partial<EmotionalState>): void {
    const next = { ...this.state, ...partial };
    next.escalationLevel    = deriveEscalationLevel(next.immersionDepth);
    next.ritualState        = deriveRitualState(next);
    next.interruptionWindow = deriveInterruptionWindow(next);
    next.staffWhispers      = generateStaffWhispers(next);
    this.state              = next;
    this.notify();
    this.persist();
  }

  // ── Public mutations ──────────────────────────────────────────────────────────

  /** Advance to a new ritual phase — increases ritualDepth, boosts immersion */
  advancePhase(phase: RitualPhase): void {
    const targetDepth = PHASE_DEPTH[phase];
    if (targetDepth <= this.state.ritualDepth) return;

    this.update({
      ritualPhase:     phase,
      ritualDepth:     targetDepth,
      immersionDepth:  clamp(this.state.immersionDepth + 14, 0, 100),
      momentum:        clamp(this.state.momentum + 12, 0, 100),
      emotionalIntensity: clamp(this.state.emotionalIntensity + 8, 0, 100),
      lastInteractionMs: Date.now(),
      interactionCount: this.state.interactionCount + 1,
    });
  }

  /** Record a flavor card selection — sharpens sensory direction, boosts confidence */
  recordFlavorSelection(flavorId: string): void {
    const sensorySyncBoost = this.state.mentorResonance ? 28 : 18; // more sync if mentor was set
    this.update({
      selectedFlavor:           flavorId,
      confidence:               clamp(this.state.confidence + 18, 0, 100),
      hesitationScore:          clamp(this.state.hesitationScore - 14, 0, 100),
      momentum:                 clamp(this.state.momentum + 16, 0, 100),
      immersionDepth:           clamp(this.state.immersionDepth + 22, 0, 100),
      sensorySyncPct:           clamp(this.state.sensorySyncPct + sensorySyncBoost, 0, 100),
      emotionalIntensity:       clamp(this.state.emotionalIntensity + 14, 0, 100),
      premiumIntentProbability: clamp(this.state.premiumIntentProbability + 12, 0, 100),
      pairingLikelihood:        clamp(this.state.pairingLikelihood + 18, 0, 100),
      recommendationAcceptance: clamp(this.state.recommendationAcceptance + 10, 0, 100),
      ritualPhase:              "sensory_foundation",
      ritualDepth:              Math.max(this.state.ritualDepth, PHASE_DEPTH["sensory_foundation"]),
      lastInteractionMs:        Date.now(),
      interactionCount:         this.state.interactionCount + 1,
    });
  }

  /** Record mentor selection — sets resonance, boosts confidence + pairing alignment */
  recordMentorSelection(mentorName: string): void {
    this.update({
      mentorResonance:          mentorName,
      confidence:               clamp(this.state.confidence + 10, 0, 100),
      hesitationScore:          clamp(this.state.hesitationScore - 8, 0, 100),
      momentum:                 clamp(this.state.momentum + 10, 0, 100),
      immersionDepth:           clamp(this.state.immersionDepth + 12, 0, 100),
      pairingLikelihood:        clamp(this.state.pairingLikelihood + 10, 0, 100),
      ritualPhase:              "mentor_selection",
      ritualDepth:              Math.max(this.state.ritualDepth, PHASE_DEPTH["mentor_selection"]),
      lastInteractionMs:        Date.now(),
      interactionCount:         this.state.interactionCount + 1,
    });
  }

  /** Generic interaction — mild confidence boost, slight hesitation reduction */
  recordInteraction(): void {
    const timeSinceLast = Date.now() - this.state.lastInteractionMs;
    const isHesitating  = timeSinceLast > 6000; // 6 seconds between interactions = hesitation
    this.update({
      confidence:       clamp(this.state.confidence + (isHesitating ? 4 : 8), 0, 100),
      hesitationScore:  clamp(this.state.hesitationScore + (isHesitating ? 6 : -6), 0, 100),
      momentum:         clamp(this.state.momentum + (isHesitating ? -4 : 6), 0, 100),
      lastInteractionMs: Date.now(),
      interactionCount:  this.state.interactionCount + 1,
    });
  }

  /** Clear session — called by System Purge */
  purge(): void {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    this.state = buildDefault();
    this.notify();
  }
}

// ── Singleton export ───────────────────────────────────────────────────────────

export const emotionalStateStore = new EmotionalStateStore();
