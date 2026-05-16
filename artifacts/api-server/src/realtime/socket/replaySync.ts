/**
 * replaySync — sends missed events to reconnecting sockets.
 *
 * When a socket reconnects it emits `replay_request` with a `since` timestamp.
 * replaySync pulls events from the orchestration_events log since that ts
 * and emits them in order on the socket's room.
 *
 * Prevents operational state gaps on reconnect without requiring full
 * page refresh or re-authentication.
 */

import { pool }   from "@workspace/db";
import { logger } from "../../lib/logger";
import type { Socket } from "socket.io";

export interface ReplayRequest {
  venueId: string;
  since:   number;   // Unix ms timestamp
  limit?:  number;
}

export interface ReplayResponse {
  events: ReplayedEvent[];
  count:  number;
  fromTs: number;
  toTs:   number;
}

export interface ReplayedEvent {
  id:        string;
  eventType: string;
  craftType: string | null;
  payload:   Record<string, unknown>;
  score:     number | null;
  ts:        number;
}

const MAX_REPLAY_LIMIT = 200;
const MAX_REPLAY_WINDOW_MS = 60 * 60 * 1000; // max 1h lookback

export function registerReplayHandler(socket: Socket): void {
  socket.on("replay_request", async (req: ReplayRequest) => {
    const { venueId, since, limit = 50 } = req;
    if (!venueId || !since) return;

    const safeSince = Math.max(since, Date.now() - MAX_REPLAY_WINDOW_MS);
    const safeLimit = Math.min(limit, MAX_REPLAY_LIMIT);

    try {
      const events = await fetchEventsSince(venueId, safeSince, safeLimit);
      const response: ReplayResponse = {
        events,
        count: events.length,
        fromTs: safeSince,
        toTs:   Date.now(),
      };

      socket.emit("replay_response", response);

      logger.info(
        { socketId: socket.id, venueId, count: events.length },
        "replaySync: replay delivered",
      );
    } catch (err) {
      logger.warn({ err, venueId, socketId: socket.id }, "replaySync: replay failed");
      socket.emit("replay_error", { error: "replay failed", venueId });
    }
  });
}

async function fetchEventsSince(
  venueId: string,
  sinceMs: number,
  limit:   number,
): Promise<ReplayedEvent[]> {
  const { rows } = await pool.query(
    `SELECT id, event_type, craft_type, payload, score, created_at
     FROM orchestration_events
     WHERE venue_id = $1
       AND created_at >= $2
     ORDER BY created_at ASC
     LIMIT $3`,
    [venueId, new Date(sinceMs).toISOString(), limit],
  );

  return rows.map((r: Record<string, unknown>) => ({
    id:        String(r.id),
    eventType: String(r.event_type),
    craftType: r.craft_type ? String(r.craft_type) : null,
    payload:   (r.payload ?? {}) as Record<string, unknown>,
    score:     r.score != null ? Number(r.score) : null,
    ts:        new Date(r.created_at as string).getTime(),
  }));
}

/** Build a replay snapshot for a venue room on initial join */
export async function sendInitialSnapshot(
  socket:  Socket,
  venueId: string,
): Promise<void> {
  try {
    const sinceMs = Date.now() - 10 * 60 * 1000; // last 10 minutes
    const events  = await fetchEventsSince(venueId, sinceMs, 30);
    if (events.length > 0) {
      socket.emit("replay_snapshot", { events, venueId, ts: Date.now() });
    }
  } catch (err) {
    logger.warn({ err, venueId }, "replaySync: initial snapshot failed");
  }
}
