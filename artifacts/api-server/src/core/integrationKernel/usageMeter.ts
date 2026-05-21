/**
 * Phase 9 — Usage Metering + Budget Enforcement
 *
 * Before executing any provider request, callers invoke checkBudget() to verify
 * the venue has not exceeded its configured limits. On breach, an error is thrown
 * and a usage.threshold_exceeded event is emitted. Usage is atomically incremented
 * via the existing recordUsage() function.
 */

import { pool } from "@workspace/db";
import { kernelBus } from "./eventBus";
import { getProviderById, recordUsage } from "./credentialVault";

/* ── Error type ────────────────────────────────────────────────────────────── */

export class UsageLimitError extends Error {
  constructor(
    public readonly venueId: string,
    public readonly providerId: string,
    public readonly metric: string,
    public readonly current: number,
    public readonly limit: number,
  ) {
    super(`Usage limit reached for ${metric}: ${current}/${limit}`);
    this.name = "UsageLimitError";
  }
}

/* ── Current usage snapshot ────────────────────────────────────────────────── */

interface UsageSnapshot {
  dailyRequests:   number;
  monthlyRequests: number;
  monthlyTokens:   number;
}

async function getSnapshot(venueId: string, providerId: string): Promise<UsageSnapshot> {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + "-01";

  const { rows } = await pool.query<{ metric: string; total: string }>(
    `SELECT
       CASE
         WHEN bucket = $3 THEN 'daily_reqs'
         ELSE 'monthly_reqs'
       END AS metric,
       SUM(request_count)::text AS total
     FROM integration_usage
     WHERE venue_id = $1 AND provider_id = $2 AND bucket >= $4
     GROUP BY CASE WHEN bucket = $3 THEN 'daily_reqs' ELSE 'monthly_reqs' END
     UNION ALL
     SELECT 'monthly_tokens', COALESCE(SUM(token_count)::text,'0')
     FROM integration_usage
     WHERE venue_id = $1 AND provider_id = $2 AND bucket >= $4`,
    [venueId, providerId, today, monthStart],
  );

  const snap: UsageSnapshot = { dailyRequests: 0, monthlyRequests: 0, monthlyTokens: 0 };
  for (const row of rows) {
    if (row.metric === "daily_reqs")    snap.dailyRequests   = Number(row.total);
    if (row.metric === "monthly_reqs")  snap.monthlyRequests = Number(row.total);
    if (row.metric === "monthly_tokens") snap.monthlyTokens  = Number(row.total);
  }
  return snap;
}

/* ── Budget check ──────────────────────────────────────────────────────────── */

export async function checkBudget(venueId: string, providerId: string): Promise<void> {
  const provider = await getProviderById(providerId, venueId);
  if (!provider?.usageLimits) return;

  const limits = provider.usageLimits;
  const snap   = await getSnapshot(venueId, providerId);
  const thresh = limits.alertThreshold;

  type MetricKey = "dailyRequests" | "monthlyRequests" | "monthlyTokens";
  const checks: Array<{ key: MetricKey; current: number; limit: number | null }> = [
    { key: "dailyRequests",   current: snap.dailyRequests,   limit: limits.dailyRequests },
    { key: "monthlyRequests", current: snap.monthlyRequests, limit: limits.monthlyRequests },
    { key: "monthlyTokens",   current: snap.monthlyTokens,   limit: limits.monthlyTokens },
  ];

  for (const { key, current, limit } of checks) {
    if (limit == null) continue;
    const pct = current / limit;

    if (pct >= thresh && pct < 1) {
      kernelBus.emit("usage.threshold_exceeded", {
        venueId,
        providerId,
        providerName: provider.providerName,
        metric:       key,
        current,
        limit,
        pct,
        ts: Date.now(),
      });
    }

    if (current >= limit) {
      throw new UsageLimitError(venueId, providerId, key, current, limit);
    }
  }
}

/* ── Increment after successful request ────────────────────────────────────── */

export async function incrementUsage(
  venueId:    string,
  providerId: string,
  tokens = 0,
): Promise<void> {
  await recordUsage(venueId, providerId, 1, tokens);
}

/* ── Usage summary for API ─────────────────────────────────────────────────── */

export interface UsageSummary {
  providerId:      string;
  dailyRequests:   number;
  monthlyRequests: number;
  monthlyTokens:   number;
  limits: {
    dailyRequests:   number | null;
    monthlyRequests: number | null;
    monthlyTokens:   number | null;
    alertThreshold:  number;
  } | null;
  budgetPct: number | null;
}

export async function getUsageSummary(venueId: string): Promise<UsageSummary[]> {
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT
       p.id AS provider_id,
       p.usage_limits,
       COALESCE(SUM(u.request_count) FILTER (WHERE u.bucket = CURRENT_DATE::text), 0)::int  AS daily_reqs,
       COALESCE(SUM(u.request_count) FILTER (WHERE u.bucket >= date_trunc('month', now())::date::text), 0)::int AS monthly_reqs,
       COALESCE(SUM(u.token_count)   FILTER (WHERE u.bucket >= date_trunc('month', now())::date::text), 0)::int AS monthly_tokens
     FROM integration_providers p
     LEFT JOIN integration_usage u
       ON u.venue_id = p.venue_id AND u.provider_id = p.id
     WHERE p.venue_id = $1 AND p.is_active = true
     GROUP BY p.id, p.usage_limits`,
    [venueId],
  );

  return rows.map(r => {
    const limits = r["usage_limits"] as {
      dailyRequests:   number | null;
      monthlyRequests: number | null;
      monthlyTokens:   number | null;
      alertThreshold:  number;
    } | null;

    const monthly   = Number(r["monthly_reqs"] ?? 0);
    const monthLim  = limits?.monthlyRequests ?? null;
    const budgetPct = monthLim ? Math.min(monthly / monthLim, 1) : null;

    return {
      providerId:      String(r["provider_id"] ?? ""),
      dailyRequests:   Number(r["daily_reqs"]     ?? 0),
      monthlyRequests: monthly,
      monthlyTokens:   Number(r["monthly_tokens"] ?? 0),
      limits,
      budgetPct,
    };
  });
}
