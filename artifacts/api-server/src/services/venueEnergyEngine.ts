/**
 * VenueEnergyEngine — Live Venue Energy State Tracking.
 *
 * Phase B: Operational Autonomy Engine (energy subsystem).
 *
 * Classifies each active venue into one of six energy states every 2 minutes
 * based on real telemetry from orchestrator_events and swipe_orders tables.
 *
 * Energy States:
 *   CALM          — Very low activity, few interactions
 *   EXPLORATORY   — Healthy browsing, moderate conversions
 *   HIGH_MOMENTUM — High interaction density + strong conversions
 *   CONGESTED     — High density but low conversions (friction)
 *   STAGNATING    — Declining interaction rate, at-risk
 *   RECOVERY      — Recovering from stagnation, trending up
 *
 * Stored in VenueStateEngine under "energy" dimension.
 * Emits Socket.io `venue:energy_changed` to venue rooms on state transitions.
 * Publishes to NeuralEventBus for distributed observability.
 */

import { sql }           from "drizzle-orm";
import { db }            from "@workspace/db";
import { getIO }         from "../lib/socketServer";
import { VenueStateEngine } from "./venueStateEngine";
import { NeuralEventBus }   from "./neuralEventBus";
import { logger }           from "../lib/logger";

export type VenueEnergyState =
  | "CALM"
  | "EXPLORATORY"
  | "HIGH_MOMENTUM"
  | "CONGESTED"
  | "STAGNATING"
  | "RECOVERY";

export interface VenueEnergySnapshot {
  venueId:          string;
  state:            VenueEnergyState;
  previousState:    VenueEnergyState | null;
  eventCount10m:    number;
  conversionRate:   number;   // 0–100 %
  guestCount:       number;
  sessionDepth:     number;   // avg swipe count per session
  scoredAt:         string;
}

// In-process state (Redis-swap-ready via VenueStateEngine)
const currentStates = new Map<string, VenueEnergySnapshot>();

// ── Classification logic ──────────────────────────────────────────────────────

function classifyEnergy(
  eventCount10m:  number,
  conversionRate: number,
  previousState:  VenueEnergyState | null,
): VenueEnergyState {
  // RECOVERY: was stagnating but now picking up
  if (previousState === "STAGNATING" && eventCount10m >= 10) return "RECOVERY";

  // HIGH_MOMENTUM: busy + converting
  if (eventCount10m >= 50 && conversionRate >= 25) return "HIGH_MOMENTUM";

  // CONGESTED: busy but not converting
  if (eventCount10m >= 40 && conversionRate < 15) return "CONGESTED";

  // EXPLORATORY: moderate activity, decent conversion
  if (eventCount10m >= 15 && conversionRate >= 15) return "EXPLORATORY";

  // STAGNATING: had some activity but now very quiet
  if (previousState && previousState !== "CALM" && eventCount10m < 6) return "STAGNATING";

  // CALM: baseline low activity
  if (eventCount10m < 10) return "CALM";

  return "EXPLORATORY";
}

// ── Core update cycle ─────────────────────────────────────────────────────────

async function updateVenueEnergy(): Promise<void> {
  try {
    const rows = await db.execute<{
      venue_id:       string;
      event_count:    string;
      conversions:    string;
      session_count:  string;
    }>(sql`
      SELECT
        venue_id,
        COUNT(*)                                                                    AS event_count,
        SUM(CASE WHEN event_type IN ('order_confirmed','add_to_order') THEN 1 ELSE 0 END) AS conversions,
        COUNT(DISTINCT session_id)                                                 AS session_count
      FROM orchestrator_events
      WHERE created_at > NOW() - INTERVAL '10 minutes'
        AND venue_id IS NOT NULL
      GROUP BY venue_id
    `);

    if (!rows.rows.length) {
      logger.info("venue energy: no active venues in last 10 min");
      return;
    }

    const io = getIO();

    for (const row of rows.rows) {
      const venueId        = row.venue_id;
      const eventCount10m  = Number(row.event_count)  || 0;
      const conversions    = Number(row.conversions)   || 0;
      const sessionCount   = Number(row.session_count) || 1;
      const conversionRate = eventCount10m > 0 ? (conversions / eventCount10m) * 100 : 0;

      const guestCountRaw  = VenueStateEngine.get<number>(venueId, "guest_count");
      const guestCount     = guestCountRaw ?? sessionCount;

      const sessionDepth   = sessionCount > 0 ? Math.round(eventCount10m / sessionCount) : 0;
      const prev           = currentStates.get(venueId);
      const previousState  = prev?.state ?? null;

      const state = classifyEnergy(eventCount10m, conversionRate, previousState);

      const snapshot: VenueEnergySnapshot = {
        venueId,
        state,
        previousState,
        eventCount10m,
        conversionRate:  Math.round(conversionRate * 10) / 10,
        guestCount,
        sessionDepth,
        scoredAt:        new Date().toISOString(),
      };

      const changed = !prev || prev.state !== state;
      currentStates.set(venueId, snapshot);

      // Persist to VenueStateEngine (Redis-swap-ready)
      VenueStateEngine.set(venueId, "energy", snapshot);

      if (changed) {
        io.to(`venue:${venueId}`).emit("venue:energy_changed", snapshot);
        NeuralEventBus.publish("venue.energy_changed", snapshot, venueId);
        logger.info({ venueId, state, previousState, eventCount10m, conversionRate }, "venue energy state changed");
      }
    }
  } catch (err) {
    logger.error({ err }, "venue energy update failed");
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const VenueEnergyEngine = {
  getState(venueId: string): VenueEnergySnapshot | null {
    return currentStates.get(venueId) ?? null;
  },

  getAllStates(): VenueEnergySnapshot[] {
    return Array.from(currentStates.values());
  },

  /** Force a re-classification (called by OperationalAutonomyEngine after injecting events). */
  async forceUpdate(): Promise<void> {
    await updateVenueEnergy();
  },
};

// ── Startup ───────────────────────────────────────────────────────────────────

export function startVenueEnergyEngine(): void {
  void updateVenueEnergy();
  setInterval(() => void updateVenueEnergy(), 2 * 60 * 1000);   // every 2 minutes
  logger.info("VenueEnergyEngine started — 2-min energy state classification active");
}
