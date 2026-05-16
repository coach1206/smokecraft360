/**
 * policyRegistry — curates and manages the policy catalog.
 *
 * Provides:
 *   - Policy lookup by key/domain
 *   - DB-persisted venue policy overrides
 *   - Policy audit logging (who evaluated what, what decision was made)
 *   - Policy disable (for testing / emergency bypass)
 */

import { pool }           from "@workspace/db";
import { logger }         from "../../lib/logger";
import { evaluate, type PolicyContext, type PolicyResult } from "./policyEngine";

// Disabled policy keys (bypass evaluation entirely)
const disabledPolicies = new Set<string>();

export async function evaluateAndLog(ctx: PolicyContext): Promise<PolicyResult> {
  const result = evaluate(ctx);

  // Async audit log — fire and forget
  pool.query(
    `INSERT INTO policy_audit_log
       (venue_id, actor_id, actor_role, action, resource_id, policy_key, decision, reason, conditions, evaluated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())`,
    [
      ctx.venueId, ctx.actorId, ctx.actorRole, ctx.action, ctx.resourceId ?? null,
      result.policyKey, result.decision, result.reason, JSON.stringify(result.conditions),
    ],
  ).catch(() => {});

  if (result.decision !== "allow") {
    logger.info(
      { venueId: ctx.venueId, action: ctx.action, decision: result.decision, policy: result.policyKey },
      "policyRegistry: non-allow decision",
    );
  }

  return result;
}

export async function disablePolicy(key: string, reason: string, disabledBy: string): Promise<void> {
  disabledPolicies.add(key);
  await pool.query(
    `INSERT INTO policy_overrides (policy_key, enabled, reason, set_by, set_at)
     VALUES ($1,FALSE,$2,$3,NOW())
     ON CONFLICT (policy_key) DO UPDATE SET enabled=FALSE, reason=EXCLUDED.reason, set_by=EXCLUDED.set_by, set_at=NOW()`,
    [key, reason, disabledBy],
  ).catch(() => {});
  logger.warn({ key, reason, disabledBy }, "policyRegistry: policy disabled");
}

export async function enablePolicy(key: string, enabledBy: string): Promise<void> {
  disabledPolicies.delete(key);
  await pool.query(
    `UPDATE policy_overrides SET enabled=TRUE, set_by=$2, set_at=NOW() WHERE policy_key=$1`,
    [key, enabledBy],
  ).catch(() => {});
}

export function isPolicyEnabled(key: string): boolean {
  return !disabledPolicies.has(key);
}

export async function getPolicyAuditLog(
  venueId:  string,
  limit  = 100,
  action?: string,
): Promise<Record<string, unknown>[]> {
  const params: unknown[] = [venueId, limit];
  let   query = `SELECT * FROM policy_audit_log WHERE venue_id=$1`;
  if (action) { query += ` AND action=$3`; params.push(action); }
  query += ` ORDER BY evaluated_at DESC LIMIT $2`;
  const { rows } = await pool.query(query, params).catch(() => ({ rows: [] }));
  return rows as Record<string, unknown>[];
}

export async function getDenialStats(venueId: string, since?: Date): Promise<Record<string, number>> {
  const sinceTs = since ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { rows } = await pool.query(
    `SELECT policy_key, COUNT(*) AS cnt FROM policy_audit_log
     WHERE venue_id=$1 AND decision != 'allow' AND evaluated_at > $2
     GROUP BY policy_key ORDER BY cnt DESC`,
    [venueId, sinceTs.toISOString()],
  ).catch(() => ({ rows: [] }));
  return Object.fromEntries((rows as Record<string, unknown>[]).map(r => [String(r["policy_key"]), Number(r["cnt"])]));
}
