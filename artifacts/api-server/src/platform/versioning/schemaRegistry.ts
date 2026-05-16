/**
 * schemaRegistry — catalogs known event schemas and their versions.
 *
 * Each event type has:
 *   - A canonical schema definition (field names, types, required-ness)
 *   - A version history (what changed between versions)
 *   - A validator function (runtime validation for incoming events)
 *
 * Used by:
 *   - Event consumers to validate incoming payloads
 *   - Replay engine to verify stored events match expected schema
 *   - Admin tooling to inspect schema evolution
 */

import { z } from "zod/v4";

export interface SchemaRecord {
  eventType:   string;
  version:     number;
  description: string;
  schema:      z.ZodTypeAny;
  changelog:   VersionChangelog[];
}

interface VersionChangelog {
  version:    number;
  changes:    string[];
  breakingChange: boolean;
}

const registry = new Map<string, SchemaRecord>();

function register(record: SchemaRecord): void {
  registry.set(record.eventType, record);
}

// ─── Event schema definitions ─────────────────────────────────────────────────

register({
  eventType:   "PAYMENT_STATE_CHANGED",
  version:     2,
  description: "Payment FSM state transition",
  schema: z.object({
    paymentId: z.string(),
    venueId:   z.string(),
    from:      z.string(),
    to:        z.string(),
    eventType: z.string(),
  }),
  changelog: [
    { version:1, changes:["initial schema"],              breakingChange:false },
    { version:2, changes:["added from/to fields"],        breakingChange:false },
  ],
});

register({
  eventType:   "INVENTORY_DRIFT_DETECTED",
  version:     1,
  description: "Inventory drift detected between EEIS and POS",
  schema: z.object({
    venueId:    z.string(),
    provider:   z.string(),
    driftCount: z.number().int(),
    driftScore: z.number(),
  }),
  changelog: [{ version:1, changes:["initial schema"], breakingChange:false }],
});

register({
  eventType:   "ORDER_MUTATED",
  version:     1,
  description: "Order mutation applied",
  schema: z.object({
    venueId:      z.string(),
    orderId:      z.string(),
    mutationType: z.string(),
    mutationId:   z.string(),
    requestedBy:  z.string(),
  }),
  changelog: [{ version:1, changes:["initial schema"], breakingChange:false }],
});

register({
  eventType:   "TABLE_STATE_UPDATED",
  version:     1,
  description: "Table occupancy state changed",
  schema: z.object({
    venueId:     z.string(),
    tableId:     z.string(),
    tableNumber: z.string(),
    occupancy:   z.string(),
    guestCount:  z.number().int(),
    version:     z.number().int(),
  }),
  changelog: [{ version:1, changes:["initial schema"], breakingChange:false }],
});

register({
  eventType:   "PROVIDER_FAILOVER_ACTIVATED",
  version:     1,
  description: "POS provider failover activated",
  schema: z.object({
    venueId:  z.string(),
    provider: z.string(),
    failover: z.string(),
    reason:   z.string(),
  }),
  changelog: [{ version:1, changes:["initial schema"], breakingChange:false }],
});

register({
  eventType:   "QUEUE_PRESSURE_CHANGED",
  version:     1,
  description: "Orchestration queue pressure level changed",
  schema: z.object({
    from:       z.string(),
    to:         z.string(),
    queueDepth: z.number().int(),
    sampleRate: z.number(),
    ts:         z.number().int(),
  }),
  changelog: [{ version:1, changes:["initial schema"], breakingChange:false }],
});

register({
  eventType:   "STAFF_HANDOFF_COMPLETE",
  version:     1,
  description: "Staff table handoff completed",
  schema: z.object({
    venueId:          z.string(),
    handoffId:        z.string(),
    fromStaffId:      z.string(),
    toStaffId:        z.string(),
    tablesTransferred:z.number().int(),
    tablesFailed:     z.number().int(),
  }),
  changelog: [{ version:1, changes:["initial schema"], breakingChange:false }],
});

// ─── API ──────────────────────────────────────────────────────────────────────

export function getSchema(eventType: string): SchemaRecord | undefined {
  return registry.get(eventType);
}

export function validateEvent(
  eventType: string,
  payload:   unknown,
): { valid: boolean; errors: string[] } {
  const record = registry.get(eventType);
  if (!record) return { valid: true, errors: [] }; // unknown events pass through

  const result = record.schema.safeParse(payload);
  if (result.success) return { valid: true, errors: [] };

  const errors = result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`);
  return { valid: false, errors };
}

export function getAllSchemas(): SchemaRecord[] {
  return [...registry.values()];
}

export function getSchemaChangelog(eventType: string): VersionChangelog[] {
  return registry.get(eventType)?.changelog ?? [];
}

export function hasBreakingChanges(eventType: string, sinceVersion: number): boolean {
  const record = registry.get(eventType);
  if (!record) return false;
  return record.changelog.some(c => c.version > sinceVersion && c.breakingChange);
}
