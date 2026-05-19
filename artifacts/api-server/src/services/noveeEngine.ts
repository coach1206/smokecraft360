/**
 * NoveeEngine — CRAFT HUB & E.A.T. SYSTEM INTEGRATION ENGINE
 *
 * Three-pillar tier-gated intelligence layer matching the NOVEE OS spec:
 *   1. processDemandVelocity   — inventory burn-rate + autonomous reorder
 *   2. evaluateUserFriction    — dwell/loop telemetry + biometric adaptation
 *   3. executeSniperDaemon     — competitive pricing benchmarking
 *
 * Tier resolution comes from venues.plan: "basic" | "mid" | "premium"
 */

import { eq, and, gte, count } from "drizzle-orm";
import { db, venueInventoryTable, demandEventsTable } from "@workspace/db";

// ── Types ─────────────────────────────────────────────────────────────────────

export type NoveeTier = "basic" | "mid" | "premium";

// ── Pillar 1: Demand Velocity ─────────────────────────────────────────────────

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_USAGE_RATE  = 0.1; // floor to avoid division-by-zero

export interface DemandVelocityResult {
  assetId:                  string;
  currentStock:             number;
  calculatedUsageRatePerDay: number;
  daysRemaining:            number;
  enforcedTier:             string;
  action:                   string;
  timestamp:                string;
  message?:                 string;
  payload?: {
    intent:          string;
    targetVolume:    number;
    routingNode:     string;
    mcpSecureToken:  string;
  };
}

export async function processDemandVelocity(
  venueId:  string,
  assetId:  string,
  tier:     NoveeTier,
): Promise<DemandVelocityResult> {
  // ── Fetch current stock ───────────────────────────────────────────────────
  const [inv] = await db
    .select({ quantity: venueInventoryTable.quantity })
    .from(venueInventoryTable)
    .where(
      and(
        eq(venueInventoryTable.venueId,   venueId),
        eq(venueInventoryTable.productId, assetId),
      ),
    )
    .limit(1);

  const currentStock = inv?.quantity ?? 0;

  // ── Compute 30-day order rate ─────────────────────────────────────────────
  const [usageResult] = await db
    .select({ count: count() })
    .from(demandEventsTable)
    .where(
      and(
        eq(demandEventsTable.venueId,    venueId),
        eq(demandEventsTable.productId,  assetId),
        eq(demandEventsTable.eventType,  "order"),
        gte(demandEventsTable.createdAt, new Date(Date.now() - THIRTY_DAYS_MS)),
      ),
    );

  const ordersLast30     = Number(usageResult?.count ?? 0);
  const rawRate          = ordersLast30 > 0 ? ordersLast30 / 30 : MIN_USAGE_RATE;
  const usageRatePerDay  = parseFloat(rawRate.toFixed(2));
  const daysRemaining    = parseFloat((currentStock / usageRatePerDay).toFixed(1));

  const base: DemandVelocityResult = {
    assetId,
    currentStock,
    calculatedUsageRatePerDay: usageRatePerDay,
    daysRemaining,
    enforcedTier: tier.toUpperCase(),
    action:       "MONITORING_STOCK_OPTIMAL",
    timestamp:    new Date().toISOString(),
  };

  // ── Tier-gated response ───────────────────────────────────────────────────
  if (tier === "premium") {
    if (daysRemaining <= 30) {
      return {
        ...base,
        action: "AUTONOMOUS_REORDER_PAYLOAD",
        payload: {
          intent:         "DISTRIBUTOR_PO_AUTOMATION",
          targetVolume:   Math.ceil(usageRatePerDay * 30),
          routingNode:    "GLOBAL_LUXURY_LOGISTICS_HUB",
          mcpSecureToken: "MCP_AUTH_SECURE_TOKEN_2026_LIVE",
        },
      };
    }
    return base; // MONITORING_STOCK_OPTIMAL
  }

  if (tier === "mid") {
    if (daysRemaining <= 14) {
      return {
        ...base,
        action:  "PROACTIVE_DASHBOARD_ALERT",
        message: `Warning: asset ${assetId} tracking critical at ${daysRemaining} days left. Immediate manual reorder required.`,
      };
    }
    return base; // MONITORING_STOCK_OPTIMAL
  }

  // basic
  return {
    ...base,
    action:  "LOG_REACTIVE_ONLY",
    message: "Telemetry compiled. Upgrade to Mid/Premium for automated inventory forecasting loops.",
  };
}

// ── Pillar 2: Interface Friction & Disengagement ──────────────────────────────

export interface FrictionResult {
  enforcedTier:            string;
  metricsEvaluated:        {
    dwellTime:              number;
    interactionLoopCount:   number;
    biometricEnergyState?:  string;
  };
  action:                  string;
  timestamp:               string;
  uiDirective?:            string;
  hardwareRouting?:        string;
  voiceCadenceModifier?:   string;
  message?:                string;
}

