/**
 * OperationalAutonomyEngine — Venue Intelligence Conductor.
 *
 * Phase B: Operational Autonomy Engine.
 *
 * The autonomous venue intelligence layer. Analyses real swipe telemetry,
 * session depth, conversion signals, and inventory movement to generate
 * granular staff advisories — without waiting for staff to request them.
 *
 * Features:
 *   - Guest engagement scoring (hesitation, depth, conversion velocity)
 *   - Upsell opportunity detection from swipe pattern analysis
 *   - Social influence detection (group session patterns)
 *   - Pacing recommendations based on VenueEnergyEngine state
 *   - Inventory movement optimization signals
 *   - Staff load inference from session volume
 *   - Frustration detection from rapid skip sequences
 *
 * Staff Advisory Types:
 *   UPSELL_OPPORTUNITY     — "Guest likely ready for premium pairing."
 *   GUEST_HESITATION       — "Avoid interruption during deep blend exploration."
 *   HIGH_ENGAGEMENT_DROP   — "High engagement drop risk detected."
 *   SOCIAL_INFLUENCE       — "Group session — social recommendation opportunity."
 *   PACING_RECOMMENDATION  — "Slow recommendation cadence for VIP table."
 *   FRUSTRATION_DETECTED   — "Guest showing rapid-skip frustration signals."
 *   INVENTORY_ALERT        — "Low-stock item trending — prioritize alternatives."
 *
 * Runs every 3 minutes. Emits `eeie:staff_advisory` via Socket.io.
 */

import { sql }              from "drizzle-orm";
import { db }               from "@workspace/db";
import { getIO }            from "../lib/socketServer";
import { VenueEnergyEngine } from "./venueEnergyEngine";
import { NeuralEventBus }    from "./neuralEventBus";
import { logger }            from "../lib/logger";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AdvisoryType =
  | "UPSELL_OPPORTUNITY"
  | "GUEST_HESITATION"
  | "HIGH_ENGAGEMENT_DROP"
  | "SOCIAL_INFLUENCE"
  | "PACING_RECOMMENDATION"
  | "FRUSTRATION_DETECTED"
  | "INVENTORY_ALERT"
  | "STAFF_RELIEF";

export interface StaffAdvisory {
  id:          string;
  venueId:     string;
  type:        AdvisoryType;
  message:     string;
  confidence:  number;       // 0–100
  urgency:     "low" | "medium" | "high";
  sessionId?:  string;
  guestId?:    string;
  data:        Record<string, unknown>;
  ts:          string;
}

// Recent advisories ring buffer (per venue, last 20)
const recentAdvisories = new Map<string, StaffAdvisory[]>();

function pushAdvisory(venueId: string, advisory: StaffAdvisory): void {
  const ring = recentAdvisories.get(venueId) ?? [];
  ring.push(advisory);
  if (ring.length > 20) ring.shift();
  recentAdvisories.set(venueId, ring);
}

let advisorySeq = 0;
function makeId(): string {
  return `adv-${Date.now()}-${++advisorySeq}`;
}

// ── Session analysis ──────────────────────────────────────────────────────────

interface SessionMetrics {
  sessionId:    string;
  venueId:      string;
  eventCount:   number;
  skipCount:    number;
  addCount:     number;
  avgTimeBetweenEventsMs: number;
  lastEventAt:  string;
  uniqueGuests: number;
}

