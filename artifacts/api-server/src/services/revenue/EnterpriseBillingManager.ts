/**
 * EnterpriseBillingManager — Enterprise + Franchise Contract Engine.
 *
 * Manages enterprise contracts covering:
 *   - National/regional chains (franchise billing)
 *   - Enterprise venue networks
 *   - White-label licensing
 *   - Custom AI markup rates
 *   - Hardware lease discounts
 *
 * Monthly billing = base + (per_location × location_count)
 */

import { pool }   from "@workspace/db";
import { logger } from "../../lib/logger";

export interface EnterpriseContract {
  id:                       string;
  contractType:             "enterprise" | "franchise" | "regional_chain";
  entityName:               string;
  contactEmail?:            string;
  monthlyBaseCents:         number;
  perLocationCents:         number;
  locationCount:            number;
  aiMarkupMultiplier:       number;
  hardwareLeaseDiscountPct: number;
  status:                   "active" | "suspended" | "terminated";
  contractStart:            string;
  contractEnd?:             string;
  autoRenew:                boolean;
  notes?:                   string;
  totalMonthlyCents:        number;
}

export interface WhiteLabelLicense {
  id:                   string;
  clientId:             string;
  clientName:           string;
  tier:                 "standard" | "enterprise" | "full_white_label";
  brandName?:           string;
  monthlyLicenseCents:  number;
  brandingFeeCents:     number;
  maxVenues:            number;
  activeVenues:         number;
  status:               "active" | "suspended" | "terminated";
  contractStart:        string;
  contractEnd?:         string;
}

export class EnterpriseBillingManager {

  static async createContract(params: Omit<EnterpriseContract, "id" | "totalMonthlyCents">): Promise<EnterpriseContract> {
    const total = params.monthlyBaseCents + (params.perLocationCents * params.locationCount);

    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO enterprise_contracts
         (contract_type, entity_name, contact_email, monthly_base_cents, per_location_cents,
          location_count, ai_markup_multiplier, hardware_lease_discount_pct,
          status, contract_start, contract_end, auto_renew, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [
        params.contractType, params.entityName, params.contactEmail ?? null,
        params.monthlyBaseCents, params.perLocationCents, params.locationCount,
        params.aiMarkupMultiplier, params.hardwareLeaseDiscountPct,
        params.status, params.contractStart, params.contractEnd ?? null,
        params.autoRenew, params.notes ?? null,
      ],
    );

    logger.info({ entityName: params.entityName, totalMonthlyCents: total }, "enterprise contract created");
    return { ...params, id: rows[0]!.id, totalMonthlyCents: total };
  }

  static async createWhiteLabel(params: Omit<WhiteLabelLicense, "id" | "activeVenues">): Promise<WhiteLabelLicense> {
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO white_label_licenses
         (client_id, client_name, tier, brand_name, monthly_license_cents, branding_fee_cents,
          max_venues, status, contract_start, contract_end)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        params.clientId, params.clientName, params.tier, params.brandName ?? null,
        params.monthlyLicenseCents, params.brandingFeeCents, params.maxVenues,
        params.status, params.contractStart, params.contractEnd ?? null,
      ],
    ).catch(async err => {
      if (String(err).includes("unique")) {
        return pool.query<{ id: string }>(`SELECT id FROM white_label_licenses WHERE client_id = $1`, [params.clientId]);
      }
      throw err;
    });

    logger.info({ clientId: params.clientId, tier: params.tier }, "white-label license created");
    return { ...params, id: rows[0]!.id, activeVenues: 0 };
  }

  static async listContracts(status?: string): Promise<EnterpriseContract[]> {
    const { rows } = await pool.query<{
      id: string; contract_type: string; entity_name: string; contact_email: string | null;
      monthly_base_cents: number; per_location_cents: number; location_count: number;
      ai_markup_multiplier: number; hardware_lease_discount_pct: number; status: string;
      contract_start: string; contract_end: string | null; auto_renew: boolean; notes: string | null;
    }>(
      status
        ? `SELECT * FROM enterprise_contracts WHERE status = $1 ORDER BY created_at DESC`
        : `SELECT * FROM enterprise_contracts ORDER BY created_at DESC LIMIT 100`,
      status ? [status] : [],
    ).catch(() => ({ rows: [] as never[] }));

    return rows.map(r => ({
      id: r.id, contractType: r.contract_type as EnterpriseContract["contractType"],
      entityName: r.entity_name, contactEmail: r.contact_email ?? undefined,
      monthlyBaseCents: r.monthly_base_cents, perLocationCents: r.per_location_cents,
      locationCount: r.location_count, aiMarkupMultiplier: r.ai_markup_multiplier,
      hardwareLeaseDiscountPct: r.hardware_lease_discount_pct,
      status: r.status as EnterpriseContract["status"],
      contractStart: r.contract_start, contractEnd: r.contract_end ?? undefined,
      autoRenew: r.auto_renew, notes: r.notes ?? undefined,
      totalMonthlyCents: r.monthly_base_cents + r.per_location_cents * r.location_count,
    }));
  }

  static async listWhiteLabels(): Promise<WhiteLabelLicense[]> {
    const { rows } = await pool.query<{
      id: string; client_id: string; client_name: string; tier: string;
      brand_name: string | null; monthly_license_cents: number; branding_fee_cents: number;
      max_venues: number; active_venues: number; status: string;
      contract_start: string; contract_end: string | null;
    }>(`SELECT * FROM white_label_licenses ORDER BY created_at DESC`).catch(() => ({ rows: [] as never[] }));

    return rows.map(r => ({
      id: r.id, clientId: r.client_id, clientName: r.client_name,
      tier: r.tier as WhiteLabelLicense["tier"],
      brandName: r.brand_name ?? undefined,
      monthlyLicenseCents: r.monthly_license_cents, brandingFeeCents: r.branding_fee_cents,
      maxVenues: r.max_venues, activeVenues: r.active_venues,
      status: r.status as WhiteLabelLicense["status"],
      contractStart: r.contract_start, contractEnd: r.contract_end ?? undefined,
    }));
  }
}
