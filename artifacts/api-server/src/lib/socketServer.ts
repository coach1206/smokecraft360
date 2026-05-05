/**
 * socketServer.ts — Socket.io server singleton.
 *
 * Attach once to the HTTP server in index.ts, then call getIO() anywhere in
 * the application to emit events. The Socket.io path is scoped to
 * `/api/socket.io` so it routes correctly through Replit's shared reverse
 * proxy (which forwards all `/api/*` traffic to this service).
 *
 * Events emitted
 * ──────────────
 * pos_order  { orderType: string, items?: unknown[] }
 *   Broadcast whenever a new POS order arrives at POST /api/pos/order.
 *   LiveEngineController on every connected kiosk subscribes and re-ranks
 *   scene queues based on the new order type.
 */

import { Server, type Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import { logger } from "./logger";

let _io: Server | null = null;

export function initSocketServer(httpServer: HttpServer): Server {
  if (_io) return _io;

  _io = new Server(httpServer, {
    path: "/api/socket.io",
    cors: {
      // Allow same-origin (proxied) and Replit preview domains
      origin: (origin, cb) => cb(null, true),
      credentials: true,
    },
    // Prefer WebSocket; fall back to polling for environments that block WS
    transports: ["websocket", "polling"],
  });

  _io.on("connection", (socket: Socket) => {
    logger.info({ socketId: socket.id }, "Kiosk client connected");

    // Confirm connection to the client immediately — LiveEngineController
    // uses this to know the socket is live and can stop the local simulator.
    socket.emit("connected", { ok: true, ts: Date.now() });

    socket.on("disconnect", (reason) => {
      logger.info({ socketId: socket.id, reason }, "Kiosk client disconnected");
    });
  });

  logger.info("Socket.io server initialised at path /api/socket.io");
  return _io;
}

export function getIO(): Server {
  if (!_io) throw new Error("Socket.io not yet initialised — call initSocketServer first");
  return _io;
}