async function fetchSessionMetrics(windowMinutes = 15): Promise<SessionMetrics[]> {
  const rows = await db.execute<{
    session_id:    string;
    venue_id:      string;
    event_count:   string;
    skip_count:    string;
    add_count:     string;
    last_event_at: string;
    unique_guests: string;
    elapsed_ms:    string;
  }>(sql`
    SELECT
      session_id,
      venue_id,
      COUNT(*)                                                                           AS event_count,
      SUM(CASE WHEN event_type = 'swipe_skip'  THEN 1 ELSE 0 END)                       AS skip_count,
      SUM(CASE WHEN event_type IN ('swipe_add','order_confirmed') THEN 1 ELSE 0 END)    AS add_count,
      COUNT(DISTINCT guest_id)                                                           AS unique_guests,
      MAX(created_at)                                                                    AS last_event_at,
      EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) * 1000                    AS elapsed_ms
    FROM neural_ingestion_events
    WHERE created_at > NOW() - (${windowMinutes} || ' minutes')::interval
      AND session_id IS NOT NULL
      AND venue_id   IS NOT NULL
    GROUP BY session_id, venue_id
    HAVING COUNT(*) >= 2
  `);

  return rows.rows.map(r => ({
    sessionId:    r.session_id,
    venueId:      r.venue_id,
    eventCount:   Number(r.event_count)   || 0,
    skipCount:    Number(r.skip_count)    || 0,
    addCount:     Number(r.add_count)     || 0,
    uniqueGuests: Number(r.unique_guests) || 1,
    lastEventAt:  r.last_event_at,
    avgTimeBetweenEventsMs: Number(r.event_count) > 1
      ? (Number(r.elapsed_ms) / (Number(r.event_count) - 1))
      : 0,
  }));
}

// ── Advisory generation ───────────────────────────────────────────────────────

function analyseSession(m: SessionMetrics): StaffAdvisory[] {
  const advisories: StaffAdvisory[] = [];
  const io = getIO();
  const skipRatio = m.eventCount > 0 ? m.skipCount / m.eventCount : 0;
  const addRatio  = m.eventCount > 0 ? m.addCount  / m.eventCount : 0;

  // Frustration: >70% skips in rapid succession (<5s avg between events)
  if (skipRatio > 0.70 && m.avgTimeBetweenEventsMs < 5000 && m.eventCount >= 5) {
    const a: StaffAdvisory = {
      id:         makeId(),
      venueId:    m.venueId,
      type:       "FRUSTRATION_DETECTED",
      message:    "Guest showing rapid-skip frustration signals — consider a personal approach.",
      confidence: Math.round(skipRatio * 100),
      urgency:    "high",
      sessionId:  m.sessionId,
      data:       { skipRatio, avgTimeBetweenEventsMs: m.avgTimeBetweenEventsMs },
      ts:         new Date().toISOString(),
    };
    advisories.push(a);
    pushAdvisory(m.venueId, a);
    io.to(`venue:${m.venueId}`).emit("eeie:staff_advisory", a);
  }

  // Upsell opportunity: healthy add ratio, decent depth, not yet converted
  if (addRatio >= 0.40 && m.eventCount >= 8 && m.addCount === 0) {
    const a: StaffAdvisory = {
      id:         makeId(),
      venueId:    m.venueId,
      type:       "UPSELL_OPPORTUNITY",
      message:    "Guest likely ready for premium pairing — high engagement with add gestures.",
      confidence: Math.round(addRatio * 90),
      urgency:    "medium",
      sessionId:  m.sessionId,
      data:       { addRatio, eventCount: m.eventCount },
      ts:         new Date().toISOString(),
    };
    advisories.push(a);
    pushAdvisory(m.venueId, a);
    io.to(`venue:${m.venueId}`).emit("eeie:staff_advisory", a);
  }

  // Hesitation: slow exploration, many events, low add ratio
  if (m.avgTimeBetweenEventsMs > 20000 && m.eventCount >= 6 && addRatio < 0.15) {
    const a: StaffAdvisory = {
      id:         makeId(),
      venueId:    m.venueId,
      type:       "GUEST_HESITATION",
      message:    "Avoid interruption — guest in deep blend exploration with deliberate pacing.",
      confidence: 75,
      urgency:    "low",
      sessionId:  m.sessionId,
      data:       { avgTimeBetweenEventsMs: m.avgTimeBetweenEventsMs, addRatio },
      ts:         new Date().toISOString(),
    };
    advisories.push(a);
    pushAdvisory(m.venueId, a);
    io.to(`venue:${m.venueId}`).emit("eeie:staff_advisory", a);
  }

  // Social influence: multiple guests in one session
  if (m.uniqueGuests >= 3 && m.eventCount >= 10) {
    const a: StaffAdvisory = {
      id:         makeId(),
      venueId:    m.venueId,
      type:       "SOCIAL_INFLUENCE",
      message:    `Group session detected (${m.uniqueGuests} guests) — social recommendation opportunity.`,
      confidence: 85,
      urgency:    "medium",
      sessionId:  m.sessionId,
      data:       { uniqueGuests: m.uniqueGuests },
      ts:         new Date().toISOString(),
    };
    advisories.push(a);
    pushAdvisory(m.venueId, a);
    io.to(`venue:${m.venueId}`).emit("eeie:staff_advisory", a);
  }

  return advisories;
}

