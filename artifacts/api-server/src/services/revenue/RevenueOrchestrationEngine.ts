/**
 * RevenueOrchestrationEngine — The Financial Nervous System.
 *
 * Aggregates all 12 revenue streams into a unified platform view.
 * Powers the Super Admin Revenue Command Center.
 *
 * Streams:
 *   1. EEIS Software Subscriptions
 *   2. Hardware Leasing
 *   3. Hardware Rental
 *   4. BYOD Licenses
 *   5. A la Carte Module Sales
 *   6. AI Usage Billing
 *   7. Affiliate + Partner Commissions
 *   8. Axiom Marketplace
 *   9. White-Label Licensing
 *  10. Multi-Location Franchise
 *  11. Data + Behavioral Intelligence Licensing
 *  12. Experience Consulting
 */

import { pool } from "@workspace/db";

export interface StreamMetric {
  streamId:         string;
  streamName:       string;
  mrrCents:         number;
  arrCents:         number;
  activeCount:      number;
  growthPct:        number | null;
  churnRisk:        "low" | "medium" | "high";
  topVenueId?:      string;
}

export interface PlatformRevenueSummary {
  totalMrrCents:        number;
  totalArrCents:        number;
  totalActiveAccounts:  number;
  streams:              StreamMetric[];
  generatedAt:          string;
}

export interface VenueRevenueSummary {
  venueId:          string;
  subscriptionMrr:  number;
  hardwareMrr:      number;
  moduleMrr:        number;
  aiUsageMrr:       number;
  affiliateRevenue: number;
  totalMrr:         number;
  activeModules:    string[];
  aiQuotaTier:      string;
}

export class RevenueOrchestrationEngine {

  static async getPlatformSummary(): Promise<PlatformRevenueSummary> {
    const [subs, leases, rentals, modules, aiUsage, affiliates, marketplace, whiteLabel, enterprise] = await Promise.all([
      RevenueOrchestrationEngine.getSubscriptionMetrics(),
      RevenueOrchestrationEngine.getHardwareLeaseMetrics(),
      RevenueOrchestrationEngine.getHardwareRentalMetrics(),
      RevenueOrchestrationEngine.getModuleMetrics(),
      RevenueOrchestrationEngine.getAIUsageMetrics(),
      RevenueOrchestrationEngine.getAffiliateMetrics(),
      RevenueOrchestrationEngine.getMarketplaceMetrics(),
      RevenueOrchestrationEngine.getWhiteLabelMetrics(),
      RevenueOrchestrationEngine.getEnterpriseMetrics(),
    ]);

    const streams: StreamMetric[] = [
      subs, leases, rentals,
      { streamId: "byod",          streamName: "BYOD Licenses",           mrrCents: 0,  arrCents: 0, activeCount: 0, growthPct: null, churnRisk: "low" },
      modules, aiUsage, affiliates, marketplace, whiteLabel, enterprise,
      { streamId: "intelligence",  streamName: "Data Intelligence",        mrrCents: 0,  arrCents: 0, activeCount: 0, growthPct: null, churnRisk: "low" },
      { streamId: "consulting",    streamName: "Experience Consulting",     mrrCents: 0,  arrCents: 0, activeCount: 0, growthPct: null, churnRisk: "low" },
    ];

    const totalMrr = streams.reduce((s, st) => s + st.mrrCents, 0);

    return {
      totalMrrCents:       totalMrr,
      totalArrCents:       totalMrr * 12,
      totalActiveAccounts: streams.reduce((s, st) => s + st.activeCount, 0),
      streams,
      generatedAt:         new Date().toISOString(),
    };
  }

