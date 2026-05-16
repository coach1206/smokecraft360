/**
 * heartbeatManager — Socket.IO heartbeat tracking and stale connection cleanup.
 *
 * Tracks the last heartbeat timestamp per socket. Stale sockets (no ping
 * within STALE_THRESHOLD_MS) are disconnected to free resources and prevent
 * ghost rooms.
 */

import type { Server, Socket } from "socket.io";
import { logger }              from "../../lib/logger";

const HEARTBEAT_INTERVAL_MS = 30_000;   // emit ping every 30s
const STALE_THRESHOLD_MS    = 90_000;   // disconnect after 90s without pong

interface HeartbeatEntry {
  socketId:  string;
  venueId?:  string;
  lastPong:  number;
  latencyMs: number;
}

const beats = new Map<string, HeartbeatEntry>();
let   interval: ReturnType<typeof setInterval> | null = null;

export function registerSocket(socket: Socket, venueId?: string): void {
  beats.set(socket.id, {
    socketId: socket.id,
    venueId,
    lastPong:  Date.now(),
    latencyMs: 0,
  });

  socket.on("pong_intelligence", (payload: { ts: number }) => {
    const entry = beats.get(socket.id);
    if (entry) {
      entry.lastPong  = Date.now();
      entry.latencyMs = Date.now() - (payload?.ts ?? Date.now());
    }
  });

  socket.on("disconnect", () => {
    beats.delete(socket.id);
    logger.info({ socketId: socket.id, venueId }, "heartbeatManager: socket disconnected");
  });
}

export function startHeartbeat(io: Server): void {
  if (interval) return;

  interval = setInterval(() => {
    const now   = Date.now();
    const stale: string[] = [];

    for (const [id, entry] of beats.entries()) {
      const socket = io.sockets.sockets.get(id);
      if (!socket) { beats.delete(id); continue; }

      if (now - entry.lastPong > STALE_THRESHOLD_MS) {
        stale.push(id);
        continue;
      }

      // Emit ping with server ts for RTT calculation
      socket.emit("ping_intelligence", { ts: now });
    }

    // Disconnect stale sockets
    for (const id of stale) {
      const socket = io.sockets.sockets.get(id);
      if (socket) {
        logger.warn({ socketId: id }, "heartbeatManager: disconnecting stale socket");
        socket.disconnect(true);
      }
      beats.delete(id);
    }

    if (stale.length > 0) {
      logger.info({ staleCount: stale.length }, "heartbeatManager: stale sockets cleaned");
    }
  }, HEARTBEAT_INTERVAL_MS);

  logger.info("heartbeatManager: started");
}

export function stopHeartbeat(): void {
  if (interval) { clearInterval(interval); interval = null; }
}

export function getConnectedCount(venueId?: string): number {
  if (!venueId) return beats.size;
  return [...beats.values()].filter(b => b.venueId === venueId).length;
}

export function getAvgLatency(venueId?: string): number {
  const entries = venueId
    ? [...beats.values()].filter(b => b.venueId === venueId)
    : [...beats.values()];
  if (entries.length === 0) return 0;
  return entries.reduce((s, e) => s + e.latencyMs, 0) / entries.length;
}

export function isSocketStale(socketId: string): boolean {
  const entry = beats.get(socketId);
  if (!entry) return true;
  return Date.now() - entry.lastPong > STALE_THRESHOLD_MS;
}
