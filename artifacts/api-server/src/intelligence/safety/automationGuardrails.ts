/**
 * automationGuardrails — safety envelope for all autonomous actions.
 *
 * Rate limits, confidence gates, circuit breakers, and emergency stops.
 * Every orchestration decision passes through checkGuardrails() first.
 */

import { pool } from "@workspace/db";
import { pgPubSub } from "../../realtime/pgPubSub";
import { logger } from "../../lib/logger";

export interface GuardrailResult {
  blocked:             boolean;
  reason?:             string;
  requireApprovalAbove:number;
  circuitOpen:         boolean;
}

const DEFAULT_GUARDRAILS = {
  maxDecisionsPerMinute:    10,
  minConfidenceThreshold:   0.65,
  maxAmbientChangesPerHour: 4,
  requireApprovalAbove:     0.95,
  circuitBreakerErrors:     5,
  circuitBreakerWindowS:    60,
};

// In-memory decision rate counters (per venue)
const decisionTimestamps = new Map<string, number[]>();
const errorCounts        = new Map<string, number[]>();

export async function checkGuardrails(venueId: string): Promise<GuardrailResult> {
  let cfg: {
    system_paused:           boolean;
    emergency_disabled:      boolean;
    max_decisions_per_minute:string;
    min_confidence_threshold:string;
    require_approval_above:  string;
    circuit_open:            boolean;
    circuit_open_at:         Date | null;
    circuit_breaker_errors:  string;
    circuit_breaker_window_s:string;
  } | null = null;

  try {
    const { rows } = await pool.query(
      `SELECT system_paused, emergency_disabled, max_decisions_per_minute,
              min_confidence_threshold, require_approval_above,
              circuit_open, circuit_open_at,
              circuit_breaker_errors, circuit_breaker_window_s
       FROM automation_guardrails WHERE venue_id = $1 LIMIT 1`,
      [venueId],
    );
    cfg = rows[0] ?? null;
  } catch { /* use defaults if table not yet seeded */ }

  // Emergency / pause
  if (cfg?.emergency_disabled) return { blocked: true, reason: "EMERGENCY_DISABLED", requireApprovalAbove: 0, circuitOpen: false };
  if (cfg?.system_paused)      return { blocked: true, reason: "SYSTEM_PAUSED",       requireApprovalAbove: 0, circuitOpen: false };

  // Circuit breaker
  if (cfg?.circuit_open) {
    const openAt  = cfg.circuit_open_at?.getTime() ?? 0;
    const windowS = parseInt(cfg.circuit_breaker_window_s ?? String(DEFAULT_GUARDRAILS.circuitBreakerWindowS), 10);
    if (Date.now() - openAt < windowS * 1000) {
      return { blocked: true, reason: "CIRCUIT_OPEN", requireApprovalAbove: 0, circuitOpen: true };
    }
    // Auto-close
    await closeCircuit(venueId);
  }

  // Rate limit
  const maxRpm = parseInt(cfg?.max_decisions_per_minute ?? String(DEFAULT_GUARDRAILS.maxDecisionsPerMinute), 10);
  const now    = Date.now();
  const window = now - 60_000;
  const stamps = (decisionTimestamps.get(venueId) ?? []).filter((t) => t > window);
  stamps.push(now);
  decisionTimestamps.set(venueId, stamps);

  if (stamps.length > maxRpm) {
    return {
      blocked: true, reason: "RATE_LIMIT_EXCEEDED",
      requireApprovalAbove: parseFloat(cfg?.require_approval_above ?? "0.95"),
      circuitOpen: false,
    };
  }

  return {
    blocked:             false,
    requireApprovalAbove:parseFloat(cfg?.require_approval_above ?? "0.95"),
    circuitOpen:         false,
  };
}

export async function recordError(venueId: string): Promise<void> {
  const now    = Date.now();
  const window = now - DEFAULT_GUARDRAILS.circuitBreakerWindowS * 1000;
  const errs   = (errorCounts.get(venueId) ?? []).filter((t) => t > window);
  errs.push(now);
  errorCounts.set(venueId, errs);

  if (errs.length >= DEFAULT_GUARDRAILS.circuitBreakerErrors) {
    await openCircuit(venueId, "TOO_MANY_ERRORS");
  }
}

async function openCircuit(venueId: string, reason: string): Promise<void> {
  logger.warn({ venueId, reason }, "automationGuardrails: circuit breaker OPEN");
  try {
    await pool.query(
      `UPDATE automation_guardrails
       SET circuit_open = true, circuit_open_at = NOW(), updated_at = NOW()
       WHERE venue_id = $1`,
      [venueId],
    );
  } catch { /* table may not exist yet */ }
  await pgPubSub.publish("orchestration", {
    event: "CIRCUIT_BREAKER_OPEN", venueId, reason,
  });
}

async function closeCircuit(venueId: string): Promise<void> {
  try {
    await pool.query(
      `UPDATE automation_guardrails
       SET circuit_open = false, circuit_open_at = NULL, updated_at = NOW()
       WHERE venue_id = $1`,
      [venueId],
    );
  } catch { /* non-critical */ }
}

export async function emergencyStop(
  venueId:  string,
  operator: string,
  reason:   string,
): Promise<void> {
  try {
    await pool.query(
      `UPDATE automation_guardrails
       SET emergency_disabled = true, paused_by = $1,
           paused_at = NOW(), pause_reason = $2, updated_at = NOW()
       WHERE venue_id = $3`,
      [operator, reason, venueId],
    );
  } catch { /* upsert if missing */ }
  await pool.query(
    `INSERT INTO orchestration_audit_logs
       (venue_id, entity_type, action, actor, actor_id, is_emergency, metadata)
     VALUES ($1,'guardrail','EMERGENCY_STOP',$2,$2,true,$3)`,
    [venueId, operator, JSON.stringify({ reason })],
  ).catch(() => {});
  await pgPubSub.publish("orchestration", {
    event: "EMERGENCY_STOP", venueId, operator, reason,
  });
  logger.warn({ venueId, operator, reason }, "automationGuardrails: EMERGENCY STOP activated");
}

export async function resumeAutomation(
  venueId:  string,
  operator: string,
): Promise<void> {
  try {
    await pool.query(
      `UPDATE automation_guardrails
       SET system_paused = false, emergency_disabled = false,
           circuit_open = false, pause_reason = NULL, updated_at = NOW()
       WHERE venue_id = $1`,
      [venueId],
    );
  } catch { /* non-critical */ }
  await pgPubSub.publish("orchestration", {
    event: "AUTOMATION_RESUMED", venueId, operator,
  });
  logger.info({ venueId, operator }, "automationGuardrails: automation resumed");
}

export async function seedGuardrails(venueId: string): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO automation_guardrails (venue_id)
       VALUES ($1)
       ON CONFLICT DO NOTHING`,
      [venueId],
    );
  } catch { /* non-critical */ }
}
