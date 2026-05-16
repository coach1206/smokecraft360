/**
 * activeSessions — tracks all currently active guest sessions across venues.
 *
 * In-process tracking (fast) backed by experience_sessions table.
 * Provides real-time active count, session age distribution, and
 * per-craft breakdown for the Command Center.
 *
 * Emits on telemetry channel on changes.
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../transport/eventBus";

export interface ActiveSession {
  sessionId:   string;
  venueId:     string;
  guestId:     string | null;
  craftType:   string | null;
  startedAt:   number;
  lastEventAt: number;
  swipeCount:  number;
  addCount:    number;
  phase:       "warming" | "active" | "converting" | "idle";
}

export interface ActiveSessionSummary {
  venueId:     string;
  ts:          number;
  totalActive: number;
  byPhase:     Record<string, number>;
  byCraft:     Record<string, number>;
  avgDuration: number;   // minutes
  oldestAge:   number;   // minutes
}

const sessionCache = new Map<string, Map<string, ActiveSession>>();   // venueId → Map<sessionId,ActiveSession>
const IDLE_THRESHOLD_MS   = 10 * 60 * 1000;  // 10 min no event = idle
const EXPIRED_THRESHOLD_MS= 60 * 60 * 1000;  // 1h = expired

function getVenueSessions(venueId: string): Map<string, ActiveSession> {
  if (!sessionCache.has(venueId)) sessionCache.set(venueId, new Map());
  return sessionCache.get(venueId)!;
}

export function upsertSession(
  venueId:   string,
  sessionId: string,
  patch:     Partial<ActiveSession>,
): ActiveSession {
  const sessions = getVenueSessions(venueId);
  const current  = sessions.get(sessionId) ?? {
    sessionId, venueId,
    guestId: null, craftType: null,
    startedAt: Date.now(), lastEventAt: Date.now(),
    swipeCount: 0, addCount: 0, phase: "warming",
  } satisfies ActiveSession;

  const updated: ActiveSession = { ...current, ...patch, lastEventAt: Date.now() };

  // Auto-phase
  if (!patch.phase) {
    if (updated.addCount > 0)              updated.phase = "converting";
    else if (updated.swipeCount > 5)       updated.phase = "active";
    else if (Date.now() - updated.lastEventAt > IDLE_THRESHOLD_MS) updated.phase = "idle";
    else                                   updated.phase = "warming";
  }

  sessions.set(sessionId, updated);
  return updated;
}

export function expireSession(venueId: string, sessionId: string): void {
  getVenueSessions(venueId).delete(sessionId);
}

export function evictExpiredSessions(): void {
  const now = Date.now();
  for (const sessions of sessionCache.values()) {
    for (const [id, s] of sessions.entries()) {
      if (now - s.lastEventAt > EXPIRED_THRESHOLD_MS) sessions.delete(id);
    }
  }
}

export async function loadActiveSessions(venueId: string): Promise<void> {
  try {
    const { rows } = await pool.query(
      `SELECT id AS session_id, user_id AS guest_id, craft_type,
              started_at, updated_at
       FROM experience_sessions
       WHERE venue_id = $1
         AND started_at > NOW() - INTERVAL '1 hour'
         AND (ended_at IS NULL OR ended_at > NOW() - INTERVAL '10 minutes')`,
      [venueId],
    );
    const sessions = getVenueSessions(venueId);
    for (const r of rows as Record<string, unknown>[]) {
      sessions.set(String(r.session_id), {
        sessionId:   String(r.session_id),
        venueId,
        guestId:     r.guest_id ? String(r.guest_id) : null,
        craftType:   r.craft_type ? String(r.craft_type) : null,
        startedAt:   new Date(r.started_at as string).getTime(),
        lastEventAt: new Date(r.updated_at as string).getTime(),
        swipeCount:  0,
        addCount:    0,
        phase:       "active",
      });
    }
  } catch (err) {
    logger.warn({ err, venueId }, "activeSessions: load failed");
  }
}

export async function summarizeSessions(venueId: string): Promise<ActiveSessionSummary> {
  const sessions   = [...getVenueSessions(venueId).values()];
  const now        = Date.now();
  const active     = sessions.filter(s => now - s.lastEventAt < IDLE_THRESHOLD_MS);

  const byPhase: Record<string, number> = {};
  const byCraft: Record<string, number> = {};
  let totalDurationMs = 0;
  let oldestMs = 0;

  for (const s of active) {
    byPhase[s.phase] = (byPhase[s.phase] ?? 0) + 1;
    const craft = s.craftType ?? "unknown";
    byCraft[craft] = (byCraft[craft] ?? 0) + 1;
    const age = now - s.startedAt;
    totalDurationMs += age;
    if (age > oldestMs) oldestMs = age;
  }

  const summary: ActiveSessionSummary = {
    venueId, ts: now,
    totalActive: active.length,
    byPhase, byCraft,
    avgDuration: active.length > 0 ? Math.round(totalDurationMs / active.length / 60_000) : 0,
    oldestAge:   Math.round(oldestMs / 60_000),
  };

  await publish("telemetry", { event:"ACTIVE_SESSIONS", ...summary });

  return summary;
}
