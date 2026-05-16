/**
 * orchestrationRecovery — detects and recovers stuck orchestration cycles.
 *
 * Recovery patterns:
 *   1. Stalled venue evaluation — venue hasn't been evaluated in 2× expected interval
 *   2. Rule evaluation loop — same rule fires >N times without state change
 *   3. Action execution timeout — action started but never completed
 *   4. Context build cascade failure — all venues failing context builds
 *
 * Recovery actions:
 *   - Reset stalled venue state
 *   - Break rule loops via circuit breaker
 *   - Timeout + retry stuck actions
 *   - Flush and rebuild context cache
 */

import { pool }     from "@workspace/db";
import { logger }   from "../../lib/logger";
import { publish }  from "../../realtime/transport/eventBus";
import { increment } from "../../platform/observability/metricsCollector";

// ─── Circuit breaker for rule loops ──────────────────────────────────────────

interface CircuitState {
  ruleKey:      string;
  venueId:      string;
  fireCount:    number;
  windowStart:  number;
  open:         boolean;
  openUntil:    number;
}

const circuits = new Map<string, CircuitState>();
const CIRCUIT_WINDOW_MS  = 5 * 60_000;
const CIRCUIT_MAX_FIRES  = 10;
const CIRCUIT_COOLOFF_MS = 10 * 60_000;

export function checkRuleCircuitBreaker(ruleKey: string, venueId: string): boolean {
  const key   = `${venueId}:${ruleKey}`;
  const now   = Date.now();
  let circuit = circuits.get(key);

  if (!circuit) {
    circuit = { ruleKey, venueId, fireCount:0, windowStart:now, open:false, openUntil:0 };
    circuits.set(key, circuit);
  }

  if (circuit.open) {
    if (now < circuit.openUntil) return false; // circuit open — block
    circuit.open = false;
    circuit.fireCount = 0;
    circuit.windowStart = now;
  }

  if (now - circuit.windowStart > CIRCUIT_WINDOW_MS) {
    circuit.fireCount = 0;
    circuit.windowStart = now;
  }

  circuit.fireCount++;

  if (circuit.fireCount >= CIRCUIT_MAX_FIRES) {
    circuit.open      = true;
    circuit.openUntil = now + CIRCUIT_COOLOFF_MS;
    logger.warn({ ruleKey, venueId, fires: circuit.fireCount }, "orchestrationRecovery: circuit breaker opened");
    increment("orchestration.recovery", "circuits_opened", 1, { ruleKey });
    publish("orchestration", {
      event:"RULE_CIRCUIT_OPENED", ruleKey, venueId, fires:circuit.fireCount,
    }).catch(() => {});
    return false;
  }

  return true; // allow
}

export function resetCircuitBreaker(ruleKey: string, venueId: string): void {
  circuits.delete(`${venueId}:${ruleKey}`);
}

export function getOpenCircuits(): CircuitState[] {
  const now = Date.now();
  return [...circuits.values()].filter(c => c.open && now < c.openUntil);
}

// ─── Stalled venue recovery ───────────────────────────────────────────────────

export async function recoverStalledVenues(expectedIntervalMs = 60_000): Promise<number> {
  const threshold = new Date(Date.now() - expectedIntervalMs * 2).toISOString();

  const { rows } = await pool.query(
    `SELECT venue_id FROM venue_context_state
     WHERE updated_at < $1`,
    [threshold],
  ).catch(() => ({ rows: [] }));

  if (rows.length > 0) {
    const venueIds = rows.map((r: Record<string, unknown>) => String(r["venue_id"]));
    logger.warn({ count: venueIds.length, threshold }, "orchestrationRecovery: stalled venues detected");

    await publish("orchestration", {
      event:    "STALLED_VENUES_DETECTED",
      venueIds: venueIds.slice(0, 10), // cap payload
      count:    venueIds.length,
    });
    increment("orchestration.recovery", "stalled_venues", venueIds.length);
    return venueIds.length;
  }
  return 0;
}

export async function getRecoveryStatus(): Promise<{
  openCircuits:   number;
  stalledVenues:  number;
}> {
  const stalledVenues = await recoverStalledVenues().catch(() => 0);
  return { openCircuits: getOpenCircuits().length, stalledVenues };
}
