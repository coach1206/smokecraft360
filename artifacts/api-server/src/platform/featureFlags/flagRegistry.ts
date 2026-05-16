/**
 * flagRegistry — catalog of all known platform feature flags with defaults.
 *
 * Adding a flag here is the ONLY way to make it evaluatable. Unknown flags
 * always resolve to their safe default (usually false/off).
 *
 * Flags are grouped by domain for discoverability. Each flag records:
 *   - key:          string identifier used in code
 *   - defaultValue: safe default (what happens with no override)
 *   - description:  human-readable purpose
 *   - domain:       logical grouping
 *   - rollout:      0–100 default % rollout (100 = on for all)
 *   - gating:       whether this flag can gate autonomous actions
 */

export type FlagType = "boolean" | "string" | "number" | "json";

export interface FlagDefinition {
  key:          string;
  defaultValue: boolean | string | number | Record<string, unknown>;
  type:         FlagType;
  description:  string;
  domain:       FlagDomain;
  rolloutPct:   number;     // 0–100, default applied when no venue override
  emergency:    boolean;    // if true, can be killed via emergency disable
  gating:       boolean;    // if true, autonomous actions check this before executing
}

export type FlagDomain =
  | "ai"
  | "orchestration"
  | "pos"
  | "inventory"
  | "telemetry"
  | "realtime"
  | "payments"
  | "loyalty"
  | "experience"
  | "admin"
  | "safety"
  | "infrastructure";

