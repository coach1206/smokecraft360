/**
 * NoveeEngine — CRAFT HUB & E.A.T. SYSTEM INTEGRATION ENGINE
 *
 * Three-pillar tier-gated intelligence layer:
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

export interface BiometricStream {
  energyState?: "LOW" | "NORMAL" | "HIGH";
  heartRateBpm?: number;
  [key: string]: unknown;
}

// ── Pillar 1: Demand Velocity ─────────────────────────────────────────────────

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface DemandVelocityResult {
  status:         "AUTONOMOUS_TRIGGERED" | "ALERT_DISPATCHED" | "LOGGED_REACTIVE_ONLY";
  tier:           NoveeTier;
  productId:      string;
  currentStock:   number;
  usageRatePerDay: number;
  daysRemaining:  number;
  payload?:       {
    intent:             string;
    productId:          string;
    targetVolume:       number;
    routingProtocol:    string;
    timestamp:          string;
  };
  message?: string;
}

export async function processDemandVelocity(
  venueId:   string,
  productId: string,
  tier:      NoveeTier,
): Promise<DemandVelocityResult> {
  // ── Fetch current stock ───────────────────────────────────────────────────
  const [inv] = await db
    .select({ quantity: venueInventoryTable.quantity })
    .from(venueInventoryTable)
    .where(
      and(
        eq(venueInventoryTable.venueId,   venueId),
        eq(venueInventoryTable.productId, productId),
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
        eq(demandEventsTable.productId,  productId),
        eq(demandEventsTable.eventType,  "order"),
        gte(demandEventsTable.createdAt, new Date(Date.now() - THIRTY_DAYS_MS)),
      ),
    );

  const ordersLast30 = Number(usageResult?.count ?? 0);
  const usageRatePerDay = ordersLast30 / 30;
  const daysRemaining = usageRatePerDay > 0
    ? Math.round((currentStock / usageRatePerDay) * 10) / 10
    : Infinity;

  const base = { tier, productId, currentStock, usageRatePerDay: Math.round(usageRatePerDay * 100) / 100, daysRemaining };

  // ── Tier-gated response ───────────────────────────────────────────────────
  if (tier === "premium" && daysRemaining <= 30) {
    return {
      ...base,
      status: "AUTONOMOUS_TRIGGERED",
      payload: {
        intent:          "DISTRIBUTOR_REORDER",
        productId,
        targetVolume:    Math.ceil(usageRatePerDay * 30),
        routingProtocol: "MCP_AUTOMATION_NODE",
        timestamp:       new Date().toISOString(),
      },
    };
  }

  if (tier === "mid" && daysRemaining <= 14) {
    return {
      ...base,
      status:  "ALERT_DISPATCHED",
      message: `Warning: asset ${productId} will exhaust stock within 14 days. Suggest immediate manual reorder.`,
    };
  }

  return { ...base, status: "LOGGED_REACTIVE_ONLY" };
}

// ── Pillar 2: Interface Friction & Disengagement ──────────────────────────────

export interface FrictionResult {
  tier:              NoveeTier;
  frictionDetected:  boolean;
  uiAction:          string;
  voiceCadence?:     string;
  hardwareRouting?:  string;
  reason?:           string;
  status?:           string;
}

export function evaluateUserFriction(
  tier:                  NoveeTier,
  dwellTimeSeconds:      number,
  interactionLoopsCount: number,
  biometricStream?:      BiometricStream,
): FrictionResult {
  const frictionDetected = dwellTimeSeconds > 45 || interactionLoopsCount > 3;
  const base = { tier, frictionDetected };

  if (tier === "premium") {
    if (biometricStream?.energyState === "LOW") {
      return {
        ...base,
        uiAction:        "ADAPT_INTERFACE_STREAMLINE",
        voiceCadence:    "DYNAMIC_REDUCTION",
        hardwareRouting: "ACTIVATE_AMBIENT_PROMPT",
        reason:          "Biometric and telemetry alignment indicates critical disengagement.",
      };
    }
  }

  if ((tier === "mid" || tier === "premium") && frictionDetected) {
    return {
      ...base,
      uiAction: "SWAP_TO_MINIMALIST_LAYOUT",
      reason:   "Interface dwell time threshold breached. Reducing cognitive overhead.",
    };
  }

  return { ...base, uiAction: "NO_ACTION", status: "LEGACY_LOGGING" };
}

// ── Pillar 3: Competitor Benchmarking (Sniper Daemon) ─────────────────────────

export interface SniperResult {
  tier:                    NoveeTier;
  action:                  string;
  priceDeltaPercent:       number;
  delta:                   string;
  suggestedPricingAdjustment?: number;
  automatedOverrideReady?: boolean;
  message?:                string;
  notice?:                 string;
}

export function executeSniperDaemon(
  tier:                  NoveeTier,
  internalAssetPrice:    number,
  competitorAveragePrice: number,
): SniperResult {
  const priceDeltaPercent =
    ((competitorAveragePrice - internalAssetPrice) / internalAssetPrice) * 100;
  const delta = `${priceDeltaPercent.toFixed(2)}%`;
  const base  = { tier, priceDeltaPercent: Math.round(priceDeltaPercent * 100) / 100, delta };

  if (tier === "premium") {
    if (Math.abs(priceDeltaPercent) > 8) {
      return {
        ...base,
        action:                    "EXECUTE_COUNTERMEASURE",
        suggestedPricingAdjustment: Math.round(competitorAveragePrice * 0.95 * 100) / 100,
        automatedOverrideReady:    true,
      };
    }
    return {
      ...base,
      action:  "MONITOR_STABLE",
      message: "Price delta within acceptable range. Monitoring active.",
    };
  }

  if (tier === "mid") {
    return {
      ...base,
      action:  "SURFACE_RECOMMENDATION_CARD",
      message: `Competitor price shifting. Local market delta is currently ${priceDeltaPercent.toFixed(1)}%.`,
    };
  }

  return {
    ...base,
    action: "ACCESS_DENIED",
    notice: "Upgrade to Mid or Premium to unlock Live Sniper Benchmarking.",
  };
}

// ── Tier resolver helper ──────────────────────────────────────────────────────

export function resolveCapabilityMatrix(tier: NoveeTier) {
  return {
    tier,
    pillars: {
      demandVelocity: {
        available:   true,
        level: tier === "premium"
          ? "AUTONOMOUS — auto-generates distributor reorder payloads at ≤30 days stock"
          : tier === "mid"
            ? "PROACTIVE — dispatches alert at ≤14 days stock"
            : "REACTIVE — baseline logging only",
      },
      userFriction: {
        available:   tier !== "basic",
        level: tier === "premium"
          ? "BIOMETRIC — processes wearable energy state + dwell/loop telemetry"
          : tier === "mid"
            ? "ADAPTIVE — swaps to minimalist layout on dwell/loop threshold breach"
            : "DISABLED — upgrade to Mid or Premium",
      },
      sniperDaemon: {
        available:   tier !== "basic",
        level: tier === "premium"
          ? "EXECUTE — auto-countermeasure payload when delta >8%"
          : tier === "mid"
            ? "OBSERVE — surfaces recommendation card with live delta"
            : "LOCKED — upgrade to Mid or Premium",
      },
    },
  };
}
