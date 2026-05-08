/**
 * ExperienceFlowOrchestrator — Guest journey progression and flow orchestration.
 *
 * Manages the full guest journey lifecycle:
 *   enrollment → mentor reveal → craft selection → swipe experience
 *   → recommendation reveal → order → receipt
 *
 * Controls:
 *   - When to surface mentor timing cues
 *   - Adaptive recommendation pacing (fast/slow based on engagement)
 *   - Unlock progression thresholds
 *   - Mood discovery flow timing
 *   - Recap and session wrap transitions
 *
 * Produces flow events that UI components subscribe to for pacing
 * their content presentation. Nothing renders here — this is pure
 * orchestration logic.
 *
 * Usage:
 *   ExperienceFlowOrchestrator.start();
 *   ExperienceFlowOrchestrator.onFlowEvent(event => applyPacing(event));
 *   ExperienceFlowOrchestrator.recordMilestone("first_swipe");
 */

import { ExperienceStateEngine, type JourneyStage } from "./ExperienceStateEngine";
import { SignalVisualizationEngine }                  from "./SignalVisualizationEngine";

export type FlowMilestone =
  | "session_start"
  | "craft_selected"
  | "first_swipe"
  | "fifth_swipe"
  | "tenth_swipe"
  | "mentor_introduced"
  | "reveal_unlocked"
  | "order_initiated"
  | "order_confirmed"
  | "receipt_generated"
  | "challenge_started"
  | "challenge_completed"
  | "mastery_unlocked";

export type FlowEventType =
  | "mentor_cue"           // time to surface the mentor
  | "recommendation_ready" // confidence high enough to show recommendations
  | "unlock_progress"      // XP or mastery threshold crossed
  | "pacing_shift"         // recommendation cadence should change
  | "recap_trigger"        // session summary should appear
  | "idle_prompt"          // guest has been idle — gentle re-engagement
  | "mood_discovery_next"  // advance to next mood question
  | "journey_complete";    // guest has completed the full experience loop

export interface FlowEvent {
  type:       FlowEventType;
  milestone?: FlowMilestone;
  data:       Record<string, unknown>;
  ts:         number;
}

export interface FlowState {
  milestones:          Set<FlowMilestone>;
  currentStage:        JourneyStage;
  recommendationPace:  "slow" | "balanced" | "fast";
  mentorReady:         boolean;
  revealReady:         boolean;
  idleSinceMs:         number | null;
  totalFlowTimeMs:     number;
}

type FlowListener = (event: FlowEvent) => void;

// Milestone unlock thresholds
const REVEAL_UNLOCK_SWIPES = 5;
const MENTOR_CUE_SWIPES    = 2;
const FAST_PACE_SWIPES     = 8;

const IDLE_THRESHOLD_MS = 45_000; // 45s of no interaction = idle prompt

class ExperienceFlowOrchestratorClass {
  private state: FlowState = {
    milestones:         new Set(),
    currentStage:       "idle",
    recommendationPace: "balanced",
    mentorReady:        false,
    revealReady:        false,
    idleSinceMs:        null,
    totalFlowTimeMs:    0,
  };

  private listeners   = new Set<FlowListener>();
  private idleTimer:   ReturnType<typeof setTimeout>  | null = null;
  private flowTimer:   ReturnType<typeof setInterval> | null = null;
  private startedAt:   number = Date.now();

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  start(): void {
    this.startedAt = Date.now();
    this.recordMilestone("session_start");
    SignalVisualizationEngine.start();

    // Flow tick every 10s — checks idle, updates pace
    this.flowTimer = setInterval(() => this.flowTick(), 10_000);

    // Sync with ExperienceStateEngine
    ExperienceStateEngine.subscribe(expState => {
      this.state.currentStage = expState.stage;
      this.resetIdleTimer();
    });
  }

  stop(): void {
    if (this.flowTimer)  clearInterval(this.flowTimer);
    if (this.idleTimer)  clearTimeout(this.idleTimer);
    SignalVisualizationEngine.stop();
    this.flowTimer = null;
    this.idleTimer = null;
  }

  // ── Milestone recording ───────────────────────────────────────────────────

  recordMilestone(milestone: FlowMilestone): void {
    if (this.state.milestones.has(milestone)) return;
    this.state.milestones.add(milestone);

    // Derive flow events from milestones
    this.evaluateMilestone(milestone);
    this.resetIdleTimer();
  }

