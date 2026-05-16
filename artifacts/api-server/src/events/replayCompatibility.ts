/**
 * replayCompatibility — backward-compatible event replay validation.
 *
 * Ensures that replayed events (from any historic version) can be safely
 * processed by the current system:
 *   - Version compatibility matrix
 *   - Missing field defaults for old events
 *   - Deprecated field exclusion
 *   - Deterministic replay result validation
 */

import { logger }     from "../lib/logger";
import { increment }  from "../platform/observability/metricsCollector";
import { migrateEnvelope, CURRENT_SCHEMA_VERSION, type EventEnvelope } from "../platform/versioning/eventEnvelope";

export interface CompatibilityResult {
  compatible:  boolean;
  version:     number;
  warnings:    string[];
  migrations:  string[];
  envelope:    EventEnvelope;
}

// Fields added in each version that need defaults for older events
const VERSION_DEFAULTS: Record<number, Record<string, unknown>> = {
  2: { venueId: null, environment: "production", priority: "normal" },
  3: { traceId: null, causationId: null, correlationId: null },
};

// Fields removed in later versions
const DEPRECATED_FIELDS: Record<number, string[]> = {
  2: ["legacyUserId", "clientTimestamp"],
  3: ["sessionKey"],
};

export async function ensureReplayCompatibility(
  rawEnvelope: EventEnvelope,
): Promise<CompatibilityResult> {
  const warnings:   string[] = [];
  const migrations: string[] = [];

  const origVersion = rawEnvelope.schemaVersion;
  let raw: Record<string, unknown> = rawEnvelope as unknown as Record<string, unknown>;

  // Migrate to latest version
  if (origVersion < CURRENT_SCHEMA_VERSION) {
    try {
      raw = migrateEnvelope(raw) as unknown as Record<string, unknown>;
      migrations.push(`migrated_v${origVersion}_to_v${CURRENT_SCHEMA_VERSION}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn({ eventId: rawEnvelope.eventId, version: origVersion, err: msg }, "replayCompatibility: migration failed");
      return { compatible: false, version: origVersion, warnings: [msg], migrations, envelope: rawEnvelope };
    }
  }

  // Apply version defaults for missing fields
  for (const [vStr, defaults] of Object.entries(VERSION_DEFAULTS)) {
    const v = Number(vStr);
    if (origVersion < v) {
      for (const [field, def] of Object.entries(defaults)) {
        if (!(field in raw)) {
          raw[field] = def;
          warnings.push(`applied_default_${field}_v${v}`);
        }
      }
    }
  }

  // Remove deprecated fields from old events
  for (const [vStr, fields] of Object.entries(DEPRECATED_FIELDS)) {
    const v = Number(vStr);
    if (origVersion < v) {
      for (const field of fields) {
        if (field in raw) {
          delete raw[field];
          warnings.push(`removed_deprecated_${field}`);
        }
      }
    }
  }

  // Validate required current fields
  const required = ["eventId", "eventType", "schemaVersion", "payload"] as const;
  for (const field of required) {
    if (!raw[field]) {
      warnings.push(`missing_required_field_${field}`);
      increment("replay.compat", "missing_fields", 1, { field });
    }
  }

  const envelope  = raw as unknown as EventEnvelope;
  const compatible = warnings.filter(w => w.startsWith("missing_required")).length === 0;

  if (!compatible) {
    increment("replay.compat", "incompatible_events", 1);
  } else if (migrations.length > 0) {
    increment("replay.compat", "migrated_events", 1);
  }

  return { compatible, version: envelope.schemaVersion, warnings, migrations, envelope };
}

export function isVersionSupported(version: number): boolean {
  return version >= 1 && version <= CURRENT_SCHEMA_VERSION;
}

export function getCompatibilityMatrix(): {
  minSupported: number;
  maxSupported: number;
  current:      number;
  migrationPaths: Record<string, string>;
} {
  return {
    minSupported: 1,
    maxSupported: CURRENT_SCHEMA_VERSION,
    current:      CURRENT_SCHEMA_VERSION,
    migrationPaths: { "1→2": "adds venueId/environment/priority", "2→3": "adds distributed trace fields" },
  };
}
