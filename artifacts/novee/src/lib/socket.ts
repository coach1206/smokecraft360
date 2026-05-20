/**
 * socket.ts — Singleton Socket.io client for NOVEE OS.
 *
 * Mirrors the SmokeCraft socket singleton. Connects to the shared API server
 * via the Replit reverse proxy. Path `/api/socket.io` routes to the same
 * Socket.io server instance regardless of which artifact is connecting.
 */

import { io } from "socket.io-client";

export const socket = io({
  path:       "/api/socket.io",
  transports: ["websocket", "polling"],
  reconnection:         true,
  reconnectionAttempts: Infinity,
  reconnectionDelay:    1_000,
  reconnectionDelayMax: 10_000,
});

if (import.meta.env.DEV) {
  socket.on("connect",     ()  => console.debug("[NOVEE Socket] connected:", socket.id));
  socket.on("disconnect",  (r) => console.debug("[NOVEE Socket] disconnected:", r));
  socket.on("connect_error", (e) => console.debug("[NOVEE Socket] error:", e.message));
}
