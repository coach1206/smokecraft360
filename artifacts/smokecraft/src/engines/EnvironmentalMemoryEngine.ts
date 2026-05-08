/**
 * EnvironmentalMemoryEngine — Atmosphere persistence and guest continuity.
 *
 * Persists sensory state to sessionStorage (per-tab) and localStorage
 * (cross-session return). When a guest returns, the environment is
 * restored to the exact atmospheric calibration from their last visit
 * before any new interaction begins.
 *
 * Memory layers:
 *   session  — in-memory + sessionStorage (lost on tab close)
 *   return   — localStorage (persists across browser sessions, 30-day TTL)
 *
 * Usage:
 *   EnvironmentalMemoryEngine.snapshot();           // save current state
 *   EnvironmentalMemoryEngine.restore();            // recall on return
 *   EnvironmentalMemoryEngine.bindGuest(profileId); // associate with guest
 */

import { ExperienceStateEngine, type CraftType } from "./ExperienceStateEngine";
import { EnvironmentalOrchestratorEngine }        from "./EnvironmentalOrchestratorEngine";

const SESSION_KEY = "axiom_env_session";
const RETURN_KEY  = "axiom_env_return";
const RETURN_TTL  = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface EnvironmentalMemory {
  guestProfileId:  string | null;
  activeCraft:     CraftType;
  engagementScore: number;
  dominantTags:    string[];
  atmosphereColor: string;
  intensity:       number;
  stage:           string;
  snapshotAt:      number; // epoch ms
}

const DEFAULT_MEMORY: EnvironmentalMemory = {
  guestProfileId:  null,
  activeCraft:     null,
  engagementScore: 0,
  dominantTags:    [],
  atmosphereColor: "#D48B00",
  intensity:       20,
  stage:           "idle",
  snapshotAt:      0,
};

class EnvironmentalMemoryEngineClass {
  private sessionMemory: EnvironmentalMemory = { ...DEFAULT_MEMORY };
  private guestProfileId: string | null = null;
  private autoSnapshotTimer: ReturnType<typeof setInterval> | null = null;

  // ── Session binding ───────────────────────────────────────────────────────

  bindGuest(profileId: string): void {
    this.guestProfileId = profileId;
    this.sessionMemory  = { ...this.sessionMemory, guestProfileId: profileId };
    // Try to load return memory for this guest
    const returnMem = this.loadReturnMemory(profileId);
    if (returnMem) {
      this.sessionMemory = returnMem;
    }
  }

  // ── Snapshot ─────────────────────────────────────────────────────────────

  /** Capture current engine states into memory. */
  snapshot(): void {
    const expState = ExperienceStateEngine.getState();
    const envState = EnvironmentalOrchestratorEngine.getState();

    this.sessionMemory = {
      guestProfileId:  this.guestProfileId,
      activeCraft:     expState.activeCraft,
      engagementScore: expState.engagementScore,
      dominantTags:    [],               // populated from OrchestratorContext externally
      atmosphereColor: envState.atmosphereColor,
      intensity:       envState.intensity,
      stage:           expState.stage,
      snapshotAt:      Date.now(),
    };

    this.persistSession();
    if (this.guestProfileId) this.persistReturn(this.guestProfileId);
  }

  /** Restore memory into running engines. Called when guest returns. */
  restore(profileId?: string): boolean {
    const mem = profileId
      ? (this.loadReturnMemory(profileId) ?? this.loadSessionMemory())
      : this.loadSessionMemory();

    if (!mem || mem.snapshotAt === 0) return false;

    // Only restore if memory is fresh enough (< 2h for session, always for return)
    const ageMs   = Date.now() - mem.snapshotAt;
    const maxAgeMs = profileId ? RETURN_TTL : 2 * 60 * 60 * 1000;
    if (ageMs > maxAgeMs) return false;

    this.sessionMemory = mem;

    // Replay state into engines
    if (mem.activeCraft) {
      ExperienceStateEngine.setCraft(mem.activeCraft);
      EnvironmentalOrchestratorEngine.morphTo(mem.activeCraft, mem.intensity);
    }

    return true;
  }

  /** Start auto-snapshotting every 90 seconds. */
  startAutoSnapshot(intervalMs = 90_000): void {
    if (this.autoSnapshotTimer) return;
    this.autoSnapshotTimer = setInterval(() => this.snapshot(), intervalMs);
  }

  stopAutoSnapshot(): void {
    if (this.autoSnapshotTimer) {
      clearInterval(this.autoSnapshotTimer);
      this.autoSnapshotTimer = null;
    }
  }

  // ── Accessors ─────────────────────────────────────────────────────────────

  getSessionMemory(): EnvironmentalMemory {
    return { ...this.sessionMemory };
  }

  hasReturnMemory(profileId: string): boolean {
    return this.loadReturnMemory(profileId) !== null;
  }

  clearAll(): void {
    this.sessionMemory = { ...DEFAULT_MEMORY };
    try {
      sessionStorage.removeItem(SESSION_KEY);
      // Intentionally do not clear localStorage return memory on guest reset
    } catch { /* storage unavailable */ }
  }

  clearReturnMemory(profileId: string): void {
    try {
      localStorage.removeItem(`${RETURN_KEY}_${profileId}`);
    } catch { /* storage unavailable */ }
  }

  // ── Persistence ───────────────────────────────────────────────────────────

  private persistSession(): void {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.sessionMemory));
    } catch { /* storage full or unavailable */ }
  }

  private persistReturn(profileId: string): void {
    try {
      localStorage.setItem(
        `${RETURN_KEY}_${profileId}`,
        JSON.stringify(this.sessionMemory),
      );
    } catch { /* storage full */ }
  }

  private loadSessionMemory(): EnvironmentalMemory | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as EnvironmentalMemory;
    } catch { return null; }
  }

  private loadReturnMemory(profileId: string): EnvironmentalMemory | null {
    try {
      const raw = localStorage.getItem(`${RETURN_KEY}_${profileId}`);
      if (!raw) return null;
      const mem = JSON.parse(raw) as EnvironmentalMemory;
      // Check TTL
      if (Date.now() - mem.snapshotAt > RETURN_TTL) {
        localStorage.removeItem(`${RETURN_KEY}_${profileId}`);
        return null;
      }
      return mem;
    } catch { return null; }
  }
}

export const EnvironmentalMemoryEngine = new EnvironmentalMemoryEngineClass();
