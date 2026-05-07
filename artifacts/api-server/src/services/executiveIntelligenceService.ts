/**
 * ExecutiveIntelligenceService — Revenue & Energy Logic Engine.
 *
 * calculateRoomEnergy(sessions)
 *   Scores each active table session 0–100 using:
 *     40%  swipeVelocity       — interactions per minute (cadence signal)
 *     60%  premiumInteraction  — high-tier hover dwell time (intent signal)
 *   energyScore > 75 → HIGH_MOMENTUM (upsell now)
 *   energyScore ≤ 75 → STAGNATION_RISK (intervention window)
 *
 * identifyRevenuePressure(inventory)
 *   Returns items where demand velocity > 80% of current stock level.
 *   These are "Pressure Points" — categories trending toward stock-out
 *   before the next reorder cycle. Sorted by pressure ratio descending.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SessionInteractions {
  perMinute: number;       // swipe / tap events per minute in this session
}

export interface SessionEngagement {
  highTierHoverTime: number; // cumulative seconds hovering premium-tier items
}

export interface SessionDwell {
  current: number;         // total seconds the guest has been at the table
}

export interface ActiveSession {
  tableId:     string;
  sessionId?:  string;
  interactions: SessionInteractions;
  engagement:   SessionEngagement;
  dwell:        SessionDwell;
}

export type RoomStatus = "HIGH_MOMENTUM" | "STAGNATION_RISK";

export interface RoomEnergyResult {
  tableId:      string;
  sessionId?:   string;
  energyScore:  number;      // 0–100
  status:       RoomStatus;
  breakdown: {
    velocityContribution: number;   // 0.4 weight component
    premiumContribution:  number;   // 0.6 weight component
  };
  recommendation: string;
}

export interface PressureItem {
  id:            string;
  name?:         string;
  category?:     string;
  stockLevel:    number;
  velocity:      number;      // demand events / trending score proxy
  pressureRatio: number;      // velocity / stockLevel — higher = more urgent
  urgency:       "CRITICAL" | "HIGH" | "WATCH";
}

// ── calculateRoomEnergy ───────────────────────────────────────────────────────

const ENERGY_MOMENTUM_THRESHOLD = 75;

/**
 * Normalise a raw metric to 0–100 using a soft ceiling.
 * swipeVelocity: 0 → 0, 5/min → ~100
 * premiumHover:  0 → 0, 120s → ~100
 */
function normaliseVelocity(raw: number, ceiling = 5): number {
  return Math.min(100, (raw / ceiling) * 100);
}

function normalisePremium(raw: number, ceiling = 120): number {
  return Math.min(100, (raw / ceiling) * 100);
}

export function calculateRoomEnergy(sessions: ActiveSession[]): RoomEnergyResult[] {
  return sessions.map((session) => {
    const swipeVelocity       = session.interactions.perMinute;
    const premiumInteraction  = session.engagement.highTierHoverTime;

    const velocityNorm = normaliseVelocity(swipeVelocity);
    const premiumNorm  = normalisePremium(premiumInteraction);

    const velocityContribution = velocityNorm * 0.4;
    const premiumContribution  = premiumNorm  * 0.6;
    const energyScore          = Math.min(100, Math.round(velocityContribution + premiumContribution));

    const status: RoomStatus =
      energyScore > ENERGY_MOMENTUM_THRESHOLD ? "HIGH_MOMENTUM" : "STAGNATION_RISK";

    const recommendation =
      status === "HIGH_MOMENTUM"
        ? "Guest showing strong buy intent — surface premium upsell or limited reserve."
        : swipeVelocity < 1
          ? "Low interaction cadence — consider ambient stimulation or staff check-in."
          : "Moderate engagement — recommend sensory pivot (flavor profile shift).";

    return {
      tableId:     session.tableId,
      sessionId:   session.sessionId,
      energyScore,
      status,
      breakdown:   { velocityContribution, premiumContribution },
      recommendation,
    };
  });
}

// ── identifyRevenuePressure ───────────────────────────────────────────────────

export interface PressureInput {
  id:          string;
  name?:       string;
  category?:   string;
  stockLevel:  number;
  velocity:    number;   // demand velocity proxy — e.g. trend score * orders
}

/**
 * Pressure Point rule: velocity > 80% of stockLevel
 * Urgency tiers:
 *   CRITICAL  ratio > 2.0 (demand far outpacing stock)
 *   HIGH      ratio > 1.0
 *   WATCH     ratio > 0.8 (the base filter threshold)
 */
export function identifyRevenuePressure(inventory: PressureInput[]): PressureItem[] {
  const PRESSURE_THRESHOLD = 0.8;

  return inventory
    .filter((item) => item.stockLevel > 0 && item.velocity > item.stockLevel * PRESSURE_THRESHOLD)
    .map((item) => {
      const pressureRatio = item.velocity / Math.max(item.stockLevel, 1);
      const urgency: PressureItem["urgency"] =
        pressureRatio > 2.0 ? "CRITICAL" :
        pressureRatio > 1.0 ? "HIGH"     : "WATCH";

      return {
        id:            item.id,
        name:          item.name,
        category:      item.category,
        stockLevel:    item.stockLevel,
        velocity:      item.velocity,
        pressureRatio: Math.round(pressureRatio * 100) / 100,
        urgency,
      };
    })
    .sort((a, b) => b.pressureRatio - a.pressureRatio);
}