async function analyzeVenueLoad(venueId: string): Promise<void> {
  const energyState = VenueEnergyEngine.getState(venueId);
  if (!energyState) return;
  const io = getIO();

  if (energyState.state === "CONGESTED" && energyState.guestCount > 20) {
    const a: StaffAdvisory = {
      id:         makeId(),
      venueId,
      type:       "STAFF_RELIEF",
      message:    `High congestion detected (${energyState.guestCount} guests, ${energyState.conversionRate.toFixed(0)}% conversion) — additional staff attention recommended.`,
      confidence: 88,
      urgency:    "high",
      data:       { energyState: energyState.state, guestCount: energyState.guestCount },
      ts:         new Date().toISOString(),
    };
    pushAdvisory(venueId, a);
    io.to(`venue:${venueId}`).emit("eeie:staff_advisory", a);
    logger.info({ venueId, type: a.type }, "autonomy: staff relief advisory emitted");
  }

  if (energyState.state === "STAGNATING") {
    const a: StaffAdvisory = {
      id:         makeId(),
      venueId,
      type:       "HIGH_ENGAGEMENT_DROP",
      message:    "High engagement drop risk — venue energy is stagnating. Consider a floor activation.",
      confidence: 80,
      urgency:    "medium",
      data:       { energyState: energyState.state, eventCount10m: energyState.eventCount10m },
      ts:         new Date().toISOString(),
    };
    pushAdvisory(venueId, a);
    io.to(`venue:${venueId}`).emit("eeie:staff_advisory", a);
    logger.info({ venueId, type: a.type }, "autonomy: stagnation advisory emitted");
  }
}

// ── Main analysis cycle ───────────────────────────────────────────────────────

async function runAnalysis(): Promise<void> {
  try {
    const sessions   = await fetchSessionMetrics(15);
    let totalAdvisories = 0;

    for (const session of sessions) {
      const generated = analyseSession(session);
      totalAdvisories += generated.length;
    }

    // Venue-level load analysis
    const activeVenues = new Set(sessions.map(s => s.venueId));
    for (const venueId of activeVenues) {
      await analyzeVenueLoad(venueId);
    }

    NeuralEventBus.publish("operational.autonomy_event", {
      cycle:          new Date().toISOString(),
      sessionsScored: sessions.length,
      advisories:     totalAdvisories,
      venuesActive:   activeVenues.size,
    });

    logger.info(
      { sessions: sessions.length, advisories: totalAdvisories, venues: activeVenues.size },
      "operational autonomy cycle complete",
    );
  } catch (err) {
    logger.error({ err }, "operational autonomy analysis failed");
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const OperationalAutonomyEngine = {
  getRecentAdvisories(venueId: string): StaffAdvisory[] {
    return recentAdvisories.get(venueId) ?? [];
  },

  getAllRecentAdvisories(): StaffAdvisory[] {
    const all: StaffAdvisory[] = [];
    for (const advisories of recentAdvisories.values()) all.push(...advisories);
    return all.sort((a, b) => b.ts.localeCompare(a.ts)).slice(0, 50);
  },
};

// ── Startup ───────────────────────────────────────────────────────────────────

export function startOperationalAutonomyEngine(): void {
  void runAnalysis();
  setInterval(() => void runAnalysis(), 3 * 60 * 1000);   // every 3 minutes
  logger.info("OperationalAutonomyEngine started — autonomous venue intelligence active");
}
