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
import { pool }   from "@workspace/db";

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

    // ── SOVEREIGN_GLOBAL_DISRUPTION relay (5.2.0) ──────────────────────────
    // A super-admin kiosk emits this; the server fans it out to every other
    // connected device globally. Payload: { type, timestamp, origin, mode }.
    socket.on("SOVEREIGN_GLOBAL_DISRUPTION", (cmd: {
      type:      string;
      timestamp: number;
      origin:    string;
      mode:      string;
    }) => {
      logger.info({ socketId: socket.id, type: cmd.type, origin: cmd.origin }, "Sovereign global disruption relayed");
      socket.broadcast.emit("SOVEREIGN_GLOBAL_DISRUPTION", cmd);
    });

    // ── join_batch — device joins its batch room for wake targeting ─────────
    // Emitted by ActivationGate / SovereignDistro.registerNewNode() on connect.
    // After joining, SOVEREIGN_WAKE will be routed to all devices in that batch.
    socket.on("join_batch", ({ batchId }: { batchId: string | number }) => {
      const room = `batch:${batchId}`;
      socket.join(room);
      logger.info({ socketId: socket.id, batchId }, "Device joined batch room");
    });

    // ── NODE_PENDING_AUTHORIZATION — device cold-start handshake ────────────
    // Emitted by a manufacturer device on first boot (via SovereignDistro.registerNewNode).
    // Server persists the pending state and fans the signal to all admin watchers.
    socket.on("NODE_PENDING_AUTHORIZATION", async (payload: {
      deviceId:  string;
      batchId:   string | number;
      timestamp: number;
    }) => {
      logger.info({ socketId: socket.id, deviceId: payload.deviceId, batchId: payload.batchId }, "NODE_PENDING_AUTHORIZATION received");

      // Upsert the node as PENDING in the DB (idempotent)
      try {
        await pool.query(
          `INSERT INTO registered_nodes (serial_number, batch_id, status, ip_address)
           VALUES ($1, $2, 'PENDING', $3)
           ON CONFLICT (serial_number) DO UPDATE
           SET status = CASE WHEN registered_nodes.status = 'AUTHORIZED' THEN 'AUTHORIZED' ELSE 'PENDING' END,
               ip_address = EXCLUDED.ip_address`,
          [payload.deviceId, payload.batchId ?? null, socket.handshake.address ?? "socket"],
        );
      } catch (err) {
        logger.warn({ err }, "Failed to upsert pending node from socket event");
      }

      // Broadcast to admin-connected clients so the Live Nodes tab updates live
      socket.broadcast.emit("NODE_PENDING_UPDATE", {
        deviceId:  payload.deviceId,
        batchId:   payload.batchId,
        timestamp: payload.timestamp,
        socketId:  socket.id,
      });
    });

    // ── SOVEREIGN_WAKE_COMMAND — admin remote activation ────────────────────
    // Emitted by the Distribution Vault when a batch is authorized.
    // Validates the auth key, updates the DB, then relays SOVEREIGN_WAKE to
    // every device in the target batch room (or a specific device room).
    socket.on("SOVEREIGN_WAKE_COMMAND", async (cmd: {
      deviceId: string;
      batchId?: string | number;
      authKey:  string;
      action:   string;
      ts?:      number;
    }) => {
      // Validate the sovereign auth key
      if (cmd.authKey !== "MASTER_KEY_360") {
        logger.warn({ socketId: socket.id }, "SOVEREIGN_WAKE_COMMAND rejected — invalid authKey");
        return;
      }

      logger.info({ socketId: socket.id, deviceId: cmd.deviceId, batchId: cmd.batchId, action: cmd.action }, "SOVEREIGN_WAKE_COMMAND authorized");

      const wakePayload = { action: "MELT_LOCK", ts: Date.now() };

      if (cmd.batchId != null) {
        // Update all nodes in this batch to AUTHORIZED
        try {
          await pool.query(
            `UPDATE registered_nodes SET status = 'AUTHORIZED' WHERE batch_id = $1 AND status = 'PENDING'`,
            [cmd.batchId],
          );
        } catch (err) {
          logger.warn({ err }, "Failed to authorize nodes in batch via socket wake");
        }
        // Relay SOVEREIGN_WAKE to every device in the batch room
        _io!.to(`batch:${cmd.batchId}`).emit("SOVEREIGN_WAKE", wakePayload);
        logger.info({ batchId: cmd.batchId }, "SOVEREIGN_WAKE relayed to batch room");
      } else {
        // Fallback: relay to all sockets (individual device wake)
        socket.broadcast.emit("SOVEREIGN_WAKE", { ...wakePayload, deviceId: cmd.deviceId });
      }
    });

    // ── SOVEREIGN_REVOKE_SESSION — admin force-logout all devices ────────────
    // Emitted by the Distribution Vault "REVOKE ALL SESSIONS" button.
    // Validates MASTER_KEY_360, then broadcasts SOVEREIGN_SESSION_REVOKED to
    // every other connected client so they clear localStorage and go to gate.
    socket.on("SOVEREIGN_REVOKE_SESSION", (cmd: { authKey: string }) => {
      if (cmd?.authKey !== "MASTER_KEY_360") {
        logger.warn({ socketId: socket.id }, "SOVEREIGN_REVOKE_SESSION rejected — invalid authKey");
        return;
      }
      logger.info({ socketId: socket.id }, "Sovereign session revoke broadcast sent via socket");
      // Broadcast to all OTHER sockets (caller keeps their own session)
      socket.broadcast.emit("SOVEREIGN_SESSION_REVOKED", { ts: Date.now(), reason: "OPERATOR_REVOKE" });
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
