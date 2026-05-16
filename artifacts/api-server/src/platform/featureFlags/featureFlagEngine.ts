/**
 * featureFlagEngine — evaluates feature flags for venues and users.
 *
 * Resolution order (highest wins):
 *   1. Emergency global override (kill switches)
 *   2. Per-venue DB override
 *   3. Per-role override
 *   4. Rollout % (hash-based deterministic, no DB required)
 *   5. Flag registry default
 *
 * All evaluations are synchronous after initial load. A background cache
 * refresh runs every 30s so DB changes propagate without restarts.
 *
 * Safe defaults: unknown flags → false/0/""/"" (never throws).
 */

import { pool }       from "@workspace/db";
import { logger }     from "../../lib/logger";
import { getFlag, isKnownFlag, type FlagDefinition } from "./flagRegistry";

type FlagValue = boolean | string | number | Record<string, unknown>;

interface VenueOverride {
  flagKey:   string;
  venueId:   string;
  value:     FlagValue;
  updatedAt: number;
}

interface GlobalOverride {
  flagKey:   string;
  value:     FlagValue;
  reason:    string;
  setAt:     number;
  setBy:     string;
}

// In-process cache
const venueOverrides  = new Map<string, VenueOverride>();   // key: `${venueId}:${flagKey}`
const globalOverrides = new Map<string, GlobalOverride>();  // key: flagKey

let lastRefresh = 0;
const CACHE_TTL = 30_000;

// ─── Cache loading ────────────────────────────────────────────────────────────

export async function loadFlagCache(): Promise<void> {
  try {
    const [venueRows, globalRows] = await Promise.all([
      pool.query(`SELECT flag_key, venue_id, value, updated_at FROM feature_flag_overrides WHERE scope='venue' AND enabled=TRUE`).catch(() => ({ rows: [] })),
      pool.query(`SELECT flag_key, value, reason, set_at, set_by FROM feature_flag_overrides WHERE scope='global' AND enabled=TRUE`).catch(() => ({ rows: [] })),
    ]);

    venueOverrides.clear();
    for (const r of venueRows.rows as Record<string, unknown>[]) {
      const key = `${r["venue_id"]}:${r["flag_key"]}`;
      venueOverrides.set(key, {
        flagKey:   String(r["flag_key"]),
        venueId:   String(r["venue_id"]),
        value:     r["value"] as FlagValue,
        updatedAt: new Date(r["updated_at"] as string).getTime(),
      });
    }

    globalOverrides.clear();
    for (const r of globalRows.rows as Record<string, unknown>[]) {
      globalOverrides.set(String(r["flag_key"]), {
        flagKey: String(r["flag_key"]),
        value:   r["value"] as FlagValue,
        reason:  String(r["reason"] ?? ""),
        setAt:   new Date(r["set_at"] as string).getTime(),
        setBy:   String(r["set_by"] ?? "system"),
      });
    }

    lastRefresh = Date.now();
  } catch (err) {
    logger.warn({ err }, "featureFlagEngine: cache load failed, using previous state");
  }
}

async function maybeRefresh(): Promise<void> {
  if (Date.now() - lastRefresh > CACHE_TTL) {
    await loadFlagCache();
  }
}

// ─── Evaluation ───────────────────────────────────────────────────────────────

export function isEnabled(
  flagKey:  string,
  venueId?: string,
): boolean {
  const value = evaluate(flagKey, venueId);
  return Boolean(value);
}

export function getFlagValue(
  flagKey:  string,
  venueId?: string,
): FlagValue {
  return evaluate(flagKey, venueId);
}

