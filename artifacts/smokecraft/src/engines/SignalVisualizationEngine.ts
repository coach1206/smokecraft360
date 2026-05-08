/**
 * SignalVisualizationEngine — Live telemetry pulse and orchestration signal system.
 *
 * Produces a stream of signal events that the EEIS Overlay and ambient layers
 * consume to render the "living nervous system" visualization.
 *
 * Signal types:
 *   telemetry_pulse     — routine DB write-through data point
 *   recommendation_fire — a recommendation was scored and surfaced
 *   revenue_attribution — a swipe or order was revenue-attributed
 *   session_sync        — session persistence snapshot written
 *   predictive_tick     — predictive intent engine fired
 *   venue_dna_sync      — venue DNA read from environment sensors
 *   handoff_signal      — staff handoff state change
 *   orchestration_route — inter-engine message routed
 *
 * Pulse rate tracks session engagement — idle=slow, peak=fast.
 *
 * Usage:
 *   SignalVisualizationEngine.subscribe(signals => renderNodes(signals));
 *   SignalVisualizationEngine.start();
 */

import { ExperienceStateEngine } from "./ExperienceStateEngine";

export type SignalType =
  | "telemetry_pulse"
  | "recommendation_fire"
  | "revenue_attribution"
  | "session_sync"
  | "predictive_tick"
  | "venue_dna_sync"
  | "handoff_signal"
  | "orchestration_route";

export interface SignalEvent {
  id:        string;
  type:      SignalType;
  fromNode:  string;
  toNode:    string;
  intensity: number;  // 0–100
  ts:        number;  // epoch ms
  ttl:       number;  // ms before this signal expires from UI
}

export interface NodeState {
  id:          string;
  label:       string;
  x:           number;  // normalized 0–1
  y:           number;  // normalized 0–1
  activity:    number;  // 0–100, decays over time
  lastSignalTs: number;
}

type SignalListener = (signals: SignalEvent[], nodes: NodeState[]) => void;

// ── Static node topology ──────────────────────────────────────────────────────

const NODE_DEFS: Omit<NodeState, "activity" | "lastSignalTs">[] = [
  { id: "pred",  label: "PredictiveIntent",    x: 0.18, y: 0.20 },
  { id: "tel",   label: "TelemetryEngine",     x: 0.55, y: 0.12 },
  { id: "venue", label: "VenueDNA",            x: 0.82, y: 0.28 },
  { id: "rec",   label: "Recommendation",      x: 0.68, y: 0.55 },
  { id: "sess",  label: "SessionPersistence",  x: 0.15, y: 0.65 },
  { id: "env",   label: "EnvironmentalMode",   x: 0.42, y: 0.78 },
  { id: "hand",  label: "HandoffState",        x: 0.75, y: 0.82 },
  { id: "rev",   label: "RevenueAttribution",  x: 0.30, y: 0.45 },
  { id: "orch",  label: "Orchestration",       x: 0.50, y: 0.45 },
];

// Signal routing table: which node pairs carry which signal types
const SIGNAL_ROUTES: Record<SignalType, [string, string][]> = {
  telemetry_pulse:      [["pred", "tel"], ["tel", "orch"], ["sess", "tel"]],
  recommendation_fire:  [["pred", "rec"], ["rec", "orch"], ["tel", "rec"]],
  revenue_attribution:  [["rec", "rev"], ["rev", "orch"], ["hand", "rev"]],
  session_sync:         [["sess", "orch"], ["orch", "tel"], ["sess", "env"]],
  predictive_tick:      [["pred", "orch"], ["pred", "rec"], ["pred", "venue"]],
  venue_dna_sync:       [["venue", "env"], ["venue", "orch"], ["venue", "rec"]],
  handoff_signal:       [["hand", "orch"], ["hand", "pred"], ["hand", "sess"]],
  orchestration_route:  [["orch", "rec"], ["orch", "env"], ["orch", "rev"]],
};

let _signalId = 0;
function nextId() { return `sig_${++_signalId}`; }

