/**
 * SpatialNavigationEngine — Atmospheric drift-based navigation layer.
 *
 * Replaces traditional page-click navigation with an experience-aware
 * transition system. Every navigation has an atmospheric context:
 *   - Which craft zone initiated it
 *   - What emotional pacing is active
 *   - Whether it's a guest discovery or a staff action
 *   - What cinematic weight it should carry
 *
 * Consumers register a navigate callback on mount, then trigger navigation
 * through the engine rather than calling router.navigate() directly.
 * This lets the engine orchestrate the transition before routing fires.
 *
 * Usage:
 *   SpatialNavigationEngine.registerNavigator(path => router.push(path));
 *   SpatialNavigationEngine.driftTo("/experience/smoke", { craft: "smoke" });
 */

import { ExperienceStateEngine, type CraftType } from "./ExperienceStateEngine";
import { EnvironmentalOrchestratorEngine }        from "./EnvironmentalOrchestratorEngine";

export type NavigationIntent =
  | "craft_entry"     // guest entering a craft environment
  | "reveal"          // navigating to the recommendation reveal
  | "order"           // proceeding to place an order
  | "staff_handoff"   // staff operational mode trigger
  | "return"          // returning guest resuming session
  | "ambient_drift";  // passive environmental movement

export interface SpatialNavEvent {
  path:      string;
  intent:    NavigationIntent;
  craft:     CraftType;
  timestamp: number;
  durationMs: number; // how long the transition takes before route fires
}

type NavListener = (event: SpatialNavEvent) => void;

const INTENT_DURATIONS: Record<NavigationIntent, number> = {
  craft_entry:   420,   // cinematic entry flash
  reveal:        600,   // dramatic reveal hold
  order:         280,   // quick confirm
  staff_handoff: 680,   // ripple expansion
  return:        500,   // welcome back
  ambient_drift: 360,   // soft drift
};

class SpatialNavigationEngineClass {
  private navigatorFn: ((path: string) => void) | null = null;
  private listeners = new Set<NavListener>();
  private history: SpatialNavEvent[] = [];
  private inTransition = false;

  // ── Registration ──────────────────────────────────────────────────────────

  /** Register the router's navigate function. Call once on app mount. */
  registerNavigator(fn: (path: string) => void): void {
    this.navigatorFn = fn;
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  /**
   * Primary navigation method. Triggers the cinematic transition,
   * fires listeners (for overlay effects), then calls the router.
   */
  driftTo(path: string, opts: {
    intent?: NavigationIntent;
    craft?:  CraftType;
  } = {}): void {
    if (this.inTransition) return;

    const intent    = opts.intent ?? "ambient_drift";
    const craft     = opts.craft  ?? ExperienceStateEngine.getState().activeCraft;
    const durationMs = INTENT_DURATIONS[intent];

    const event: SpatialNavEvent = {
      path, intent, craft,
      timestamp:  Date.now(),
      durationMs,
    };

    this.inTransition = true;
    this.history.push(event);
    if (this.history.length > 24) this.history.shift();

    // Trigger atmospheric response
    if (intent === "craft_entry" && craft) {
      EnvironmentalOrchestratorEngine.triggerCinematic(craft);
      ExperienceStateEngine.setCraft(craft);
    }

    // Notify listeners (UI layers apply overlays)
    this.listeners.forEach(fn => fn(event));

    // Fire router after transition hold
    setTimeout(() => {
      this.inTransition = false;
      if (this.navigatorFn) this.navigatorFn(path);
    }, durationMs);
  }

  /** Instantly navigate without transition (fallback / error recovery). */
  snapTo(path: string): void {
    this.inTransition = false;
    if (this.navigatorFn) this.navigatorFn(path);
  }

  // ── History ───────────────────────────────────────────────────────────────

  getLastNavEvent(): SpatialNavEvent | null {
    return this.history[this.history.length - 1] ?? null;
  }

  getHistory(): SpatialNavEvent[] {
    return [...this.history];
  }

  getPreviousPath(): string | null {
    return this.history[this.history.length - 2]?.path ?? null;
  }

  isTransitioning(): boolean {
    return this.inTransition;
  }

  // ── Subscription ─────────────────────────────────────────────────────────

  subscribe(fn: NavListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const SpatialNavigationEngine = new SpatialNavigationEngineClass();
