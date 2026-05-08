/**
 * EntitlementEngine — Feature Flag + Provisioning Gate.
 *
 * Manages per-venue feature entitlements at the feature-key level.
 * Works alongside the existing venue_entitlements table (package-level)
 * and module_entitlements table (a-la-carte purchases).
 *
 * This engine handles named feature keys that can be:
 *   - Auto-provisioned when a tier is activated (via ProvisioningEngine)
 *   - Manually enabled/disabled by super_admin
 *   - Queried at request time to gate access
 *
 * Feature keys are stored in a separate feature_entitlements table
 * (created here) so they don't conflict with the existing tables.
 *
 * Checking priority:
 *   1. feature_entitlements (this engine) — most granular
 *   2. module_entitlements (a-la-carte)
 *   3. venue_entitlements (package-level)
 */

import { pool }   from "@workspace/db";
import { logger } from "../../lib/logger";

export interface FeatureEntitlement {
  venueId:       string;
  featureKey:    string;
  enabled:       boolean;
  source:        "tier" | "admin" | "trial" | "module";
  expiresAt?:    string;
  provisionedAt: string;
}

export class EntitlementEngine {

  static async enableFeature(params: {
    venueId:    string;
    featureKey: string;
    source?:    FeatureEntitlement["source"];
    expiresAt?: string;
  }): Promise<{ success: boolean; featureKey: string }> {
    await pool.query(
      `INSERT INTO feature_entitlements (venue_id, feature_key, enabled, source, expires_at, provisioned_at)
       VALUES ($1, $2, true, $3, $4, NOW())
       ON CONFLICT (venue_id, feature_key) DO UPDATE
         SET enabled = true, source = $3, expires_at = $4, provisioned_at = NOW()`,
      [params.venueId, params.featureKey, params.source ?? "admin", params.expiresAt ?? null],
    );

    logger.info({ venueId: params.venueId, featureKey: params.featureKey, source: params.source }, "feature enabled");
    return { success: true, featureKey: params.featureKey };
  }

  static async disableFeature(params: { venueId: string; featureKey: string }): Promise<{ success: boolean }> {
    await pool.query(
      `INSERT INTO feature_entitlements (venue_id, feature_key, enabled, source, provisioned_at)
       VALUES ($1, $2, false, 'admin', NOW())
       ON CONFLICT (venue_id, feature_key) DO UPDATE
         SET enabled = false`,
      [params.venueId, params.featureKey],
    );

    logger.info({ venueId: params.venueId, featureKey: params.featureKey }, "feature disabled");
    return { success: true };
  }

  static async checkFeature(venueId: string, featureKey: string): Promise<boolean> {
    const { rows } = await pool.query<{ enabled: boolean; expires_at: string | null }>(
      `SELECT enabled, expires_at FROM feature_entitlements
       WHERE venue_id = $1 AND feature_key = $2`,
      [venueId, featureKey],
    ).catch(() => ({ rows: [] as { enabled: boolean; expires_at: string | null }[] }));

    const row = rows[0];
    if (!row) return false;
    if (!row.enabled) return false;
    if (row.expires_at && new Date(row.expires_at) < new Date()) return false;
    return true;
  }

  static async listForVenue(venueId: string): Promise<FeatureEntitlement[]> {
    const { rows } = await pool.query<{
      venue_id: string; feature_key: string; enabled: boolean;
      source: string; expires_at: string | null; provisioned_at: string;
    }>(
      `SELECT * FROM feature_entitlements WHERE venue_id = $1 ORDER BY provisioned_at DESC`,
      [venueId],
    ).catch(() => ({ rows: [] as never[] }));

    return rows.map(r => ({
      venueId:       r.venue_id,
      featureKey:    r.feature_key,
      enabled:       r.enabled,
      source:        r.source as FeatureEntitlement["source"],
      expiresAt:     r.expires_at ?? undefined,
      provisionedAt: r.provisioned_at,
    }));
  }

  static async bulkEnable(venueId: string, featureKeys: string[], source: FeatureEntitlement["source"] = "tier"): Promise<number> {
    if (!featureKeys.length) return 0;
    const values = featureKeys.map((_, i) => `($1, $${i + 2}, true, '${source}', NOW())`).join(", ");
    await pool.query(
      `INSERT INTO feature_entitlements (venue_id, feature_key, enabled, source, provisioned_at)
       VALUES ${values}
       ON CONFLICT (venue_id, feature_key) DO UPDATE SET enabled = true, source = EXCLUDED.source`,
      [venueId, ...featureKeys],
    );
    logger.info({ venueId, count: featureKeys.length, source }, "bulk features enabled");
    return featureKeys.length;
  }

  static async bulkDisable(venueId: string, featureKeys: string[]): Promise<number> {
    if (!featureKeys.length) return 0;
    const placeholders = featureKeys.map((_, i) => `$${i + 2}`).join(",");
    const { rowCount } = await pool.query(
      `UPDATE feature_entitlements SET enabled = false WHERE venue_id = $1 AND feature_key IN (${placeholders})`,
      [venueId, ...featureKeys],
    );
    return rowCount ?? 0;
  }
}