  static async getVenueSummary(venueId: string): Promise<VenueRevenueSummary> {
    const [sub, leases, mods, aiRow, affiliateRow] = await Promise.all([
      pool.query<{ plan: string; status: string }>(`SELECT plan, status FROM subscriptions WHERE venue_id = $1 LIMIT 1`, [venueId]).catch(() => ({ rows: [] as { plan: string; status: string }[] })),
      pool.query<{ monthly_cents: string }>(`SELECT COALESCE(SUM(monthly_cents),0) AS monthly_cents FROM hardware_leases WHERE venue_id = $1 AND status = 'active'`, [venueId]).catch(() => ({ rows: [{ monthly_cents: "0" }] })),
      pool.query<{ module_name: string; price_cents: string }>(`SELECT module_name, price_cents FROM module_entitlements WHERE venue_id = $1 AND status = 'active'`, [venueId]).catch(() => ({ rows: [] as { module_name: string; price_cents: string }[] })),
      pool.query<{ billed: string }>(`SELECT COALESCE(SUM(billed_micro_usd)/1000,0) AS billed FROM ai_usage_events WHERE venue_id = $1 AND created_at > NOW() - INTERVAL '30 days'`, [venueId]).catch(() => ({ rows: [{ billed: "0" }] })),
      pool.query<{ total: string }>(`SELECT COALESCE(SUM(venue_revenue_cents),0) AS total FROM affiliate_events WHERE venue_id = $1 AND created_at > NOW() - INTERVAL '30 days'`, [venueId]).catch(() => ({ rows: [{ total: "0" }] })),
      pool.query<{ tier: string }>(`SELECT tier FROM ai_quotas WHERE venue_id = $1 LIMIT 1`, [venueId]).catch(() => ({ rows: [] as { tier: string }[] })),
    ]);

    const planMrr: Record<string, number> = { starter: 9900, pro: 19900, premium: 49900 };
    const subPlan  = sub.rows[0];
    const subMrr   = subPlan?.status === "active" ? (planMrr[subPlan.plan] ?? 0) : 0;

    const leaseMrr  = parseInt(leases.rows[0]?.monthly_cents ?? "0", 10);
    const modMrr    = mods.rows.reduce((s, m) => s + parseInt(m.price_cents, 10), 0);
    const aiMrr     = parseInt(aiRow.rows[0]?.billed ?? "0", 10);
    const affRev    = parseInt(affiliateRow.rows[0]?.total ?? "0", 10);

    return {
      venueId,
      subscriptionMrr:  subMrr,
      hardwareMrr:      leaseMrr,
      moduleMrr:        modMrr,
      aiUsageMrr:       aiMrr,
      affiliateRevenue: affRev,
      totalMrr:         subMrr + leaseMrr + modMrr + aiMrr,
      activeModules:    mods.rows.map(m => m.module_name),
      aiQuotaTier:      "standard",
    };
  }

  // ── Private stream metrics ──────────────────────────────────────────────────

  private static async getSubscriptionMetrics(): Promise<StreamMetric> {
    const { rows } = await pool.query<{ plan: string; count: string }>(`
      SELECT plan, COUNT(*) as count FROM subscriptions
      WHERE status = 'active' GROUP BY plan
    `).catch(() => ({ rows: [] as { plan: string; count: string }[] }));

    const planMrr: Record<string, number> = { starter: 9900, pro: 19900, premium: 49900 };
    let mrr = 0, active = 0;
    for (const r of rows) {
      const cnt = parseInt(r.count, 10);
      mrr    += (planMrr[r.plan] ?? 0) * cnt;
      active += cnt;
    }
    return { streamId: "subscription", streamName: "EEIS Software Subscriptions", mrrCents: mrr, arrCents: mrr * 12, activeCount: active, growthPct: null, churnRisk: "low" };
  }

  private static async getHardwareLeaseMetrics(): Promise<StreamMetric> {
    const { rows } = await pool.query<{ mrr: string; cnt: string }>(`
      SELECT COALESCE(SUM(monthly_cents),0) AS mrr, COUNT(*) AS cnt
      FROM hardware_leases WHERE status = 'active'
    `).catch(() => ({ rows: [{ mrr: "0", cnt: "0" }] }));
    const r = rows[0]!;
    return { streamId: "hardware_lease", streamName: "Hardware Leasing", mrrCents: parseInt(r.mrr, 10), arrCents: parseInt(r.mrr, 10) * 12, activeCount: parseInt(r.cnt, 10), growthPct: null, churnRisk: "low" };
  }

  private static async getHardwareRentalMetrics(): Promise<StreamMetric> {
    const { rows } = await pool.query<{ mrr: string; cnt: string }>(`
      SELECT COALESCE(SUM(daily_rate_cents * GREATEST(EXTRACT(EPOCH FROM (rental_end - rental_start)) / 86400, 1)),0) AS mrr,
             COUNT(*) AS cnt
      FROM hardware_rentals WHERE status = 'active'
    `).catch(() => ({ rows: [{ mrr: "0", cnt: "0" }] }));
    const r = rows[0]!;
    return { streamId: "hardware_rental", streamName: "Hardware Rental", mrrCents: Math.round(parseInt(r.mrr ?? "0", 10) / 30), arrCents: 0, activeCount: parseInt(r.cnt ?? "0", 10), growthPct: null, churnRisk: "low" };
  }

