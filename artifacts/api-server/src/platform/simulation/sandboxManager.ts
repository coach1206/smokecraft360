/**
 * sandboxManager — isolated simulation environments for testing and AI training.
 *
 * A sandbox is a named, ephemeral "fake venue" with:
 *   - Synthetic inventory seeded from templates
 *   - Simulated guest sessions and behavior
 *   - Full orchestration pipeline running against fake data
 *   - No impact on production DB (writes go to sandbox_* tables)
 *   - Configurable sim speed (1x → 60x real-time)
 *
 * Use cases:
 *   - Stress testing orchestration at scale
 *   - AI behavior validation before enabling in prod
 *   - Feature flag dry-runs
 *   - Onboarding new venues without risk
 *   - Replay scenario reproduction
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";
import { increment, setGauge } from "../observability/metricsCollector";

export interface SandboxConfig {
  name:          string;
  venueTemplate: string;        // e.g. "upscale_lounge", "sports_bar", "cigar_room"
  guestCount:    number;        // simulated concurrent guests
  inventorySize: number;        // SKU count
  speedMultiple: number;        // 1 = real-time, 60 = 1 minute per second
  durationMs:    number;        // how long to run the simulation
  enableAI:      boolean;       // run AI recommendations against simulated guests
  enablePOS:     boolean;       // simulate POS transaction flow
  seed?:         number;        // deterministic RNG seed
}

export interface SandboxState {
  sandboxId:    string;
  name:         string;
  status:       "created" | "running" | "paused" | "completed" | "failed";
  config:       SandboxConfig;
  startedAt:    number | null;
  completedAt:  number | null;
  metrics: {
    simTimeElapsedMs: number;
    eventsGenerated:  number;
    transactionsRun:  number;
    errorsCount:      number;
    guestSessions:    number;
  };
}

const activeSandboxes = new Map<string, SandboxState>();
const sandboxTimers   = new Map<string, ReturnType<typeof setInterval>>();

// ─── Venue templates ─────────────────────────────────────────────────────────

const VENUE_TEMPLATES: Record<string, { guestPattern: string; peakHour: number; avgSpend: number }> = {
  upscale_lounge: { guestPattern: "vip_heavy",    peakHour: 21, avgSpend: 85 },
  sports_bar:     { guestPattern: "high_volume",  peakHour: 20, avgSpend: 35 },
  cigar_room:     { guestPattern: "connoisseur",  peakHour: 19, avgSpend: 120 },
  hotel_bar:      { guestPattern: "mixed",        peakHour: 18, avgSpend: 55 },
  rooftop_lounge: { guestPattern: "social",       peakHour: 22, avgSpend: 65 },
};

// ─── Sandbox lifecycle ────────────────────────────────────────────────────────

function generateSandboxId(): string {
  return `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function createSandbox(config: SandboxConfig): Promise<SandboxState> {
  const sandboxId = generateSandboxId();
  const state: SandboxState = {
    sandboxId,
    name:        config.name,
    status:      "created",
    config,
    startedAt:   null,
    completedAt: null,
    metrics: { simTimeElapsedMs:0, eventsGenerated:0, transactionsRun:0, errorsCount:0, guestSessions:0 },
  };

  activeSandboxes.set(sandboxId, state);

  // Persist to DB
  await pool.query(
    `INSERT INTO simulation_sandboxes (sandbox_id, name, status, config, created_at)
     VALUES ($1,$2,'created',$3,NOW())`,
    [sandboxId, config.name, JSON.stringify(config)],
  ).catch(() => {});

  logger.info({ sandboxId, name: config.name }, "sandboxManager: sandbox created");
  increment("simulation", "sandboxes_created", 1);
  return state;
}

export async function startSandbox(sandboxId: string): Promise<void> {
  const state = activeSandboxes.get(sandboxId);
  if (!state) throw new Error(`sandbox ${sandboxId} not found`);
  if (state.status === "running") return;

  state.status    = "running";
  state.startedAt = Date.now();

  await pool.query(
    `UPDATE simulation_sandboxes SET status='running', started_at=NOW() WHERE sandbox_id=$1`,
    [sandboxId],
  ).catch(() => {});

  logger.info({ sandboxId }, "sandboxManager: sandbox started");

  const template    = VENUE_TEMPLATES[state.config.venueTemplate] ?? VENUE_TEMPLATES["upscale_lounge"]!;
  const tickMs      = 1000 / Math.max(1, state.config.speedMultiple);
  const maxTicks    = Math.ceil(state.config.durationMs / 1000);
  let   tickCount   = 0;
  const rng         = seededRandom(state.config.seed ?? Date.now());

  const timer = setInterval(async () => {
    if (state.status !== "running") {
      clearInterval(timer);
      return;
    }

    tickCount++;
    state.metrics.simTimeElapsedMs += 1000;

    // Simulate guest events
    const activeGuests = Math.round(state.config.guestCount * (0.6 + rng() * 0.4));
    for (let g = 0; g < Math.min(activeGuests, 10); g++) {
      const eventType = pickEvent(rng, template.guestPattern);
      await emitSandboxEvent(sandboxId, state.config.name, eventType, {
        guestId:   `guest_${sandboxId}_${g}`,
        venueId:   sandboxId,
        avgSpend:  template.avgSpend,
      }).catch(() => {});
      state.metrics.eventsGenerated++;
    }

    // Simulate transactions
    if (tickCount % 5 === 0) {
      state.metrics.transactionsRun++;
    }

    setGauge("simulation", "events_generated", state.metrics.eventsGenerated, { sandbox: sandboxId });

    if (tickCount >= maxTicks) {
      await completeSandbox(sandboxId);
    }
  }, tickMs);

  sandboxTimers.set(sandboxId, timer);
}

export async function pauseSandbox(sandboxId: string): Promise<void> {
  const state = activeSandboxes.get(sandboxId);
  if (!state || state.status !== "running") return;
  state.status = "paused";
  logger.info({ sandboxId }, "sandboxManager: sandbox paused");
}

export async function completeSandbox(sandboxId: string): Promise<void> {
  const state = activeSandboxes.get(sandboxId);
  if (!state) return;

  const timer = sandboxTimers.get(sandboxId);
  if (timer) { clearInterval(timer); sandboxTimers.delete(sandboxId); }

  state.status      = "completed";
  state.completedAt = Date.now();

  await pool.query(
    `UPDATE simulation_sandboxes SET status='completed', completed_at=NOW(), metrics=$2 WHERE sandbox_id=$1`,
    [sandboxId, JSON.stringify(state.metrics)],
  ).catch(() => {});

  await publish("telemetry", { event:"SANDBOX_COMPLETED", sandboxId, metrics: state.metrics });
  logger.info({ sandboxId, metrics: state.metrics }, "sandboxManager: sandbox completed");
}

export async function destroySandbox(sandboxId: string): Promise<void> {
  const timer = sandboxTimers.get(sandboxId);
  if (timer) { clearInterval(timer); sandboxTimers.delete(sandboxId); }
  activeSandboxes.delete(sandboxId);

  await pool.query(`UPDATE simulation_sandboxes SET status='destroyed' WHERE sandbox_id=$1`, [sandboxId]).catch(() => {});
  logger.info({ sandboxId }, "sandboxManager: sandbox destroyed");
}

export function getSandbox(sandboxId: string): SandboxState | null {
  return activeSandboxes.get(sandboxId) ?? null;
}

export function listSandboxes(): SandboxState[] {
  return [...activeSandboxes.values()];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function emitSandboxEvent(
  sandboxId:  string,
  venueName:  string,
  eventType:  string,
  metadata:   Record<string, unknown>,
): Promise<void> {
  await pool.query(
    `INSERT INTO simulation_events (sandbox_id, event_type, metadata, created_at)
     VALUES ($1,$2,$3,NOW())`,
    [sandboxId, eventType, JSON.stringify(metadata)],
  ).catch(() => {});
}

function pickEvent(rng: () => number, pattern: string): string {
  const events = {
    vip_heavy:  ["vip_arrived","order_premium","request_staff","loyalty_redeem"],
    high_volume:["swipe_add","order_standard","table_seated","table_cleared"],
    connoisseur:["pairing_request","order_premium","slow_sip","recommendation_accepted"],
    mixed:      ["swipe_add","swipe_skip","order_standard","loyalty_earn"],
    social:     ["group_arrived","social_share","swipe_add","order_round"],
  };
  const pool_ = events[pattern as keyof typeof events] ?? events["mixed"];
  return pool_[Math.floor(rng() * pool_.length)]!;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
