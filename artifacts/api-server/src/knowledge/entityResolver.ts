/**
 * entityResolver — resolves and deduplicates entities across systems.
 *
 * Maintains a canonical identity registry that maps external IDs from
 * different subsystems (POS, swipe engine, guest profiles, loyalty) to
 * a single canonical entity ID used in knowledge graphs.
 */

import { logger } from "../lib/logger";
import { pool }   from "@workspace/db";

export type EntitySystem =
  | "guest_profile" | "user" | "pos_customer" | "loyalty"
  | "product"       | "venue" | "session"       | "device";

export interface EntityRecord {
  canonicalId: string;
  type:        string;
  aliases:     Array<{ system: EntitySystem; externalId: string }>;
  confidence:  number;
  mergedFrom?: string[];
  createdAt:   number;
  updatedAt:   number;
}

// In-memory registry (warm from DB on start)
const registry = new Map<string, EntityRecord>();
const aliasMap = new Map<string, string>(); // `${system}:${externalId}` → canonicalId

function aliasKey(system: EntitySystem, externalId: string): string {
  return `${system}:${externalId}`;
}

export function resolve(system: EntitySystem, externalId: string): string | null {
  return aliasMap.get(aliasKey(system, externalId)) ?? null;
}

export function getEntity(canonicalId: string): EntityRecord | undefined {
  return registry.get(canonicalId);
}

export function registerEntity(
  canonicalId: string,
  type:        string,
  system:      EntitySystem,
  externalId:  string,
  confidence   = 1.0,
): EntityRecord {
  const existing = registry.get(canonicalId);
  const now      = Date.now();
  const alias    = { system, externalId };

  if (existing) {
    const hasAlias = existing.aliases.some(a => a.system === system && a.externalId === externalId);
    if (!hasAlias) existing.aliases.push(alias);
    existing.confidence = Math.max(existing.confidence, confidence);
    existing.updatedAt  = now;
    aliasMap.set(aliasKey(system, externalId), canonicalId);
    return existing;
  }

  const record: EntityRecord = {
    canonicalId, type, aliases: [alias], confidence, createdAt: now, updatedAt: now,
  };
  registry.set(canonicalId, record);
  aliasMap.set(aliasKey(system, externalId), canonicalId);
  return record;
}

export async function mergeEntities(primaryId: string, secondaryId: string): Promise<EntityRecord | null> {
  const primary   = registry.get(primaryId);
  const secondary = registry.get(secondaryId);
  if (!primary || !secondary) return null;

  // Merge aliases
  for (const alias of secondary.aliases) {
    const hasAlias = primary.aliases.some(a => a.system === alias.system && a.externalId === alias.externalId);
    if (!hasAlias) primary.aliases.push(alias);
    aliasMap.set(aliasKey(alias.system, alias.externalId), primaryId);
  }

  primary.mergedFrom = [...(primary.mergedFrom ?? []), secondaryId];
  primary.confidence = Math.min(1, (primary.confidence + secondary.confidence) / 2 + 0.05);
  primary.updatedAt  = Date.now();

  registry.delete(secondaryId);
  logger.info({ primaryId, secondaryId }, "entityResolver: merged");
  return primary;
}

export async function warmFromDB(): Promise<void> {
  try {
    // Load guest profiles as entities
    const { rows: guests } = await pool.query(
      `SELECT id::text, first_name, last_initial FROM guest_profiles LIMIT 5000`,
    );
    for (const g of guests) {
      registerEntity(g.id, "guest", "guest_profile", g.id);
    }
    logger.info({ count: guests.length }, "entityResolver: warmed from guest_profiles");
  } catch (err) {
    logger.warn({ err }, "entityResolver: warmFromDB failed (non-fatal)");
  }
}

export function registryStats(): { entities: number; aliases: number } {
  return { entities: registry.size, aliases: aliasMap.size };
}