function evaluate(flagKey: string, venueId?: string): FlagValue {
  if (!isKnownFlag(flagKey)) {
    logger.warn({ flagKey }, "featureFlagEngine: unknown flag evaluated, returning false");
    return false;
  }

  const def = getFlag(flagKey) as FlagDefinition;

  // 1. Global overrides (highest priority — emergency kill switches)
  const globalOvr = globalOverrides.get(flagKey);
  if (globalOvr !== undefined) return globalOvr.value;

  // 2. Safety kill switch — if active, disable all gating flags
  const killSwitch = globalOverrides.get("safety.kill_switch");
  if (killSwitch?.value === true && def.gating) return false;

  // 3. Per-venue override
  if (venueId) {
    const venueOvr = venueOverrides.get(`${venueId}:${flagKey}`);
    if (venueOvr !== undefined) return venueOvr.value;
  }

  // 4. Rollout % (hash-based, deterministic per venue)
  if (def.rolloutPct < 100 && venueId) {
    const hash  = hashVenueFlag(venueId, flagKey);
    const inRollout = (hash % 100) < def.rolloutPct;
    return typeof def.defaultValue === "boolean"
      ? inRollout
      : def.defaultValue;
  }

  // 5. Registry default
  return def.defaultValue;
}

function hashVenueFlag(venueId: string, flagKey: string): number {
  const str = `${venueId}:${flagKey}`;
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h >>> 0;
  }
  return h;
}

// ─── Overrides (admin use) ────────────────────────────────────────────────────

export async function setGlobalOverride(
  flagKey: string,
  value:   FlagValue,
  setBy:   string,
  reason:  string,
): Promise<void> {
  await pool.query(
    `INSERT INTO feature_flag_overrides
       (flag_key, scope, value, reason, set_by, set_at, enabled)
     VALUES ($1,'global',$2,$3,$4,NOW(),TRUE)
     ON CONFLICT (flag_key, scope, venue_id) DO UPDATE SET
       value=EXCLUDED.value, reason=EXCLUDED.reason,
       set_by=EXCLUDED.set_by, set_at=NOW(), enabled=TRUE`,
    [flagKey, JSON.stringify(value), reason, setBy],
  );

  globalOverrides.set(flagKey, { flagKey, value, reason, setAt: Date.now(), setBy });
  logger.info({ flagKey, value, setBy, reason }, "featureFlagEngine: global override set");
}

export async function setVenueOverride(
  flagKey: string,
  venueId: string,
  value:   FlagValue,
  setBy:   string,
): Promise<void> {
  await pool.query(
    `INSERT INTO feature_flag_overrides
       (flag_key, scope, venue_id, value, set_by, set_at, enabled)
     VALUES ($1,'venue',$2,$3,$4,NOW(),TRUE)
     ON CONFLICT (flag_key, scope, venue_id) DO UPDATE SET
       value=EXCLUDED.value, set_by=EXCLUDED.set_by, set_at=NOW(), enabled=TRUE`,
    [flagKey, venueId, JSON.stringify(value), setBy],
  );

  venueOverrides.set(`${venueId}:${flagKey}`, { flagKey, venueId, value, updatedAt: Date.now() });
}

export async function clearOverride(
  flagKey: string,
  scope:   "global" | "venue",
  venueId?: string,
): Promise<void> {
  await pool.query(
    `UPDATE feature_flag_overrides SET enabled=FALSE
     WHERE flag_key=$1 AND scope=$2 AND ($3::text IS NULL OR venue_id=$3)`,
    [flagKey, scope, venueId ?? null],
  );
  if (scope === "global") globalOverrides.delete(flagKey);
  if (scope === "venue" && venueId) venueOverrides.delete(`${venueId}:${flagKey}`);
}

/** Emergency: disable all flags marked emergency=true globally */
export async function emergencyDisableAll(setBy: string, reason: string): Promise<void> {
  await setGlobalOverride("safety.kill_switch", true, setBy, reason);
  logger.warn({ setBy, reason }, "featureFlagEngine: EMERGENCY KILL SWITCH ACTIVATED");
}

// Schedule background refresh
setInterval(() => { maybeRefresh().catch(() => {}); }, CACHE_TTL).unref();

// Initial load (non-blocking)
loadFlagCache().catch(() => {});
