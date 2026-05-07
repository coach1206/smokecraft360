/**
 * InvestorDemoEngine — Axiom OS Expansion & Valuation Engine
 *
 * Two derivation functions, faithful to the spec:
 *
 * calculateNetworkValuation(venueCount, guestCount)
 *   Metcalfe's Law applied to hospitality data networks.
 *   networkEffectMultiplier = log10(venueCount + 1) * 2.5
 *   totalDataValuation      = guestCount × $12.50 × multiplier
 *   dataIntelligenceAccuracy climbs with scale: min(99.9, venues×0.15 + 65)
 *   marketDominanceIndex    = (venues / 5000) × 100   [target: 5 000 global venues]
 *
 * calculateRevenueStreams(venueCount)
 *   Three revenue lines — SaaS subscription, enterprise data access, AI upsell lift:
 *     saasRevenue              = venues × $1 500 × 12
 *     manufacturerDataRevenue  = venues × $5 000 × 12
 *     transactionalUpsell      = venues × $25 000
 *     totalAnnualRevenue       = sum of all three
 *
 * Both functions are pure (no I/O) so they can be unit-tested without a DB.
 * The route layer is responsible for hydrating live counts from PostgreSQL.
 */

import { sql }              from "drizzle-orm";
import { db }               from "@workspace/db";
import { logger }           from "../lib/logger";

// ── Constants (from spec) ─────────────────────────────────────────────────────

const BASE_DATA_VALUE_PER_GUEST = 12.50;    // USD — per-profile valuation floor
const GLOBAL_VENUE_TARGET       = 5_000;    // market dominance denominator
const ACCURACY_BASE             = 65;       // accuracy floor at 0 venues
const ACCURACY_GAIN_PER_VENUE   = 0.15;     // accuracy gain per venue added
const ACCURACY_CEILING          = 99.9;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NetworkValuation {
  venueCount:               number;
  guestCount:               number;
  networkEffectMultiplier:  number;   // log10(v+1) × 2.5
  totalDataValuation:       number;   // raw USD
  totalDataValuationFmt:    string;   // formatted "$1,234,567.89"
  dataIntelligenceAccuracy: number;   // 65–99.9 %
  marketDominanceIndex:     number;   // 0–100 %
}

export interface RevenueStreams {
  venueCount:              number;
  saasRevenue:             number;
  manufacturerDataRevenue: number;
  transactionalUpsell:     number;
  totalAnnualRevenue:      number;
  formatted: {
    saasRevenue:             string;
    manufacturerDataRevenue: string;
    transactionalUpsell:     string;
    totalAnnualRevenue:      string;
  };
}

export interface InvestorSnapshot {
  generatedAt:       string;
  liveVenueCount:    number;
  liveGuestCount:    number;
  networkValuation:  NetworkValuation;
  revenueStreams:    RevenueStreams;
  projections: {
    atScale500:    { network: NetworkValuation; revenue: RevenueStreams };
    atScale1000:   { network: NetworkValuation; revenue: RevenueStreams };
    atScale5000:   { network: NetworkValuation; revenue: RevenueStreams };
  };
}

// ── Formatter ─────────────────────────────────────────────────────────────────

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

// ── calculateNetworkValuation ─────────────────────────────────────────────────

export function calculateNetworkValuation(
  venueCount: number,
  guestCount: number,
): NetworkValuation {
  const networkEffectMultiplier  = Math.log10(venueCount + 1) * 2.5;
  const totalDataValuation       = guestCount * BASE_DATA_VALUE_PER_GUEST * networkEffectMultiplier;
  const dataIntelligenceAccuracy = Math.min(
    ACCURACY_CEILING,
    venueCount * ACCURACY_GAIN_PER_VENUE + ACCURACY_BASE,
  );
  const marketDominanceIndex = (venueCount / GLOBAL_VENUE_TARGET) * 100;

  return {
    venueCount,
    guestCount,
    networkEffectMultiplier: Math.round(networkEffectMultiplier * 10000) / 10000,
    totalDataValuation:      Math.round(totalDataValuation * 100) / 100,
    totalDataValuationFmt:   usd(totalDataValuation),
    dataIntelligenceAccuracy: Math.round(dataIntelligenceAccuracy * 10) / 10,
    marketDominanceIndex:     Math.round(marketDominanceIndex * 100) / 100,
  };
}

// ── calculateRevenueStreams ────────────────────────────────────────────────────

export function calculateRevenueStreams(venueCount: number): RevenueStreams {
  const saasRevenue             = venueCount * 1_500 * 12;
  const manufacturerDataRevenue = venueCount * 5_000 * 12;
  const transactionalUpsell     = venueCount * 25_000;
  const totalAnnualRevenue      = saasRevenue + manufacturerDataRevenue + transactionalUpsell;

  return {
    venueCount,
    saasRevenue,
    manufacturerDataRevenue,
    transactionalUpsell,
    totalAnnualRevenue,
    formatted: {
      saasRevenue:             usd(saasRevenue),
      manufacturerDataRevenue: usd(manufacturerDataRevenue),
      transactionalUpsell:     usd(transactionalUpsell),
      totalAnnualRevenue:      usd(totalAnnualRevenue),
    },
  };
}

// ── getLiveCounts — hydrate from PostgreSQL ───────────────────────────────────

export async function getLiveCounts(): Promise<{ venueCount: number; guestCount: number }> {
  const result = await db.execute<{ venue_count: number; guest_count: number }>(sql`
    SELECT
      (SELECT count(*)::int FROM venues)        AS venue_count,
      (SELECT count(*)::int FROM guest_profiles) AS guest_count
  `);

  const row = result.rows[0] ?? { venue_count: 0, guest_count: 0 };

  logger.info({ venueCount: row.venue_count, guestCount: row.guest_count }, "investor demo live counts");

  return {
    venueCount: Number(row.venue_count  ?? 0),
    guestCount: Number(row.guest_count  ?? 0),
  };
}

// ── buildSnapshot — composite live + multi-scale projection ──────────────────

export async function buildSnapshot(): Promise<InvestorSnapshot> {
  const { venueCount, guestCount } = await getLiveCounts();

  // Use live guest density ratio to project guest counts at scale milestones
  const guestDensity = venueCount > 0 ? guestCount / venueCount : 200; // default 200/venue

  const project = (v: number) => ({
    network: calculateNetworkValuation(v, Math.round(v * guestDensity)),
    revenue: calculateRevenueStreams(v),
  });

  return {
    generatedAt:      new Date().toISOString(),
    liveVenueCount:   venueCount,
    liveGuestCount:   guestCount,
    networkValuation: calculateNetworkValuation(venueCount, guestCount),
    revenueStreams:   calculateRevenueStreams(venueCount),
    projections: {
      atScale500:  project(500),
      atScale1000: project(1_000),
      atScale5000: project(5_000),
    },
  };
}