class SignalVisualizationEngineClass {
  private signals:   Map<string, SignalEvent> = new Map();
  private nodes:     Map<string, NodeState>   = new Map();
  private listeners = new Set<SignalListener>();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private pruneTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Initialize nodes
    NODE_DEFS.forEach(def => {
      this.nodes.set(def.id, { ...def, activity: 0, lastSignalTs: 0 });
    });
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  start(): void {
    if (this.tickTimer) return;
    this.tick(); // immediate first tick
    this.tickTimer  = setInterval(() => this.tick(),  this.getTickMs());
    this.pruneTimer = setInterval(() => this.prune(), 800);
  }

  stop(): void {
    if (this.tickTimer)  clearInterval(this.tickTimer);
    if (this.pruneTimer) clearInterval(this.pruneTimer);
    this.tickTimer  = null;
    this.pruneTimer = null;
  }

  // ── Manual signal injection ───────────────────────────────────────────────

  /** Fire a specific signal type immediately (e.g., on a swipe event). */
  fireSignal(type: SignalType, intensity = 70): void {
    this.emitSignal(type, intensity);
  }

  // ── Node state ────────────────────────────────────────────────────────────

  getNodes(): NodeState[] {
    return Array.from(this.nodes.values());
  }

  getSignals(): SignalEvent[] {
    return Array.from(this.signals.values());
  }

  // ── Subscription ─────────────────────────────────────────────────────────

  subscribe(fn: SignalListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private getTickMs(): number {
    const score = ExperienceStateEngine.getEngagementScore();
    // 2.5s at idle → 600ms at peak engagement
    return Math.max(600, 2500 - score * 19);
  }

  private tick(): void {
    // Pick a signal type weighted by session state
    const score = ExperienceStateEngine.getEngagementScore();
    const pacing = ExperienceStateEngine.getPacing();
    const isHandoff = ExperienceStateEngine.getState().isStaffHandoff;

    const type = isHandoff
      ? "handoff_signal"
      : this.weightedRandomType(score, pacing);

    const intensity = 30 + Math.round(score * 0.65) + Math.round(Math.random() * 20);
    this.emitSignal(type, Math.min(100, intensity));

    // Occasionally emit a secondary signal for visual richness
    if (score > 50 && Math.random() > 0.55) {
      setTimeout(() => this.emitSignal("orchestration_route", 45), 200);
    }

    // Reschedule with updated tick rate
    if (this.tickTimer) {
      clearInterval(this.tickTimer);
      this.tickTimer = setInterval(() => this.tick(), this.getTickMs());
    }
  }

  private emitSignal(type: SignalType, intensity: number): void {
    const routes = SIGNAL_ROUTES[type];
    if (!routes?.length) return;

    const [fromId, toId] = routes[Math.floor(Math.random() * routes.length)];
    const ttl = 900 + intensity * 5;

    const event: SignalEvent = {
      id: nextId(), type, fromNode: fromId, toNode: toId,
      intensity, ts: Date.now(), ttl,
    };

    this.signals.set(event.id, event);

    // Activate nodes
    this.activateNode(fromId, intensity);
    this.activateNode(toId,   Math.round(intensity * 0.8));

    this.broadcast();
  }

  private activateNode(id: string, intensity: number): void {
    const node = this.nodes.get(id);
    if (!node) return;
    this.nodes.set(id, {
      ...node,
      activity:     Math.min(100, node.activity + intensity * 0.4),
      lastSignalTs: Date.now(),
    });
  }

  private prune(): void {
    const now = Date.now();
    let changed = false;

    // Expire old signals
    this.signals.forEach((sig, id) => {
      if (now - sig.ts > sig.ttl) {
        this.signals.delete(id);
        changed = true;
      }
    });

    // Decay node activity
    this.nodes.forEach((node, id) => {
      if (node.activity > 0) {
        this.nodes.set(id, { ...node, activity: Math.max(0, node.activity - 8) });
        changed = true;
      }
    });

    if (changed) this.broadcast();
  }

  private weightedRandomType(score: number, pacing: string): SignalType {
    const pool: SignalType[] = ["telemetry_pulse", "orchestration_route"];
    if (score > 20) pool.push("predictive_tick", "session_sync");
    if (score > 45) pool.push("recommendation_fire", "venue_dna_sync");
    if (score > 70) pool.push("revenue_attribution", "recommendation_fire");
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private broadcast(): void {
    const sigs  = this.getSignals();
    const nodes = this.getNodes();
    this.listeners.forEach(fn => fn(sigs, nodes));
  }
}

export const SignalVisualizationEngine = new SignalVisualizationEngineClass();
