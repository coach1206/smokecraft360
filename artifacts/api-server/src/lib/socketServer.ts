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
 *
 * tournament_completed  { tournamentId: string, type: string, title: string, ts: number }
 *   Broadcast by tournamentWorker when a tournament is auto-closed.
 *   CompetitionModule uses this to reload the tournament list and show a toast.
 *
 * tournament_spawned  { tournamentId: string, type: string, title: string, endAt: string, ts: number }
 *   Broadcast by tournamentWorker when a replacement tournament is created.
 *   CompetitionModule uses this to reload and notify players of the new round.
 *
 * tournament_created  { tournamentId: string, type: string, title: string, endAt: string, venueId: string | null, ts: number }
 *   Broadcast by POST /api/competitions when a newly created tournament is immediately active.
 *   Delivered to `venue:<venueId>` room when venueId is set; broadcast globally for cross-venue tournaments.
 *   TouchscreenHome subscribes and shows a dismissible announcement banner to players.
 *
 * tournament_rank_changed  { userId: string, tournamentId: string, tournamentTitle: string, newRank: number, oldRank: number | null, ts: number }
 *   Broadcast by syncActiveTournamentScores whenever a craft-build score update
 *   changes a user's leaderboard position. CompetitionModule filters by userId
 *   and shows a non-blocking toast: "↑ Your rank in 'Weekly Craft League' moved to #2".
 *
 * Events received (client → server)
 * ──────────────────────────────────
 * join_venue  { venueId: string }
 *   Sent by kiosk clients on connect to join the venue-scoped room so they only
 *   receive tournament_created events for their own venue.
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

    // Allow clients to self-assign to a venue room for venue-scoped broadcasts.
    socket.on("join_venue", ({ venueId }: { venueId: string }) => {
      if (typeof venueId === "string" && venueId.length > 0) {
        socket.join(`venue:${venueId}`);
        logger.info({ socketId: socket.id, venueId }, "Kiosk joined venue room");
      }
    });

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
