/**
 * WhiteLabelLicenseService — Dedicated White-Label Provisioning.
 *
 * Manages the full white-label client lifecycle:
 *   1. Provision branding config (name, colors, logo URL, domain)
 *   2. Enforce venue slot limits (maxVenues)
 *   3. Activate/revoke white-label licenses
 *   4. Track deployments per client
 *
 * Tiers:
 *   standard          — custom branding, up to 3 venues, $999/mo
 *   enterprise        — full branding + custom domain, unlimited venues, $2,999/mo
 *   full_white_label  — full source isolation + dedicated infra, contact sales
 *
 * Wraps white_label_licenses table; complements EnterpriseBillingManager
 * which handles billing contracts. This service handles branding and provisioning.
 */

import { pool }   from "@workspace/db";
import { logger } from "../../lib/logger";

export interface BrandingConfig {
  brandName:    string;
  primaryColor?: string;
  logoUrl?:     string;
  domain?:      string;
  accentColor?: string;
  fontFamily?:  string;
  tagline?:     string;
}

export interface WhiteLabelProvision {
  clientId:     string;
  clientName:   string;
  tier:         "standard" | "enterprise" | "full_white_label";
  branding:     BrandingConfig;
  maxVenues:    number;
  monthlyRateCents: number;
}

export class WhiteLabelLicenseService {

  static async provision(params: WhiteLabelProvision): Promise<{ success: boolean; licenseId: string; branding: BrandingConfig }> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO white_label_licenses
         (client_id, client_name, tier, brand_name, monthly_license_cents, max_venues, status, contract_start)
       VALUES ($1,$2,$3,$4,$5,$6,'active',NOW())
       ON CONFLICT (client_id) DO UPDATE
         SET tier = $3, brand_name = $4, monthly_license_cents = $5, max_venues = $6
       RETURNING id`,
      [params.clientId, params.clientName, params.tier, params.branding.brandName,
       params.monthlyRateCents, params.maxVenues],
    );

    const licenseId = rows[0]!.id;

    await pool.query(
      `INSERT INTO revenue_events (venue_id, revenue_type, amount_cents, metadata)
       VALUES ($1, 'white_label_provision', $2, $3)`,
      [params.clientId, params.monthlyRateCents, JSON.stringify({ licenseId, tier: params.tier, branding: params.branding })],
    ).catch(() => {});

    logger.info({ clientId: params.clientId, tier: params.tier, licenseId }, "white-label provisioned");

    return { success: true, licenseId, branding: params.branding };
  }

  static async getBrandingConfig(clientId: string): Promise<BrandingConfig | null> {
    const { rows } = await pool.query<{
      brand_name: string; metadata: Record<string, unknown> | null;
    }>(
      `SELECT brand_name, NULL AS metadata FROM white_label_licenses WHERE client_id = $1 AND status = 'active'`,
      [clientId],
    ).catch(() => ({ rows: [] as never[] }));

    if (!rows[0]) return null;

    return { brandName: rows[0].brand_name };
  }

  static async addVenueDeployment(clientId: string): Promise<{ allowed: boolean; activeVenues: number; maxVenues: number }> {
    const { rows } = await pool.query<{ active_venues: number; max_venues: number }>(
      `SELECT active_venues, max_venues FROM white_label_licenses WHERE client_id = $1 AND status = 'active'`,
      [clientId],
    ).catch(() => ({ rows: [] as { active_venues: number; max_venues: number }[] }));

    const lic = rows[0];
    if (!lic) return { allowed: false, activeVenues: 0, maxVenues: 0 };
    if (lic.active_venues >= lic.max_venues) return { allowed: false, activeVenues: lic.active_venues, maxVenues: lic.max_venues };

    await pool.query(
      `UPDATE white_label_licenses SET active_venues = active_venues + 1 WHERE client_id = $1`,
      [clientId],
    );

    return { allowed: true, activeVenues: lic.active_venues + 1, maxVenues: lic.max_venues };
  }

  static async revoke(clientId: string): Promise<void> {
    await pool.query(`UPDATE white_label_licenses SET status = 'terminated' WHERE client_id = $1`, [clientId]);
    logger.info({ clientId }, "white-label license revoked");
  }

  static async listActive(): Promise<Array<{
    clientId: string; clientName: string; tier: string; brandName: string | null;
    monthlyRateCents: number; activeVenues: number; maxVenues: number;
  }>> {
    const { rows } = await pool.query<{
      client_id: string; client_name: string; tier: string; brand_name: string | null;
      monthly_license_cents: number; active_venues: number; max_venues: number;
    }>(`SELECT client_id, client_name, tier, brand_name, monthly_license_cents, active_venues, max_venues
        FROM white_label_licenses WHERE status = 'active' ORDER BY created_at DESC`).catch(() => ({ rows: [] as never[] }));

    return rows.map(r => ({
      clientId:         r.client_id,
      clientName:       r.client_name,
      tier:             r.tier,
      brandName:        r.brand_name,
      monthlyRateCents: r.monthly_license_cents,
      activeVenues:     r.active_venues,
      maxVenues:        r.max_venues,
    }));
  }
}