  hasMilestone(milestone: FlowMilestone): boolean {
    return this.state.milestones.has(milestone);
  }

  // ── Interaction signals ───────────────────────────────────────────────────

  /** Call on every swipe to advance pacing. */
  onSwipe(swipeIndex: number): void {
    ExperienceStateEngine.recordSwipe();
    SignalVisualizationEngine.fireSignal("recommendation_fire", 60 + swipeIndex * 3);

    if (swipeIndex === 0) this.recordMilestone("first_swipe");
    if (swipeIndex === 4) this.recordMilestone("fifth_swipe");
    if (swipeIndex === 9) this.recordMilestone("tenth_swipe");

    // Update pacing
    const newPace: FlowState["recommendationPace"] =
      swipeIndex >= FAST_PACE_SWIPES ? "fast"
      : swipeIndex >= 3              ? "balanced"
      : "slow";

    if (newPace !== this.state.recommendationPace) {
      this.state.recommendationPace = newPace;
      this.emit({ type: "pacing_shift", data: { pace: newPace } });
    }

    // Check reveal unlock
    if (!this.state.revealReady && swipeIndex + 1 >= REVEAL_UNLOCK_SWIPES) {
      this.state.revealReady = true;
      this.emit({ type: "recommendation_ready", data: { swipeCount: swipeIndex + 1 } });
    }
  }

  /** Call when mood discovery step advances. */
  onMoodStep(stepIndex: number, totalSteps: number): void {
    if (stepIndex < totalSteps - 1) {
      this.emit({ type: "mood_discovery_next", data: { step: stepIndex, total: totalSteps } });
    }
  }

  /** Call when the mentor is first shown. */
  onMentorShown(): void {
    this.state.mentorReady = true;
    this.recordMilestone("mentor_introduced");
    ExperienceStateEngine.setMentorActive(true);
  }

  /** Call when an order is confirmed. */
  onOrderConfirmed(): void {
    this.recordMilestone("order_confirmed");
    SignalVisualizationEngine.fireSignal("revenue_attribution", 90);
    setTimeout(() => {
      this.emit({ type: "recap_trigger", data: { reason: "order_complete" } });
    }, 2000);
  }

  // ── State ─────────────────────────────────────────────────────────────────

  getState(): Omit<FlowState, "milestones"> & { milestones: FlowMilestone[] } {
    return {
      ...this.state,
      milestones: Array.from(this.state.milestones),
    };
  }

  getRecommendationPace(): FlowState["recommendationPace"] {
    return this.state.recommendationPace;
  }

  // ── Subscription ─────────────────────────────────────────────────────────

  subscribe(fn: FlowListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private evaluateMilestone(milestone: FlowMilestone): void {
    switch (milestone) {
      case "first_swipe":
        if (!this.state.mentorReady) {
          // Surface mentor cue after first swipe if not yet shown
          setTimeout(() => this.emit({ type: "mentor_cue", milestone, data: {} }), 800);
        }
        break;

      case "fifth_swipe":
        SignalVisualizationEngine.fireSignal("venue_dna_sync", 75);
        break;

      case "tenth_swipe":
        this.emit({ type: "unlock_progress", milestone, data: { tier: "mastery" } });
        break;

      case "challenge_completed":
        this.emit({ type: "unlock_progress", milestone, data: { reward: "mastery_xp" } });
        break;

      case "order_confirmed":
        this.emit({ type: "journey_complete", milestone, data: {} });
        break;
    }
  }

  private flowTick(): void {
    this.state.totalFlowTimeMs = Date.now() - this.startedAt;
    SignalVisualizationEngine.fireSignal("session_sync", 40);
  }

  private resetIdleTimer(): void {
    this.state.idleSinceMs = null;
    if (this.idleTimer) clearTimeout(this.idleTimer);

    this.idleTimer = setTimeout(() => {
      this.state.idleSinceMs = Date.now();
      this.emit({ type: "idle_prompt", data: { idleMs: IDLE_THRESHOLD_MS } });
    }, IDLE_THRESHOLD_MS);
  }

  private emit(partial: Omit<FlowEvent, "ts">): void {
    const event: FlowEvent = { ...partial, ts: Date.now() };
    this.listeners.forEach(fn => fn(event));
  }
}

export const ExperienceFlowOrchestrator = new ExperienceFlowOrchestratorClass();
