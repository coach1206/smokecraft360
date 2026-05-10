/**
 * GroupEnergyEngine — Multi-Tab Lounge Vibe Intelligence
 *
 * Analyzes collective guest interaction rate across all open tabs
 * using the BroadcastChannel API.
 *
 * Derives:
 *   MEDITATIVE  — < 3 interactions/min  → slow smoke (0.5x), deep amber, soft particles
 *   FOCUSED     — 3–10 interactions/min → normal (0.85x), balanced glow
 *   HIGH_ENERGY — > 10 interactions/min → fast smoke (1.2x), bright embers, high contrast
 *
 * Exposes a visual config consumed by MasterArtisan background animations.
 * Pure TS singleton — no React deps.
 */

const CHANNEL_NAME = "novee_group_energy";
const WINDOW_MS    = 60_000;   // rolling 60-second window

// ── Types ─────────────────────────────────────────────────────────────────────

export type LoungeMood = "MEDITATIVE" | "FOCUSED" | "HIGH_ENERGY";

export interface GroupEnergyVisualConfig {
  motionSpeedMultiplier: number;  // video playbackRate + CSS animation-duration divisor
  particleBrightness:    number;  // 0–2 multiplier applied to particle opacity
  emberGlowIntensity:    number;  // 0–2 multiplier for top amber glow size
  backgroundContrast:    number;  // CSS filter contrast (1.0 = normal)
  uiLabel:               string;  // Human-readable for EEIS panel
}

export interface GroupEnergyState {
  mood:          LoungeMood;
  eventsPerMin:  number;
  tabCount:      number;
  visual:        GroupEnergyVisualConfig;
}

type Listener = (state: GroupEnergyState) => void;

// ── Visual configs per mood ───────────────────────────────────────────────────

const VISUAL: Record<LoungeMood, GroupEnergyVisualConfig> = {
  MEDITATIVE: {
    motionSpeedMultiplier: 0.5,
    particleBrightness:    0.7,
    emberGlowIntensity:    0.8,
    backgroundContrast:    0.9,
    uiLabel:               "◌  Meditative — Deep immersion active",
  },
  FOCUSED: {
    motionSpeedMultiplier: 0.85,
    particleBrightness:    1.0,
    emberGlowIntensity:    1.0,
    backgroundContrast:    1.0,
    uiLabel:               "◑  Focused — Balanced ritual pace",
  },
  HIGH_ENERGY: {
    motionSpeedMultiplier: 1.2,
    particleBrightness:    1.4,
    emberGlowIntensity:    1.35,
    backgroundContrast:    1.1,
    uiLabel:               "●  High Energy — Lounge is alive",
  },
};

// ── Singleton ─────────────────────────────────────────────────────────────────

class GroupEnergyEngineClass {
  private eventTimestamps: number[] = [];
  private listeners:       Set<Listener> = new Set();
  private channel:         BroadcastChannel | null = null;
  private tabCount         = 1;

  constructor() {
    this.initChannel();
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  getState(): GroupEnergyState {
    const eventsPerMin = this.getEventsPerMin();
    const mood         = this.deriveMood(eventsPerMin);
    return { mood, eventsPerMin, tabCount: this.tabCount, visual: VISUAL[mood] };
  }

  // ── Write ───────────────────────────────────────────────────────────────────

  /** Call on every meaningful user interaction (card tap, swipe, button press). */
  recordActivity(): void {
    const now = Date.now();
    this.eventTimestamps.push(now);
    this.pruneWindow();
    // Broadcast to other tabs
    try { this.channel?.postMessage({ type: "activity", ts: now }); } catch { /* ignore */ }
    this.notify();
  }

  // ── Subscription ────────────────────────────────────────────────────────────

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── Internal ────────────────────────────────────────────────────────────────

  private initChannel(): void {
    try {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (ev: MessageEvent) => {
        if (ev.data?.type === "activity") {
          this.eventTimestamps.push(ev.data.ts as number);
          this.pruneWindow();
          this.notify();
        }
        if (ev.data?.type === "tab_count") {
          this.tabCount = ev.data.count as number;
          this.notify();
        }
      };
      // Announce this tab and request tab count sync
      this.channel.postMessage({ type: "tab_open" });
    } catch {
      // BroadcastChannel not available (SSR / old browser) — degrade gracefully
      this.channel = null;
    }
  }

  private pruneWindow(): void {
    const cutoff = Date.now() - WINDOW_MS;
    this.eventTimestamps = this.eventTimestamps.filter(t => t > cutoff);
  }

  private getEventsPerMin(): number {
    this.pruneWindow();
    return this.eventTimestamps.length;  // events in last 60s ≡ events/min
  }

  private deriveMood(epm: number): LoungeMood {
    if (epm > 10) return "HIGH_ENERGY";
    if (epm > 3)  return "FOCUSED";
    return "MEDITATIVE";
  }

  private notify(): void {
    const state = this.getState();
    for (const fn of this.listeners) fn(state);
  }
}

export const groupEnergyEngine = new GroupEnergyEngineClass();
