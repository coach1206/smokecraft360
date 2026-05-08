/**
 * ExperienceStateEngine — Guest state, emotional pacing, and session continuity.
 *
 * The central state machine for the guest-facing experience layer.
 * All other engines read from or react to this engine's state.
 *
 * Journey stages:
 *   idle → discovery → exploration → immersion → mastery → handoff
 *
 * Emotional pacing:
 *   ambient → building → peak → cooling
 *
 * Usage:
 *   ExperienceStateEngine.setStage("immersion");
 *   ExperienceStateEngine.subscribe(state => updateUI(state));
 */

export type JourneyStage =
  | "idle"
  | "discovery"
  | "exploration"
  | "immersion"
  | "mastery"
  | "handoff"
  | "returning";

export type EmotionalPacing =
  | "ambient"    // guest just arrived — slow, breathing
  | "building"   // engagement growing — increasing rhythm
  | "peak"       // fully immersed — full atmospheric intensity
  | "cooling"    // post-reveal / post-order — settling back down
  | "suspended"; // staff handoff — environment held

export type CraftType = "smoke" | "pour" | "brew" | "vape" | null;

export interface ExperienceState {
  stage:          JourneyStage;
  pacing:         EmotionalPacing;
  activeCraft:    CraftType;
  swipeDepth:     number;        // how many swipes in current session
  engagementScore: number;       // 0–100, drives atmosphere intensity
  mentorActive:   boolean;
  sessionId:      string | null;
  guestProfileId: string | null;
  enteredAt:      number;        // epoch ms when session started
  lastInteraction: number;       // epoch ms of last guest action
  isStaffHandoff: boolean;
}

type Listener = (state: ExperienceState) => void;

class ExperienceStateEngineClass {
  private state: ExperienceState = {
    stage:           "idle",
    pacing:          "ambient",
    activeCraft:     null,
    swipeDepth:      0,
    engagementScore: 0,
    mentorActive:    false,
    sessionId:       null,
    guestProfileId:  null,
    enteredAt:       Date.now(),
    lastInteraction: Date.now(),
    isStaffHandoff:  false,
  };

  private listeners = new Set<Listener>();

  // ── Public getters ────────────────────────────────────────────────────────

  getState(): ExperienceState {
    return { ...this.state };
  }

  getStage(): JourneyStage {
    return this.state.stage;
  }

  getPacing(): EmotionalPacing {
    return this.state.pacing;
  }

  getEngagementScore(): number {
    return this.state.engagementScore;
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  setStage(stage: JourneyStage): void {
    if (this.state.stage === stage) return;
    this.state = { ...this.state, stage };
    this.derivePacing();
    this.emit();
  }

  setCraft(craft: CraftType): void {
    if (this.state.activeCraft === craft) return;
    const wasIdle = this.state.stage === "idle";
    this.state = {
      ...this.state,
      activeCraft: craft,
      stage:       craft === null ? "idle" : wasIdle ? "discovery" : this.state.stage,
      lastInteraction: Date.now(),
    };
    this.derivePacing();
    this.emit();
  }

  recordSwipe(): void {
    const depth = this.state.swipeDepth + 1;
    const score = Math.min(100, this.state.engagementScore + 8);
    const stage: JourneyStage =
      depth >= 12 ? "mastery"
      : depth >= 6 ? "immersion"
      : depth >= 2 ? "exploration"
      : "discovery";

    this.state = {
      ...this.state,
      swipeDepth:      depth,
      engagementScore: score,
      stage,
      lastInteraction: Date.now(),
    };
    this.derivePacing();
    this.emit();
  }

  setMentorActive(active: boolean): void {
    if (this.state.mentorActive === active) return;
    this.state = { ...this.state, mentorActive: active };
    this.emit();
  }

  beginHandoff(): void {
    this.state = {
      ...this.state,
      isStaffHandoff: true,
      pacing:         "suspended",
    };
    this.emit();
  }

  releaseHandoff(): void {
    this.state = {
      ...this.state,
      isStaffHandoff:  false,
      lastInteraction: Date.now(),
    };
    this.derivePacing();
    this.emit();
  }

  bindSession(sessionId: string, guestProfileId?: string): void {
    this.state = {
      ...this.state,
      sessionId,
      guestProfileId: guestProfileId ?? this.state.guestProfileId,
    };
    this.emit();
  }

  resetSession(): void {
    this.state = {
      stage:           "idle",
      pacing:          "ambient",
      activeCraft:     null,
      swipeDepth:      0,
      engagementScore: 0,
      mentorActive:    false,
      sessionId:       null,
      guestProfileId:  null,
      enteredAt:       Date.now(),
      lastInteraction: Date.now(),
      isStaffHandoff:  false,
    };
    this.emit();
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private derivePacing(): void {
    if (this.state.isStaffHandoff) { this.state.pacing = "suspended"; return; }
    const { engagementScore, stage } = this.state;
    let pacing: EmotionalPacing = "ambient";
    if      (stage === "idle")       pacing = "ambient";
    else if (engagementScore >= 75)  pacing = "peak";
    else if (engagementScore >= 40)  pacing = "building";
    else if (stage === "returning")  pacing = "cooling";
    else                             pacing = "ambient";
    this.state.pacing = pacing;
  }

  // ── Subscription ─────────────────────────────────────────────────────────

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    const snap = this.getState();
    this.listeners.forEach(fn => fn(snap));
  }
}

export const ExperienceStateEngine = new ExperienceStateEngineClass();