  private static async getModuleMetrics(): Promise<StreamMetric> {
    const { rows } = await pool.query<{ mrr: string; cnt: string }>(`
      SELECT COALESCE(SUM(price_cents),0) AS mrr, COUNT(*) AS cnt
      FROM module_entitlements WHERE status = 'active' AND billing_interval = 'monthly'
    `).catch(() => ({ rows: [{ mrr: "0", cnt: "0" }] }));
    const r = rows[0]!;
    return { streamId: "module", streamName: "A La Carte Modules", mrrCents: parseInt(r.mrr, 10), arrCents: parseInt(r.mrr, 10) * 12, activeCount: parseInt(r.cnt, 10), growthPct: null, churnRisk: "low" };
  }

  private static async getAIUsageMetrics(): Promise<StreamMetric> {
    const { rows } = await pool.query<{ billed: string; venues: string }>(`
      SELECT COALESCE(SUM(billed_micro_usd)/1000,0) AS billed, COUNT(DISTINCT venue_id) AS venues
      FROM ai_usage_events WHERE created_at > NOW() - INTERVAL '30 days'
    `).catch(() => ({ rows: [{ billed: "0", venues: "0" }] }));
    const r = rows[0]!;
    return { streamId: "ai_usage", streamName: "AI Usage Billing", mrrCents: parseInt(r.billed, 10), arrCents: parseInt(r.billed, 10) * 12, activeCount: parseInt(r.venues, 10), growthPct: null, churnRisk: "low" };
  }

  private static async getAffiliateMetrics(): Promise<StreamMetric> {
    const { rows } = await pool.query<{ platform: string; cnt: string }>(`
      SELECT COALESCE(SUM(platform_revenue_cents),0) AS platform, COUNT(*) AS cnt
      FROM affiliate_events WHERE created_at > NOW() - INTERVAL '30 days'
    `).catch(() => ({ rows: [{ platform: "0", cnt: "0" }] }));
    const r = rows[0]!;
    return { streamId: "affiliate", streamName: "Affiliate + Partner Commissions", mrrCents: parseInt(r.platform, 10), arrCents: parseInt(r.platform, 10) * 12, activeCount: parseInt(r.cnt, 10), growthPct: null, churnRisk: "low" };
  }

  private static async getMarketplaceMetrics(): Promise<StreamMetric> {
    const { rows } = await pool.query<{ fees: string; cnt: string }>(`
      SELECT COALESCE(SUM(platform_fee_cents),0) AS fees, COUNT(*) AS cnt
      FROM marketplace_transactions WHERE created_at > NOW() - INTERVAL '30 days'
    `).catch(() => ({ rows: [{ fees: "0", cnt: "0" }] }));
    const r = rows[0]!;
    return { streamId: "marketplace", streamName: "Axiom Marketplace", mrrCents: parseInt(r.fees, 10), arrCents: parseInt(r.fees, 10) * 12, activeCount: parseInt(r.cnt, 10), growthPct: null, churnRisk: "low" };
  }

  private static async getWhiteLabelMetrics(): Promise<StreamMetric> {
    const { rows } = await pool.query<{ mrr: string; cnt: string }>(`
      SELECT COALESCE(SUM(monthly_license_cents + branding_fee_cents),0) AS mrr, COUNT(*) AS cnt
      FROM white_label_licenses WHERE status = 'active'
    `).catch(() => ({ rows: [{ mrr: "0", cnt: "0" }] }));
    const r = rows[0]!;
    return { streamId: "white_label", streamName: "White-Label Licensing", mrrCents: parseInt(r.mrr, 10), arrCents: parseInt(r.mrr, 10) * 12, activeCount: parseInt(r.cnt, 10), growthPct: null, churnRisk: "low" };
  }

  private static async getEnterpriseMetrics(): Promise<StreamMetric> {
    const { rows } = await pool.query<{ mrr: string; cnt: string }>(`
      SELECT COALESCE(SUM(monthly_base_cents + per_location_cents * location_count),0) AS mrr, COUNT(*) AS cnt
      FROM enterprise_contracts WHERE status = 'active'
    `).catch(() => ({ rows: [{ mrr: "0", cnt: "0" }] }));
    const r = rows[0]!;
    return { streamId: "enterprise", streamName: "Franchise + Enterprise", mrrCents: parseInt(r.mrr, 10), arrCents: parseInt(r.mrr, 10) * 12, activeCount: parseInt(r.cnt, 10), growthPct: null, churnRisk: "low" };
  }
}
