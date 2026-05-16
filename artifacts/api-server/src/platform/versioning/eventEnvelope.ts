/**
 * eventEnvelope — versioned event schema for long-term replay compatibility.
 *
 * Every event persisted to the DB is wrapped in a versioned envelope.
 * Consumers always deserialize via the envelope — never the raw payload.
 *
 * Versioning strategy:
 *   - Major version bump: breaking schema change (fields removed/renamed)
 *   - Minor version bump: additive changes (new optional fields)
 *   - Each major version has a migration function to upgrade to current
 *
 * Envelope format:
 *   { schemaVersion, eventType, eventId, traceId, venueId, ts, payload }
 *
 * Replay compatibility: old envelopes are migrated on-read, never on-write.
 * This makes the archive safe: stored events are always in original form.
 */

import { randomUUID } from "node:crypto";

export const CURRENT_SCHEMA_VERSION = 3;

export interface EventEnvelope<T = unknown> {
  schemaVersion: number;
  eventType:     string;
  eventId:       string;     // UUID — idempotency key for replay
  traceId:       string | null;
  venueId:       string | null;
  source:        string;     // service that emitted the event
  ts:            number;     // Unix ms
  payload:       T;
  meta?:         Record<string, unknown>;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createEnvelope<T>(
  eventType: string,
  payload:   T,
  opts: {
    venueId?:  string;
    traceId?:  string;
    source?:   string;
    meta?:     Record<string, unknown>;
    eventId?:  string;
  } = {},
): EventEnvelope<T> {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    eventType,
    eventId:   opts.eventId ?? randomUUID(),
    traceId:   opts.traceId ?? null,
    venueId:   opts.venueId ?? null,
    source:    opts.source  ?? "eeis-api",
    ts:        Date.now(),
    payload,
    meta:      opts.meta,
  };
}

// ─── Migration ────────────────────────────────────────────────────────────────

type MigrationFn = (raw: Record<string, unknown>) => Record<string, unknown>;

const migrations = new Map<number, MigrationFn>();
// v1 → v2: added traceId field
migrations.set(1, (raw) => ({ ...raw, traceId: null, schemaVersion: 2 }));
// v2 → v3: added source field + meta object
migrations.set(2, (raw) => ({ ...raw, source: "eeis-api", meta: {}, schemaVersion: 3 }));

export function migrateEnvelope(raw: Record<string, unknown>): EventEnvelope {
  let current = raw;
  let version = Number(raw["schemaVersion"] ?? 1);

  while (version < CURRENT_SCHEMA_VERSION) {
    const migrateFn = migrations.get(version);
    if (!migrateFn) break;
    current = migrateFn(current);
    version++;
  }

  return current as unknown as EventEnvelope;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function isValidEnvelope(raw: unknown): raw is EventEnvelope {
  if (!raw || typeof raw !== "object") return false;
  const e = raw as Record<string, unknown>;
  return (
    typeof e["schemaVersion"] === "number" &&
    typeof e["eventType"]     === "string" &&
    typeof e["eventId"]       === "string" &&
    typeof e["ts"]            === "number" &&
    "payload" in e
  );
}

export function parseEnvelope(json: string): EventEnvelope | null {
  try {
    const raw = JSON.parse(json) as Record<string, unknown>;
    if (!isValidEnvelope(raw)) return null;
    const version = Number(raw["schemaVersion"]);
    return version < CURRENT_SCHEMA_VERSION ? migrateEnvelope(raw) : raw as EventEnvelope;
  } catch {
    return null;
  }
}

export function serializeEnvelope(envelope: EventEnvelope): string {
  return JSON.stringify(envelope);
}

// ─── Replay compatibility check ───────────────────────────────────────────────

export function isReplayCompatible(
  storedVersion: number,
  currentVersion = CURRENT_SCHEMA_VERSION,
): boolean {
  // Can replay if we have a migration path from stored to current
  for (let v = storedVersion; v < currentVersion; v++) {
    if (!migrations.has(v)) return false;
  }
  return true;
}

export function getCompatibilityReport(): {
  currentVersion: number;
  migrationsAvailable: number[];
  oldestCompatibleVersion: number;
} {
  const available = [...migrations.keys()].sort((a, b) => a - b);
  const oldest = available.length > 0 ? available[0]! + 1 : CURRENT_SCHEMA_VERSION;
  return { currentVersion: CURRENT_SCHEMA_VERSION, migrationsAvailable: available, oldestCompatibleVersion: oldest };
}
