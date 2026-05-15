/**
 * productionHardening.ts — NOVEE OS Production Hardening Layer
 *
 * Provides:
 *   initProductionIndexes()  — CREATE INDEX IF NOT EXISTS on all high-traffic tables
 *   validateEnv()            — Startup check for required + recommended env vars
 *   TtlCache<V>              — Generic in-memory TTL cache (AI response dedup)
 *   deepHealthCheck()        — Memory, uptime, DB ping, cache stats, activation status
 */

import { pool }                     from "@workspace/db";
import { logger }                   from "../lib/logger";
import { RuntimeActivationService } from "./runtimeActivation";

// ── TTL Cache ─────────────────────────────────────────────────────────────────

export class TtlCache<V> {
  private readonly store = new Map<string, { value: V; expires: number }>();
  private pruneTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly ttlMs: number, pruneIntervalMs = 60_000) {
    this.pruneTimer = setInterval(() => this.prune(), pruneIntervalMs).unref();
  }

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expires) { this.store.delete(key); return undefined; }
    return entry.value;
  }

  set(key: string, value: V): void {
    this.store.set(key, { value, expires: Date.now() + this.ttlMs });
  }

  has(key: string): boolean { return this.get(key) !== undefined; }

  size(): number { return this.store.size; }

  prune(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.store) {
      if (now > entry.expires) { this.store.delete(key); pruned++; }
    }
    if (pruned > 0) logger.debug({ pruned }, "TtlCache: pruned expired entries");
    return pruned;
  }

  destroy(): void {
    if (this.pruneTimer) { clearInterval(this.pruneTimer); this.pruneTimer = null; }
    this.store.clear();
  }
}

// Shared AI response cache — 10-minute TTL (challenges / staff pitches)
export const aiResponseCache = new TtlCache<string>(10 * 60_000);

// ── Environment Validation ────────────────────────────────────────────────────

