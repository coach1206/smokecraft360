/**
 * rolloutManager — staged feature rollout and targeting for enterprise venues.
 *
 * Rollout strategies:
 *   - PERCENTAGE:  hash-based, N% of venues (deterministic, no DB lookup)
 *   - ALLOWLIST:   specific venue IDs
 *   - DENYLIST:    exclude specific venue IDs
 *   - RING:        ring 0 (alpha), ring 1 (beta), ring 2 (GA)
 *   - SCHEDULED:   enable after a specific timestamp
 *
 * Rollout configs live in DB (rollout_configs table) and are cached locally.
 * Use alongside featureFlagEngine for per-venue flag resolution.
 */

import { pool }    from "@workspace/db";
import { logger }  from "../lib/logger";

export type RolloutStrategy = "percentage" | "allowlist" | "denylist" | "ring" | "scheduled";

export interface RolloutConfig {
  featureKey:   string;
  strategy:     RolloutStrategy;
  percentage?:  number;         // 0–100 for PERCENTAGE
  allowlist?:   string[];       // venue IDs for ALLOWLIST
  denylist?:    string[];       // venue IDs for DENYLIST
  ring?:        number;         // 0=alpha 1=beta 2=GA for RING
  scheduledAt?: number;         // unix ms for SCHEDULED
  description:  string;
  enabled:      boolean;
}

export type RingLevel = 0 | 1 | 2;

// Venue ring assignments (loaded from DB or default all → ring 2)
const venueRings = new Map<string, RingLevel>();
const configCache = new Map<string, RolloutConfig>();
let lastLoad = 0;
const CACHE_TTL = 60_000;

async function maybeReloadConfigs(): Promise<void> {
  if (Date.now() - lastLoad < CACHE_TTL) return;
  try {
    const { rows } = await pool.query(`SELECT * FROM rollout_configs WHERE enabled=TRUE`);
    configCache.clear();
    for (const r of rows as Record<string, unknown>[]) {
      const cfg: RolloutConfig = {
        featureKey:  String(r["feature_key"]),
        strategy:    String(r["strategy"]) as RolloutStrategy,
        percentage:  r["percentage"] ? Number(r["percentage"]) : undefined,
        allowlist:   r["allowlist"]  ? (r["allowlist"] as string[])  : undefined,
        denylist:    r["denylist"]   ? (r["denylist"]  as string[])  : undefined,
        ring:        r["ring"]       ? Number(r["ring"])              : undefined,
        scheduledAt: r["scheduled_at"] ? new Date(r["scheduled_at"] as string).getTime() : undefined,
        description: String(r["description"] ?? ""),
        enabled:     true,
      };
      configCache.set(cfg.featureKey, cfg);
    }
    lastLoad = Date.now();
  } catch {
    // Table may not exist — use defaults
  }
}

export async function isInRollout(featureKey: string, venueId: string): Promise<boolean> {
  await maybeReloadConfigs();
  const cfg = configCache.get(featureKey);
  if (!cfg || !cfg.enabled) return false;

  switch (cfg.strategy) {
    case "percentage":
      return hashVenue(venueId, featureKey) < (cfg.percentage ?? 0);

    case "allowlist":
      return (cfg.allowlist ?? []).includes(venueId);

    case "denylist":
      return !(cfg.denylist ?? []).includes(venueId);

    case "ring": {
      const venueRing = venueRings.get(venueId) ?? 2;
      return venueRing <= (cfg.ring ?? 2);
    }

    case "scheduled":
      return Date.now() >= (cfg.scheduledAt ?? Infinity);
  }
}

export function setVenueRing(venueId: string, ring: RingLevel): void {
  venueRings.set(venueId, ring);
}

export async function createRollout(cfg: Omit<RolloutConfig, "enabled">): Promise<void> {
  await pool.query(
    `INSERT INTO rollout_configs
       (feature_key, strategy, percentage, allowlist, denylist, ring, scheduled_at, description, enabled, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,TRUE,NOW())
     ON CONFLICT (feature_key) DO UPDATE SET
       strategy=EXCLUDED.strategy, percentage=EXCLUDED.percentage, enabled=TRUE, description=EXCLUDED.description`,
    [cfg.featureKey, cfg.strategy, cfg.percentage ?? null,
      cfg.allowlist ? JSON.stringify(cfg.allowlist) : null,
      cfg.denylist  ? JSON.stringify(cfg.denylist)  : null,
      cfg.ring ?? null,
      cfg.scheduledAt ? new Date(cfg.scheduledAt).toISOString() : null,
      cfg.description],
  );
  configCache.delete(cfg.featureKey);
  lastLoad = 0;
  logger.info({ featureKey: cfg.featureKey, strategy: cfg.strategy }, "rolloutManager: config upserted");
}

export async function disableRollout(featureKey: string): Promise<void> {
  await pool.query(`UPDATE rollout_configs SET enabled=FALSE WHERE feature_key=$1`, [featureKey]);
  configCache.delete(featureKey);
}

export function getAllRolloutConfigs(): RolloutConfig[] {
  return [...configCache.values()];
}

function hashVenue(venueId: string, key: string): number {
  const s   = `${venueId}:${key}`;
  let   h   = 5381;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) + h) ^ s.charCodeAt(i); h = h >>> 0; }
  return h % 100;
}