const FLAGS: FlagDefinition[] = [
  // ── AI ──────────────────────────────────────────────────────────────────────
  { key:"ai.recommendations.enabled",       defaultValue:true,  type:"boolean", domain:"ai",             rolloutPct:100, emergency:true,  gating:false, description:"Master switch for AI recommendation engine" },
  { key:"ai.digital_twin.enabled",          defaultValue:true,  type:"boolean", domain:"ai",             rolloutPct:100, emergency:true,  gating:false, description:"Digital twin simulation" },
  { key:"ai.upsell_timing.enabled",         defaultValue:true,  type:"boolean", domain:"ai",             rolloutPct:100, emergency:false, gating:true,  description:"AI-driven upsell prompt timing" },
  { key:"ai.auto_reorder.enabled",          defaultValue:false, type:"boolean", domain:"ai",             rolloutPct:0,   emergency:true,  gating:true,  description:"AI-driven automatic inventory reorder" },
  { key:"ai.commentary.enabled",            defaultValue:true,  type:"boolean", domain:"ai",             rolloutPct:100, emergency:false, gating:false, description:"Natural-language commentary on selections" },
  { key:"ai.memory.retention_days",         defaultValue:90,    type:"number",  domain:"ai",             rolloutPct:100, emergency:false, gating:false, description:"Days to retain AI behavior memory" },
  { key:"ai.confidence_threshold",          defaultValue:0.65,  type:"number",  domain:"ai",             rolloutPct:100, emergency:false, gating:true,  description:"Min confidence score before acting autonomously" },

  // ── Orchestration ────────────────────────────────────────────────────────
  { key:"orchestration.autonomous.enabled", defaultValue:false, type:"boolean", domain:"orchestration",  rolloutPct:0,   emergency:true,  gating:true,  description:"Allow fully autonomous orchestration without human approval" },
  { key:"orchestration.queue.max_depth",    defaultValue:500,   type:"number",  domain:"orchestration",  rolloutPct:100, emergency:false, gating:false, description:"Max orchestration queue depth before backpressure kicks in" },
  { key:"orchestration.replay.enabled",     defaultValue:true,  type:"boolean", domain:"orchestration",  rolloutPct:100, emergency:true,  gating:false, description:"Event replay subsystem" },
  { key:"orchestration.rollback.enabled",   defaultValue:true,  type:"boolean", domain:"orchestration",  rolloutPct:100, emergency:false, gating:false, description:"Orchestration rollback capability" },

  // ── POS ──────────────────────────────────────────────────────────────────
  { key:"pos.live_sync.enabled",            defaultValue:true,  type:"boolean", domain:"pos",            rolloutPct:100, emergency:true,  gating:false, description:"Live POS inventory sync" },
  { key:"pos.failover.enabled",             defaultValue:true,  type:"boolean", domain:"pos",            rolloutPct:100, emergency:false, gating:false, description:"Provider failover" },
  { key:"pos.degraded_mode.enabled",        defaultValue:true,  type:"boolean", domain:"pos",            rolloutPct:100, emergency:false, gating:false, description:"Degraded/offline mode" },
  { key:"pos.split_payments.enabled",       defaultValue:true,  type:"boolean", domain:"pos",            rolloutPct:100, emergency:false, gating:false, description:"Split payment flows" },
  { key:"pos.dispute_automation.enabled",   defaultValue:false, type:"boolean", domain:"pos",            rolloutPct:0,   emergency:true,  gating:true,  description:"Automated dispute response submission" },

  // ── Inventory ─────────────────────────────────────────────────────────────
  { key:"inventory.auto_reconcile.enabled", defaultValue:true,  type:"boolean", domain:"inventory",      rolloutPct:100, emergency:true,  gating:false, description:"Automatic inventory reconciliation" },
  { key:"inventory.drift_threshold",        defaultValue:3,     type:"number",  domain:"inventory",      rolloutPct:100, emergency:false, gating:false, description:"Units delta before drift is flagged" },
  { key:"inventory.reservation_ttl_ms",     defaultValue:900000,type:"number",  domain:"inventory",      rolloutPct:100, emergency:false, gating:false, description:"Reservation TTL in ms (default 15 min)" },

  // ── Telemetry ─────────────────────────────────────────────────────────────
  { key:"telemetry.swipe.enabled",          defaultValue:true,  type:"boolean", domain:"telemetry",      rolloutPct:100, emergency:true,  gating:false, description:"Swipe event telemetry" },
  { key:"telemetry.sampling_rate",          defaultValue:1.0,   type:"number",  domain:"telemetry",      rolloutPct:100, emergency:false, gating:false, description:"Telemetry sampling rate 0–1" },
  { key:"telemetry.latency_tracking",       defaultValue:true,  type:"boolean", domain:"telemetry",      rolloutPct:100, emergency:false, gating:false, description:"POS adapter latency tracking" },

  // ── Realtime ─────────────────────────────────────────────────────────────
  { key:"realtime.websocket.enabled",       defaultValue:true,  type:"boolean", domain:"realtime",       rolloutPct:100, emergency:true,  gating:false, description:"WebSocket realtime layer" },
  { key:"realtime.max_connections_per_venue",defaultValue:200,  type:"number",  domain:"realtime",       rolloutPct:100, emergency:false, gating:false, description:"Max concurrent WS connections per venue" },

  // ── Payments ─────────────────────────────────────────────────────────────
  { key:"payments.state_machine.enabled",   defaultValue:true,  type:"boolean", domain:"payments",       rolloutPct:100, emergency:true,  gating:false, description:"Payment state machine (falls back to simple status)" },
  { key:"payments.auto_void_timeout_h",     defaultValue:24,    type:"number",  domain:"payments",       rolloutPct:100, emergency:false, gating:true,  description:"Hours before auto-voiding stuck authorized payments" },

  // ── Safety ───────────────────────────────────────────────────────────────
  { key:"safety.kill_switch",               defaultValue:false, type:"boolean", domain:"safety",         rolloutPct:100, emergency:true,  gating:false, description:"Emergency global kill switch — stops all autonomous actions" },
  { key:"safety.readonly_mode",             defaultValue:false, type:"boolean", domain:"safety",         rolloutPct:100, emergency:true,  gating:false, description:"Readonly mode — all writes return 503" },
  { key:"safety.maintenance_mode",          defaultValue:false, type:"boolean", domain:"safety",         rolloutPct:100, emergency:true,  gating:false, description:"Maintenance mode — public routes return 503" },

  // ── Infrastructure ───────────────────────────────────────────────────────
  { key:"infra.self_healing.enabled",       defaultValue:true,  type:"boolean", domain:"infrastructure", rolloutPct:100, emergency:true,  gating:false, description:"Self-healing infrastructure" },
  { key:"infra.backpressure.enabled",       defaultValue:true,  type:"boolean", domain:"infrastructure", rolloutPct:100, emergency:false, gating:false, description:"Backpressure + load shedding" },
  { key:"infra.retention.enabled",          defaultValue:true,  type:"boolean", domain:"infrastructure", rolloutPct:100, emergency:false, gating:false, description:"Data retention + archival jobs" },
];

const flagMap = new Map<string, FlagDefinition>(FLAGS.map(f => [f.key, f]));

export function getFlag(key: string): FlagDefinition | undefined {
  return flagMap.get(key);
}

export function getAllFlags(): FlagDefinition[] {
  return FLAGS;
}

export function getFlagsByDomain(domain: FlagDomain): FlagDefinition[] {
  return FLAGS.filter(f => f.domain === domain);
}

export function getEmergencyFlags(): FlagDefinition[] {
  return FLAGS.filter(f => f.emergency);
}

export function isKnownFlag(key: string): boolean {
  return flagMap.has(key);
}
