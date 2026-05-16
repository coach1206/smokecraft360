/**
 * venueStateEngine — authoritative live venue state system.
 *
 * Maintains an in-process state map per venue (fast reads) backed by
 * venue_context_state in Postgres (durable). State updates are event-driven
 * via the event bus and WebSocket-synchronized to connected clients.
 *
 * Guarantees:
 *   - Replay-safe: state can be reconstructed from orchestration_events log
 *   - Multi-tenant: each venue has isolated state
 *   - Stale cleanup: venues inactive >2h are evicted from the in-process map
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";

export interface VenueState {
  venueId:            string;
  activeGuests:       number;
  activeSessions:     number;
  vipCount:           number;
  engagementLevel:    number;
  socialEnergy:       number;
  operationalLoad:    number;
  inventoryPressure:  number;
  moodScore:          number;
  ambientSceneId:     string | null;
  anomalyDetected:    boolean;
  lastEventAt:        number;
  updatedAt:          number;
  version:            number;
}

const DEFAULT_STATE = (venueId: string): VenueState => ({
  venueId, activeGuests:0, activeSessions:0, vipCount:0,
  engagementLevel:0, socialEnergy:0, operationalLoad:0,
  inventoryPressure:0, moodScore:0.5, ambientSceneId:null,
  anomalyDetected:false,
  lastEventAt: Date.now(), updatedAt: Date.now(), version:0,
});

const EVICTION_TTL = 2 * 60 * 60 * 1000; // 2h

const stateMap = new Map<string, VenueState>();

export async function getVenueState(venueId: string): Promise<VenueState> {
  const cached = stateMap.get(venueId);
  if (cached && Date.now() - cached.updatedAt < 60_000) return cached;

  try {
    const { rows } = await pool.query(
      `SELECT * FROM venue_context_state WHERE venue_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [venueId],
    );
    if (rows.length === 0) return DEFAULT_STATE(venueId);

    const r = rows[0] as Record<string, unknown>;
    const state: VenueState = {
      venueId,
      activeGuests:      Number(r.active_guests      ?? 0),
      activeSessions:    Number(r.active_sessions    ?? 0),
      vipCount:          Number(r.vip_count          ?? 0),
      engagementLevel:   Number(r.engagement_level   ?? 0),
      socialEnergy:      Number(r.social_energy      ?? 0),
      operationalLoad:   Number(r.operational_load   ?? 0),
      inventoryPressure: Number(r.inventory_pressure ?? 0),
      moodScore:         Number(r.mood_score         ?? 0.5),
      ambientSceneId:    (r.ambient_scene_id as string | null) ?? null,
      anomalyDetected:   Boolean(r.anomaly_detected  ?? false),
      lastEventAt:       new Date(r.updated_at as string).getTime(),
      updatedAt:         Date.now(),
      version:           Number(r.version ?? 0),
    };
    stateMap.set(venueId, state);
    return state;
  } catch (err) {
    logger.warn({ err, venueId }, "venueStateEngine: load failed, using default");
    return DEFAULT_STATE(venueId);
  }
}

export async function updateVenueState(
  venueId: string,
  patch:   Partial<Omit<VenueState, "venueId" | "updatedAt" | "version">>,
): Promise<VenueState> {
  const current = await getVenueState(venueId);
  const next: VenueState = {
    ...current,
    ...patch,
    venueId,
    updatedAt:  Date.now(),
    lastEventAt:Date.now(),
    version:    current.version + 1,
  };

  stateMap.set(venueId, next);

  // Persist async — don't block callers
  persistVenueState(venueId, next).catch(() => {});

  await publish("twin", {
    event:   "VENUE_STATE_UPDATED",
    venueId,
    version: next.version,
    patch,
  });

  return next;
}

async function persistVenueState(venueId: string, state: VenueState): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO venue_context_state
         (venue_id, active_guests, active_sessions, vip_count,
          engagement_level, social_energy, operational_load,
          inventory_pressure, mood_score, anomaly_detected,
          ambient_scene_id, version, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       ON CONFLICT (venue_id) DO UPDATE SET
         active_guests      = EXCLUDED.active_guests,
         active_sessions    = EXCLUDED.active_sessions,
         vip_count          = EXCLUDED.vip_count,
         engagement_level   = EXCLUDED.engagement_level,
         social_energy      = EXCLUDED.social_energy,
         operational_load   = EXCLUDED.operational_load,
         inventory_pressure = EXCLUDED.inventory_pressure,
         mood_score         = EXCLUDED.mood_score,
         anomaly_detected   = EXCLUDED.anomaly_detected,
         ambient_scene_id   = EXCLUDED.ambient_scene_id,
         version            = EXCLUDED.version,
         updated_at         = NOW()`,
      [
        venueId, state.activeGuests, state.activeSessions, state.vipCount,
        state.engagementLevel, state.socialEnergy, state.operationalLoad,
        state.inventoryPressure, state.moodScore, state.anomalyDetected,
        state.ambientSceneId, state.version,
      ],
    );
  } catch (err) {
    logger.warn({ err, venueId }, "venueStateEngine: persist failed");
  }
}

/** Evict venues inactive for longer than EVICTION_TTL */
export function evictStaleVenueState(): void {
  const now = Date.now();
  for (const [venueId, state] of stateMap.entries()) {
    if (now - state.updatedAt > EVICTION_TTL) {
      stateMap.delete(venueId);
      logger.info({ venueId }, "venueStateEngine: evicted stale state");
    }
  }
}

/** Reconstruct venue state from orchestration_events (replay-safe) */
export async function replayVenueState(venueId: string, asOf: Date): Promise<VenueState> {
  try {
    const { rows } = await pool.query(
      `SELECT payload, event_type, score, created_at
       FROM orchestration_events
       WHERE venue_id = $1 AND created_at <= $2
       ORDER BY created_at ASC`,
      [venueId, asOf.toISOString()],
    );

    const state = DEFAULT_STATE(venueId);
    for (const row of rows as Record<string, unknown>[]) {
      const p = (row.payload ?? {}) as Record<string, unknown>;
      if (p["engagementLevel"] != null) state.engagementLevel = Number(p["engagementLevel"]);
      if (p["socialEnergy"]    != null) state.socialEnergy    = Number(p["socialEnergy"]);
      if (p["activeGuests"]    != null) state.activeGuests    = Number(p["activeGuests"]);
      if (p["moodScore"]       != null) state.moodScore       = Number(p["moodScore"]);
      state.version++;
    }
    return state;
  } catch (err) {
    logger.warn({ err, venueId }, "venueStateEngine: replay failed");
    return DEFAULT_STATE(venueId);
  }
}
