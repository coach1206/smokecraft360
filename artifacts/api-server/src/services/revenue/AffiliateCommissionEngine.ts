/**
 * AffiliateCommissionEngine — Multi-level Commission Calculation.
 *
 * Wraps the lower-level AffiliateService with:
 *   - Configurable commission rate per partner/source
 *   - Multi-level splits (venue / platform / partner tiers)
 *   - Commission record with payout tracking status
 *   - Bulk payout queue aggregation
 *
 * Commission structure (default):
 *   Platform:     15%
 *   Venue:        70%
 *   Tier-2 referrer: 15% (optional, if referrerId present)
 */

import { pool }            from "@workspace/db";
import { AffiliateService } from "../affiliateService";
import { logger }          from "../../lib/logger";

export interface CommissionParams {
  venueId:       string;
  source:        string;
  grossCents:    number;
  externalProductId?: string;
  referrerId?:   string;
  metadata?:     Record<string, unknown>;
}

export interface CommissionResult {
  eventId:           string;
  grossCents:        number;
  platformCents:     number;
  venueCents:        number;
  referrerCents:     number;
  netPlatformCents:  number;
  commissionRate:    number;
  source:            string;
}

const PARTNER_RATES: Record<string, { platformPct: number; venuePct: number }> = {
  aviationstack:  { platformPct: 0.20, venuePct: 0.80 },
  airalo:         { platformPct: 0.15, venuePct: 0.85 },
  allianz:        { platformPct: 0.20, venuePct: 0.80 },
  cigar_partner:  { platformPct: 0.12, venuePct: 0.88 },
  spirits_dist:   { platformPct: 0.10, venuePct: 0.90 },
  esim:           { platformPct: 0.15, venuePct: 0.85 },
  default:        { platformPct: 0.15, venuePct: 0.85 },
};

export class AffiliateCommissionEngine {

  static calculateCommission(params: {
    grossCents:    number;
    source:        string;
    referrerId?:   string;
  }): Omit<CommissionResult, "eventId" | "source"> {
    const rates   = PARTNER_RATES[params.source] ?? PARTNER_RATES["default"]!;
    const tier2Pct = params.referrerId ? 0.05 : 0;

    const platformRaw   = Math.round(params.grossCents * rates.platformPct);
    const referrerCents = Math.round(params.grossCents * tier2Pct);
    const platformCents = platformRaw - referrerCents;
    const venueCents    = params.grossCents - platformRaw;

    return {
      grossCents:       params.grossCents,
      platformCents,
      venueCents,
      referrerCents,
      netPlatformCents: platformCents,
      commissionRate:   rates.platformPct,
    };
  }

  static async recordAndQueue(params: CommissionParams): Promise<CommissionResult> {
    const calc  = AffiliateCommissionEngine.calculateCommission(params);

    const event = await AffiliateService.record({
      venueId:           params.venueId,
      source:            params.source as import("../affiliateService").AffiliateSource,
      grossCents:        params.grossCents,
      externalProductId: params.externalProductId,
      metadata:          params.metadata,
    });

    logger.info({
      eventId:   event.id,
      source:    params.source,
      grossCents: params.grossCents,
      platformCents: calc.platformCents,
      venueCents:    calc.venueCents,
      referrerCents: calc.referrerCents,
    }, "affiliate commission queued");

    if (params.referrerId && calc.referrerCents > 0) {
      await pool.query(
        `INSERT INTO revenue_events (venue_id, revenue_type, amount_cents, metadata)
         VALUES ($1, 'affiliate_referrer_payout', $2, $3)`,
        [params.referrerId, calc.referrerCents, JSON.stringify({ sourceEventId: event.id, source: params.source })],
      ).catch(() => {});
    }

    return { eventId: event.id, source: params.source, ...calc };
  }

  static async getPayoutQueue(venueId?: string): Promise<{
    totalQueued: number;
    totalCents: number;
    items: { id: string; source: string; venueCents: number; status: string; createdAt: string }[];
  }> {
    type QRow = { id: string; source: string; venue_revenue_cents: number; status: string; created_at: string };
    const { rows } = await pool.query<QRow>(
      venueId
        ? `SELECT id, source, venue_revenue_cents, status, created_at FROM affiliate_events WHERE venue_id = $1 AND status = 'queued' ORDER BY created_at DESC LIMIT 100`
        : `SELECT id, source, venue_revenue_cents, status, created_at FROM affiliate_events WHERE status = 'queued' ORDER BY created_at DESC LIMIT 100`,
      venueId ? [venueId] : [],
    ).catch(() => ({ rows: [] as QRow[] }));

    return {
      totalQueued: rows.length,
      totalCents:  rows.reduce((s, r) => s + r.venue_revenue_cents, 0),
      items: rows.map(r => ({
        id: r.id, source: r.source, venueCents: r.venue_revenue_cents,
        status: r.status, createdAt: r.created_at,
      })),
    };
  }

  static async markPaid(eventIds: string[]): Promise<number> {
    if (!eventIds.length) return 0;
    const placeholders = eventIds.map((_, i) => `$${i + 1}`).join(",");
    const { rowCount } = await pool.query(
      `UPDATE affiliate_events SET status = 'paid' WHERE id IN (${placeholders})`,
      eventIds,
    );
    return rowCount ?? 0;
  }

  static getPartnerRates() {
    return Object.entries(PARTNER_RATES).map(([source, rates]) => ({ source, ...rates }));
  }
}