const REQUIRED_ENV    = ["DATABASE_URL", "SESSION_SECRET", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"];
const RECOMMENDED_ENV = [
  "CLOUDINARY_URL", "SENDGRID_API_KEY", "SENDGRID_FROM_EMAIL",
  "TOAST_API_KEY", "TOAST_LOCATION_ID",
  "SQUARE_ACCESS_TOKEN", "SQUARE_LOCATION_ID",
  "CLOVER_API_TOKEN", "CLOVER_MERCHANT_ID",
];

export interface EnvValidationResult {
  ok:       boolean;
  missing:  string[];
  warnings: string[];
}

export function validateEnv(): EnvValidationResult {
  const missing  = REQUIRED_ENV.filter(k => !process.env[k]);
  const warnings = RECOMMENDED_ENV.filter(k => !process.env[k]);

  if (missing.length > 0) {
    logger.error({ missing }, "FATAL — required environment variables are not set");
  }
  if (warnings.length > 0) {
    logger.warn({ warnings }, "optional env vars not set — some features will be degraded");
  }
  if (missing.length === 0 && warnings.length === 0) {
    logger.info("Environment validation passed — all required vars present");
  }

  return { ok: missing.length === 0, missing, warnings };
}

// ── Production Index Hardening ─────────────────────────────────────────────────

const PRODUCTION_INDEXES: Array<{ name: string; sql: string }> = [
  // campaigns
  { name: "idx_campaigns_venue_status",  sql: "CREATE INDEX IF NOT EXISTS idx_campaigns_venue_status ON campaigns (venue_id, status)" },
  { name: "idx_campaigns_created",       sql: "CREATE INDEX IF NOT EXISTS idx_campaigns_created ON campaigns (created_at DESC)" },

  // guest_sessions
  { name: "idx_guest_sess_profile",      sql: "CREATE INDEX IF NOT EXISTS idx_guest_sess_profile ON guest_sessions (guest_profile_id)" },
  { name: "idx_guest_sess_venue",        sql: "CREATE INDEX IF NOT EXISTS idx_guest_sess_venue ON guest_sessions (venue_id)" },
  { name: "idx_guest_sess_created",      sql: "CREATE INDEX IF NOT EXISTS idx_guest_sess_created ON guest_sessions (created_at DESC)" },

  // tabs (queried by venue + status on every POS refresh)
  { name: "idx_tabs_venue_status",       sql: "CREATE INDEX IF NOT EXISTS idx_tabs_venue_status ON tabs (venue_id, status)" },
  { name: "idx_tabs_created",            sql: "CREATE INDEX IF NOT EXISTS idx_tabs_created ON tabs (created_at DESC)" },
  { name: "idx_tabs_user",               sql: "CREATE INDEX IF NOT EXISTS idx_tabs_user ON tabs (user_id)" },

  // loyalty_points (leaderboard + balance queries)
  { name: "idx_loyalty_user",            sql: "CREATE INDEX IF NOT EXISTS idx_loyalty_user ON loyalty_points (user_id)" },
  { name: "idx_loyalty_venue_balance",   sql: "CREATE INDEX IF NOT EXISTS idx_loyalty_venue_balance ON loyalty_points (venue_id, balance DESC)" },

  // inventory_items (stock-check on every add-to-cart)
  { name: "idx_inventory_venue",         sql: "CREATE INDEX IF NOT EXISTS idx_inventory_venue ON inventory_items (venue_id)" },
  { name: "idx_inventory_product",       sql: "CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_items (product_id)" },
  { name: "idx_inventory_low_stock",     sql: "CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON inventory_items (venue_id, quantity) WHERE quantity <= 5" },

  // xp_events (leaderboard scans)
  { name: "idx_xp_events_user",          sql: "CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events (user_id, created_at DESC)" },
  { name: "idx_xp_events_venue",         sql: "CREATE INDEX IF NOT EXISTS idx_xp_events_venue ON xp_events (venue_id, created_at DESC)" },

  // user_preferences (loaded on every AI recommendation)
  { name: "idx_user_prefs_user",         sql: "CREATE INDEX IF NOT EXISTS idx_user_prefs_user ON user_preferences (user_id)" },

  // venue_entitlements (feature gate checks hit every request)
  { name: "idx_venue_ent_key",           sql: "CREATE INDEX IF NOT EXISTS idx_venue_ent_key ON venue_entitlements (venue_id, feature_key)" },

  // axiom_telemetry (time-range monitoring queries)
  { name: "idx_axiom_tel_recorded",      sql: "CREATE INDEX IF NOT EXISTS idx_axiom_tel_recorded ON axiom_telemetry (recorded_at DESC)" },

  // axiom_revenue_attributions (time-range revenue reports)
  { name: "idx_axiom_attr_attributed",   sql: "CREATE INDEX IF NOT EXISTS idx_axiom_attr_attributed ON axiom_revenue_attributions (attributed_at DESC)" },
  { name: "idx_axiom_attr_session",      sql: "CREATE INDEX IF NOT EXISTS idx_axiom_attr_session ON axiom_revenue_attributions (session_id)" },

  // axiom_session_snapshots (paused recovery scans)
  { name: "idx_axiom_snap_paused",       sql: "CREATE INDEX IF NOT EXISTS idx_axiom_snap_paused ON axiom_session_snapshots (paused) WHERE paused = true" },
  { name: "idx_axiom_snap_updated",      sql: "CREATE INDEX IF NOT EXISTS idx_axiom_snap_updated ON axiom_session_snapshots (updated_at DESC)" },
];

export async function initProductionIndexes(): Promise<{
  created: string[]; skipped: string[];
}> {
  const created: string[] = [];
  const skipped: string[] = [];

  await Promise.all(
    PRODUCTION_INDEXES.map(async ({ name, sql }) => {
      try {
        await pool.query(sql);
        created.push(name);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code;
        if (code !== "42P07" && code !== "42703" && code !== "42P01") {
          logger.warn({ err, name }, "production index creation skipped");
        }
        skipped.push(name);
      }
    }),
  );

  logger.info(
    { total: PRODUCTION_INDEXES.length, created: created.length, skipped: skipped.length },
    "Production index hardening complete",
  );
  return { created, skipped };
}

// ── Deep Health Check ─────────────────────────────────────────────────────────

export interface DeepHealthReport {
  timestamp:     string;
  uptimeSeconds: number;
  nodeVersion:   string;
  overallStatus: "healthy" | "degraded" | "unhealthy";
  memory: {
    rssMb:       number;
    heapUsedMb:  number;
    heapTotalMb: number;
    heapPct:     number;
  };
  db: {
    status:    "ok" | "slow" | "down";
    latencyMs: number;
    poolSize:  number;
    poolIdle:  number;
    poolWait:  number;
  };
  ai: {
    cacheSize:    number;
    cacheEntries: number;
  };
  activation: string;
  env: EnvValidationResult;
}

let _lastEnvResult: EnvValidationResult | null = null;

export async function deepHealthCheck(): Promise<DeepHealthReport> {
  const mem = process.memoryUsage();
  const heapPct = Math.round((mem.heapUsed / mem.heapTotal) * 100);

  const t0 = Date.now();
  let dbStatus: "ok" | "slow" | "down" = "ok";
  let dbLatencyMs = 0;

  try {
    await pool.query("SELECT 1");
    dbLatencyMs = Date.now() - t0;
    if (dbLatencyMs > 500) dbStatus = "slow";
  } catch {
    dbStatus = "down";
    dbLatencyMs = Date.now() - t0;
  }

  const poolAny = pool as unknown as {
    totalCount?: number; idleCount?: number; waitingCount?: number;
  };

  const envResult = _lastEnvResult ?? validateEnv();
  _lastEnvResult = envResult;

  const overallStatus: DeepHealthReport["overallStatus"] =
    dbStatus === "down" || !envResult.ok ? "unhealthy" :
    dbStatus === "slow" || heapPct > 85  ? "degraded"  :
    "healthy";

  return {
    timestamp:     new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion:   process.version,
    overallStatus,
    memory: {
      rssMb:       Math.round(mem.rss       / 1_048_576),
      heapUsedMb:  Math.round(mem.heapUsed  / 1_048_576),
      heapTotalMb: Math.round(mem.heapTotal / 1_048_576),
      heapPct,
    },
    db: {
      status:    dbStatus,
      latencyMs: dbLatencyMs,
      poolSize:  poolAny.totalCount   ?? -1,
      poolIdle:  poolAny.idleCount    ?? -1,
      poolWait:  poolAny.waitingCount ?? -1,
    },
    ai: {
      cacheSize:    aiResponseCache.size(),
      cacheEntries: aiResponseCache.size(),
    },
    activation: RuntimeActivationService.report?.overallStatus ?? "NOT_RUN",
    env: envResult,
  };
}
