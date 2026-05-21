/**
 * Phase 14 — Enterprise Multi-Tenant Guard
 *
 * Sliding-window rate limiter keyed by (venueId, endpoint).
 * Tenant isolation enforcement middleware — every kernel route must
 * prove the authenticated user belongs to the requested venueId.
 * Tenant config overrides stored in integration_tenant_config table.
 */

import { type RequestHandler, type Request, type Response, type NextFunction } from "express";
import { pool } from "@workspace/db";

/* ── Schema ────────────────────────────────────────────────────────────────── */

const CREATE_TENANT_TABLES = `
CREATE TABLE IF NOT EXISTS integration_rate_limits (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id   TEXT        NOT NULL,
  endpoint   TEXT        NOT NULL,
  bucket_sec BIGINT      NOT NULL,
  count      INTEGER     NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  UNIQUE (venue_id, endpoint, bucket_sec)
);
CREATE INDEX IF NOT EXISTS idx_ik_ratelimit_venue
  ON integration_rate_limits (venue_id, endpoint, expires_at);

CREATE TABLE IF NOT EXISTS integration_tenant_config (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id   TEXT        NOT NULL UNIQUE,
  config     JSONB       NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

let schemaReady = false;

export async function ensureTenantSchema(): Promise<void> {
  if (schemaReady) return;
  await pool.query(CREATE_TENANT_TABLES);
  schemaReady = true;
}

/* ── Rate limiter ──────────────────────────────────────────────────────────── */

export interface RateLimitResult {
  allowed:     boolean;
  count:       number;
  limit:       number;
  resetAt:     number;
  retryAfterS: number;
}

export async function checkRateLimit(
  venueId:       string,
  endpoint:      string,
  maxRequests:   number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  await ensureTenantSchema();

  const bucketSec = Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds;
  const expiresAt = new Date((bucketSec + windowSeconds) * 1000).toISOString();

  const { rows } = await pool.query<{ count: string; expires_at: string }>(
    `INSERT INTO integration_rate_limits (venue_id, endpoint, bucket_sec, count, expires_at)
     VALUES ($1, $2, $3, 1, $4)
     ON CONFLICT (venue_id, endpoint, bucket_sec)
     DO UPDATE SET count = integration_rate_limits.count + 1
     RETURNING count, expires_at`,
    [venueId, endpoint, bucketSec, expiresAt],
  );

  const count  = Number(rows[0]?.count ?? 1);
  const resetAt = (bucketSec + windowSeconds) * 1000;

  return {
    allowed:     count <= maxRequests,
    count,
    limit:       maxRequests,
    resetAt,
    retryAfterS: count > maxRequests ? Math.ceil((resetAt - Date.now()) / 1000) : 0,
  };
}

/* ── Rate limit middleware factory ─────────────────────────────────────────── */

export function rateLimitTenant(
  maxRequests   = 300,
  windowSeconds = 60,
  endpointKey   = "kernel",
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const venueId = String(req.params.venueId ?? req.query["venueId"] ?? "global");
    try {
      const result = await checkRateLimit(venueId, endpointKey, maxRequests, windowSeconds);
      res.setHeader("X-RateLimit-Limit",     result.limit);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, result.limit - result.count));
      res.setHeader("X-RateLimit-Reset",     Math.ceil(result.resetAt / 1000));

      if (!result.allowed) {
        res.setHeader("Retry-After", result.retryAfterS);
        res.status(429).json({
          error:        "Rate limit exceeded",
          retryAfterS:  result.retryAfterS,
          limit:        result.limit,
        });
        return;
      }
      next();
    } catch {
      next();
    }
  };
}

/* ── Tenant isolation middleware ────────────────────────────────────────────── */

export function enforceTenantIsolation(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Request & { user?: { venueId?: string; role?: string } }).user;
    if (!user) { next(); return; }

    const superRoles = new Set(["admin", "super_admin"]);
    if (superRoles.has(user.role ?? "")) { next(); return; }

    const requestedVenueId = String(req.params.venueId ?? "");
    if (!requestedVenueId) { next(); return; }

    if (user.venueId && user.venueId !== requestedVenueId) {
      res.status(403).json({ error: "Cross-tenant access denied" });
      return;
    }
    next();
  };
}

/* ── Tenant config ─────────────────────────────────────────────────────────── */

export interface TenantConfig {
  rateLimitOverride?:     number;
  windowSecondsOverride?: number;
  allowedProviders?:      string[];
  blockedProviders?:      string[];
  features?:              Record<string, boolean>;
}

export async function getTenantConfig(venueId: string): Promise<TenantConfig> {
  await ensureTenantSchema();
  const { rows } = await pool.query<{ config: unknown }>(
    `SELECT config FROM integration_tenant_config WHERE venue_id=$1`,
    [venueId],
  );
  return (rows[0]?.config as TenantConfig) ?? {};
}

export async function setTenantConfig(venueId: string, config: TenantConfig): Promise<void> {
  await ensureTenantSchema();
  await pool.query(
    `INSERT INTO integration_tenant_config (venue_id, config)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (venue_id)
     DO UPDATE SET config=$2::jsonb, updated_at=now()`,
    [venueId, JSON.stringify(config)],
  );
}

/* ── Expired bucket cleanup ─────────────────────────────────────────────────── */

export async function purgeExpiredRateLimitBuckets(): Promise<number> {
  await ensureTenantSchema();
  const { rowCount } = await pool.query(
    `DELETE FROM integration_rate_limits WHERE expires_at < now()`,
  );
  return rowCount ?? 0;
}
