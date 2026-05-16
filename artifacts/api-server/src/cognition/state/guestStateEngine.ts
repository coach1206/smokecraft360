/**
 * guestStateEngine — tracks live state for individual guests across sessions.
 *
 * State is maintained in-process (fast) with TTL-based eviction and
 * persisted to ai_behavior_memory for durable recall.
 *
 * Tracks: session phase, craft preferences, interaction depth, VIP status,
 *         engagement arc, recommendation history.
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";

export interface GuestState {
  guestId:          string;
  venueId:          string;
  sessionId:        string | null;
  phase:            "arriving" | "exploring" | "engaged" | "ordering" | "departing" | "idle";
  craftPreference:  string | null;     // dominant craft in session
  engagementScore:  number;            // 0–1
  interactionDepth: number;            // swipe/event count
  isVip:            boolean;
  swipeCount:       number;
  addCount:         number;
  lastEventAt:      number;
  enteredAt:        number;
  updatedAt:        number;
}

const DEFAULT_GUEST = (guestId: string, venueId: string): GuestState => ({
  guestId, venueId, sessionId: null,
  phase: "arriving", craftPreference: null,
  engagementScore: 0, interactionDepth: 0,
  isVip: false, swipeCount: 0, addCount: 0,
  lastEventAt: Date.now(), enteredAt: Date.now(), updatedAt: Date.now(),
});

const GUEST_TTL = 4 * 60 * 60 * 1000; // 4h

const guestMap = new Map<string, GuestState>(); // key: `${venueId}:${guestId}`

function key(venueId: string, guestId: string) { return `${venueId}:${guestId}`; }

export function getGuestState(venueId: string, guestId: string): GuestState {
  return guestMap.get(key(venueId, guestId)) ?? DEFAULT_GUEST(guestId, venueId);
}

export async function updateGuestState(
  venueId: string,
  guestId: string,
  patch:   Partial<Omit<GuestState, "guestId" | "venueId" | "updatedAt">>,
): Promise<GuestState> {
  const current = getGuestState(venueId, guestId);
  const next: GuestState = {
    ...current,
    ...patch,
    guestId, venueId,
    updatedAt:   Date.now(),
    lastEventAt: Date.now(),
  };

  // Auto-phase transitions
  if (!patch.phase) {
    if (next.addCount > 0)               next.phase = "ordering";
    else if (next.interactionDepth > 10) next.phase = "engaged";
    else if (next.swipeCount > 2)        next.phase = "exploring";
  }

  guestMap.set(key(venueId, guestId), next);

  // Async memory persist
  persistGuestMemory(next).catch(() => {});

  await publish("cognition", {
    event: "GUEST_STATE_UPDATED",
    venueId, guestId,
    phase: next.phase,
    engagementScore: next.engagementScore,
  });

  return next;
}

export function applyGuestEvent(
  state: GuestState,
  eventType: string,
  craft?: string,
): GuestState {
  const patch: Partial<GuestState> = {
    interactionDepth: state.interactionDepth + 1,
    lastEventAt:      Date.now(),
  };

  if (eventType === "swipe_start" || eventType === "swipe_skip") {
    patch.swipeCount = (state.swipeCount ?? 0) + 1;
    if (craft) patch.craftPreference = craft;
  }
  if (eventType === "swipe_add" || eventType === "order_confirmed") {
    patch.addCount = (state.addCount ?? 0) + 1;
  }

  // Engagement score: add-events weighted more heavily
  const addBonus   = (eventType === "swipe_add" || eventType === "order_confirmed") ? 0.1 : 0.02;
  patch.engagementScore = Math.min(1, state.engagementScore + addBonus);

  return { ...state, ...patch };
}

async function persistGuestMemory(state: GuestState): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO ai_behavior_memory
         (venue_id, entity_id, entity_type, memory_type, value, confidence, last_occurrence, metadata)
       VALUES ($1,$2,'guest','session_state',$3,0.8,NOW(),$4)
       ON CONFLICT (venue_id, entity_id, memory_type) DO UPDATE SET
         value          = EXCLUDED.value,
         confidence     = GREATEST(ai_behavior_memory.confidence, 0.8),
         last_occurrence= NOW(),
         metadata       = EXCLUDED.metadata`,
      [
        state.venueId, state.guestId,
        state.engagementScore,
        JSON.stringify({
          phase: state.phase, swipeCount: state.swipeCount,
          addCount: state.addCount, craftPreference: state.craftPreference,
          interactionDepth: state.interactionDepth,
        }),
      ],
    );
  } catch { /* non-critical */ }
}

/** Evict guests inactive for longer than GUEST_TTL */
export function evictStaleGuestState(): void {
  const now = Date.now();
  for (const [k, state] of guestMap.entries()) {
    if (now - state.lastEventAt > GUEST_TTL) {
      guestMap.delete(k);
    }
  }
}

/** Get all active guests for a venue */
export function getActiveGuests(venueId: string): GuestState[] {
  const now     = Date.now();
  const results: GuestState[] = [];
  for (const [k, state] of guestMap.entries()) {
    if (k.startsWith(`${venueId}:`) && now - state.lastEventAt < GUEST_TTL) {
      results.push(state);
    }
  }
  return results;
}
