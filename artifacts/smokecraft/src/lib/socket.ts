/**
 * socket.ts — Singleton Socket.io client for the SmokeCraft kiosk.
 *
 * Connects to the API server via the shared Replit reverse proxy.
 * The path `/api/socket.io` matches the server-side Socket.io mount so
 * all WebSocket traffic is correctly routed without needing to know the
 * server's raw port.
 *
 * Import `socket` wherever you need to emit or subscribe to real-time events.
 * The connection is established once on module load and reused across the app.
 */

import { io } from "socket.io-client";

export const socket = io({
  // Empty string = same origin (goes through Replit's shared proxy)
  path:       "/api/socket.io",
  transports: ["websocket", "polling"],
  // Reconnect aggressively — kiosks run 24/7 and WiFi can blip
  reconnection:        true,
  reconnectionAttempts: Infinity,
  reconnectionDelay:   1_000,
  reconnectionDelayMax: 10_000,
});

if (import.meta.env.DEV) {
  socket.on("connect",    ()    => console.debug("[Socket] connected:", socket.id));
  socket.on("disconnect", (r)   => console.debug("[Socket] disconnected:", r));
  socket.on("connect_error", (e) => console.debug("[Socket] error:", e.message));
}
