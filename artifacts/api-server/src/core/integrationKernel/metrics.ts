/**
 * Phase 7 — Observability Pipeline
 *
 * Records per-provider latency, request counts, error rates, and token usage
 * into a time-bucketed DB table. Provides p50/p95/p99 aggregates and
 * per-venue provider performance summaries.
 */

import { pool } from "@workspace/db";
import { kernelBus } from "./eventBus";

/* ── Schema ────────────────────────────────────────────────────────────────── */

const CREATE_METRICS_TABLE = `
CREATE TABLE IF NOT EXISTS integration_metrics (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id      TEXT        NOT NULL,
  provider_id   TEXT        NOT NULL,
  provider_name TEXT        NOT NULL,
  provider_type TEXT        NOT NULL DEFAULT '',
  event_type    TEXT        NOT NULL,
  latency_ms    INTEGER,
  status_code   INTEGER,
  tokens_used   INTEGER,
  success       BOOLEAN     NOT NULL DEFAULT true,
  bucket_hour   TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ik_metrics_venue_bucket
  ON integration_metrics (venue_id, bucket_hour DESC);
CREATE INDEX IF NOT EXISTS idx_ik_metrics_provider_bucket
  ON integration_metrics (provider_id, bucket_hour DESC);
`;

let schemaReady = false;

export async function ensureMetricsSchema(): Promise<void> {
  if (schemaReady) return;
  await pool.query(CREATE_METRICS_TABLE);
  schemaReady = true;
}

/* ── Write ─────────────────────────────────────────────────────────────────── */

export interface MetricPoint {
  venueId:      string;
  providerId:   string;
  providerName: string;
  providerType: string;
  eventType:    string;
  latencyMs:    number | null;
  statusCode:   number | null;
  tokensUsed:   number | null;
  success:      boolean;
}

export async function recordMetric(m: MetricPoint): Promise<void> {
  await ensureMetricsSchema();
  const bucket = new Date();
  bucket.setMinutes(0, 0, 0);
  await pool.query(
    `INSERT INTO integration_metrics
       (venue_id, provider_id, provider_name, provider_type, event_type,
        latency_ms, status_code, tokens_used, success, bucket_hour)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      m.venueId, m.providerId, m.providerName, m.providerType,
      m.eventType, m.latencyMs, m.statusCode, m.tokensUsed,
      m.success, bucket.toISOString(),
    ],
  );
}

/* ── Read ──────────────────────────────────────────────────────────────────── */

export interface ProviderMetricSummary {
  providerId:    string;
  providerName:  string;
  providerType:  string;
  totalRequests: number;
  successCount:  number;
  errorCount:    number;
  errorRate:     number;
  p50Ms:         number | null;
  p95Ms:         number | null;
  p99Ms:         number | null;
  avgTokens:     number | null;
  totalTokens:   number;
}

export async function getProviderMetrics(
  venueId: string,
  hours = 24,
): Promise<ProviderMetricSummary[]> {
  await ensureMetricsSchema();
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT
       provider_id,
       provider_name,
       provider_type,
       COUNT(*)::int                                  AS total_requests,
       COUNT(*) FILTER (WHERE success)::int           AS success_count,
       COUNT(*) FILTER (WHERE NOT success)::int       AS error_count,
       PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms) AS p50,
       PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95,
       PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms) AS p99,
       AVG(tokens_used)::numeric(10,2)                AS avg_tokens,
       COALESCE(SUM(tokens_used),0)::int              AS total_tokens
     FROM integration_metrics
     WHERE venue_id = $1 AND bucket_hour >= $2
     GROUP BY provider_id, provider_name, provider_type
     ORDER BY total_requests DESC`,
    [venueId, since],
  );
  return rows.map(r => ({
    providerId:    String(r["provider_id"] ?? ""),
    providerName:  String(r["provider_name"] ?? ""),
    providerType:  String(r["provider_type"] ?? ""),
    totalRequests: Number(r["total_requests"] ?? 0),
    successCount:  Number(r["success_count"] ?? 0),
    errorCount:    Number(r["error_count"] ?? 0),
    errorRate:     Number(r["total_requests"]) > 0
      ? Number(r["error_count"]) / Number(r["total_requests"])
      : 0,
    p50Ms:        r["p50"] != null ? Number(r["p50"]) : null,
    p95Ms:        r["p95"] != null ? Number(r["p95"]) : null,
    p99Ms:        r["p99"] != null ? Number(r["p99"]) : null,
    avgTokens:    r["avg_tokens"] != null ? Number(r["avg_tokens"]) : null,
    totalTokens:  Number(r["total_tokens"] ?? 0),
  }));
}

export interface HourlyBucket {
  bucketHour:   string;
  totalRequests: number;
  errorCount:    number;
  avgLatencyMs:  number | null;
}

export async function getHourlyTrend(
  venueId: string,
  providerId: string,
  hours = 48,
): Promise<HourlyBucket[]> {
  await ensureMetricsSchema();
  const since = new Date(Date.now() - hours * 3_600_000).toISOString();
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT
       bucket_hour::text,
       COUNT(*)::int                            AS total_requests,
       COUNT(*) FILTER (WHERE NOT success)::int AS error_count,
       AVG(latency_ms)::numeric(10,1)           AS avg_latency_ms
     FROM integration_metrics
     WHERE venue_id = $1 AND provider_id = $2 AND bucket_hour >= $3
     GROUP BY bucket_hour
     ORDER BY bucket_hour ASC`,
    [venueId, providerId, since],
  );
  return rows.map(r => ({
    bucketHour:    String(r["bucket_hour"] ?? ""),
    totalRequests: Number(r["total_requests"] ?? 0),
    errorCount:    Number(r["error_count"] ?? 0),
    avgLatencyMs:  r["avg_latency_ms"] != null ? Number(r["avg_latency_ms"]) : null,
  }));
}

/* ── Auto-wire event bus → metrics ─────────────────────────────────────────── */

export function wireMetricsToEventBus(): void {
  kernelBus.on("provider.request_completed", async ev => {
    await recordMetric({
      venueId:      ev.venueId,
      providerId:   ev.providerId,
      providerName: ev.providerName,
      providerType: ev.providerType,
      eventType:    "request",
      latencyMs:    ev.latencyMs,
      statusCode:   ev.statusCode,
      tokensUsed:   ev.tokensUsed,
      success:      ev.success,
    }).catch(() => { /* non-fatal */ });
  });

  kernelBus.on("provider.health_changed", async ev => {
    await recordMetric({
      venueId:      ev.venueId,
      providerId:   ev.providerId,
      providerName: ev.providerName,
      providerType: "",
      eventType:    "health_check",
      latencyMs:    ev.latencyMs,
      statusCode:   null,
      tokensUsed:   null,
      success:      ev.newStatus === "healthy",
    }).catch(() => { /* non-fatal */ });
  });
}