export function evaluateUserFriction(
  tier:                  NoveeTier,
  dwellTime:             number,
  interactionLoopCount:  number,
  biometricEnergyState?: string,
): FrictionResult {
  const thresholdBreached = dwellTime > 45 || interactionLoopCount > 3;

  const base: FrictionResult = {
    enforcedTier:     tier.toUpperCase(),
    metricsEvaluated: { dwellTime, interactionLoopCount, biometricEnergyState },
    action:           "INTERFACE_STABLE",
    timestamp:        new Date().toISOString(),
  };

  if (tier === "premium") {
    // Premium triggers on LOW biometric energy OR threshold breach
    if (biometricEnergyState === "LOW" || thresholdBreached) {
      return {
        ...base,
        action:               "DYNAMIC_INTERFACE_STATE_MUTATION",
        uiDirective:          "FORCE_MINIMALIST_HIGH_CONVERSION_UI",
        hardwareRouting:      "ACTIVATE_AMBIENT_AUDIO_PROMPT",
        voiceCadenceModifier: "REDUCE_CADENCE_MATCH_USER_LOW_ENERGY",
      };
    }
    return base; // INTERFACE_STABLE
  }

  if (tier === "mid") {
    if (thresholdBreached) {
      return {
        ...base,
        action:      "DYNAMIC_INTERFACE_STATE_MUTATION",
        uiDirective: "SWAP_TO_MINIMALIST_LAYOUT",
      };
    }
    return base; // INTERFACE_STABLE
  }

  // basic
  return {
    ...base,
    action:  "READ_ONLY_TELEMETRY",
    message: "Friction logged into analytics node. Dynamic UI mutation locked for Basic accounts.",
  };
}

// ── Pillar 3: Competitor Benchmarking (Sniper Daemon) ─────────────────────────

export interface SniperResult {
  enforcedTier:           string;
  calculatedDeltaPercent: number;
  action:                 string;
  timestamp:              string;
  suggestedAdjustedPrice?: number;
  automatedOverrideReady?: boolean;
  message?:               string;
}

export function executeSniperDaemon(
  tier:                NoveeTier,
  internalPrice:       number,
  competitorAverage:   number,
): SniperResult {
  const priceDeltaPercent = ((competitorAverage - internalPrice) / internalPrice) * 100;

  const base: SniperResult = {
    enforcedTier:           tier.toUpperCase(),
    calculatedDeltaPercent: parseFloat(priceDeltaPercent.toFixed(2)),
    action:                 "MARKET_POSITION_OPTIMAL",
    timestamp:              new Date().toISOString(),
  };

  if (tier === "basic") {
    return {
      ...base,
      action:  "ACCESS_DENIED",
      message: "Live Sniper Benchmarking locked. Upgrade to Mid or Premium tiers to deploy market countermeasures.",
    };
  }

  if (tier === "premium") {
    if (Math.abs(priceDeltaPercent) > 8) {
      return {
        ...base,
        action:                "EXECUTE_COUNTERMEASURE",
        suggestedAdjustedPrice: parseFloat((competitorAverage * 0.95).toFixed(2)),
        automatedOverrideReady: true,
      };
    }
    return base; // MARKET_POSITION_OPTIMAL
  }

  // mid
  return {
    ...base,
    action:  "SURFACE_RECOMMENDATION_CARD",
    message: `Market discrepancy observed. Competitor variance is ${priceDeltaPercent.toFixed(1)}%. Recommend manual adjustment parameters.`,
  };
}

// ── Tier resolver helper ──────────────────────────────────────────────────────

export function resolveCapabilityMatrix(tier: NoveeTier) {
  return {
    tier,
    pillars: {
      demandVelocity: {
        available: true,
        level: tier === "premium"
          ? "AUTONOMOUS — auto-generates distributor PO at ≤30 days stock"
          : tier === "mid"
            ? "PROACTIVE — dispatches alert at ≤14 days stock"
            : "REACTIVE — baseline telemetry logging only",
      },
      userFriction: {
        available: tier !== "basic",
        level: tier === "premium"
          ? "BIOMETRIC — triggers on wearable energy LOW or dwell/loop breach → minimalist UI + ambient audio"
          : tier === "mid"
            ? "ADAPTIVE — swaps to minimalist layout on dwell/loop threshold breach"
            : "LOCKED — upgrade to Mid or Premium",
      },
      sniperDaemon: {
        available: tier !== "basic",
        level: tier === "premium"
          ? "EXECUTE — auto-countermeasure when delta >8%; suggested price + override payload"
          : tier === "mid"
            ? "OBSERVE — surfaces recommendation card with live market delta"
            : "LOCKED — upgrade to Mid or Premium",
      },
    },
  };
}
