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
import { assetInventory, commandCenterMetrics, pushTelemetry, recordPing } from "./eatCommandState";
import {
  registerDevice,
  unregisterDevice,
  recordDeviceMessage,
  annotateDevice,
  type DeviceType,
} from "./hardwareTelemetry";

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

    // ── Hardware lifecycle registration ──────────────────────────────────────
    // Type is initially UNKNOWN; client should emit DEVICE_ANNOUNCE to classify.
    registerDevice(socket.id, null, "UNKNOWN");

    // Per-message middleware — resets the idle clock for pocket-placement detection
    socket.use((_packet, next) => {
      recordDeviceMessage(socket.id);
      next();
    });

    // Confirm connection to the client immediately — LiveEngineController
    // uses this to know the socket is live and can stop the local simulator.
    socket.emit("connected", { ok: true, ts: Date.now() });

    // Push absolute system state to the client immediately on connect
    // so handheld terminals are fully synced without a round-trip request.
    socket.emit("EAT_INITIAL_STATE", {
      assets:  assetInventory,
      metrics: commandCenterMetrics,
    });

    pushTelemetry({
      timestamp: Date.now(),
      system:    "DEV_DASHBOARD",
      level:     "INFO",
      message:   "Handheld terminal runtime connection handshake established",
    });

    // ── DEVICE_ANNOUNCE — client self-identification ──────────────────────────
    // Sent by kiosks/tablets after connect to classify device type and persist
    // the deviceId for screen-toggle detection across reconnects.
    socket.on("DEVICE_ANNOUNCE", ({
      deviceId,
      deviceType,
    }: { deviceId: string; deviceType: DeviceType }) => {
      if (typeof deviceId === "string" && deviceId.length > 0) {
        annotateDevice(socket.id, deviceId, deviceType ?? "UNKNOWN");
        logger.info({ socketId: socket.id, deviceId, deviceType }, "Device announced");
      }
    });

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

    // ── SOVEREIGN_GLOBAL_COMMAND — primary remote activation channel ─────────
    // Matches the reference spec: authKey "MASTER_AUTHORITY_360", action "MELT_LOCK".
    // Relays SOVEREIGN_WAKE to the target device's batch room.
    socket.on("SOVEREIGN_GLOBAL_COMMAND", async (cmd: {
      targetId: string; action: string; authKey: string; batchId?: string | number; ts?: number;
    }) => {
      if (cmd?.authKey !== "MASTER_AUTHORITY_360") {
        logger.warn({ socketId: socket.id }, "SOVEREIGN_GLOBAL_COMMAND rejected — invalid authKey");
        return;
      }
      logger.info({ targetId: cmd.targetId, action: cmd.action }, "SOVEREIGN_GLOBAL_COMMAND received — relaying SOVEREIGN_WAKE");

      // Relay to specific batch room if provided, else broadcast globally
      const wakePayload = { action: cmd.action, targetId: cmd.targetId, ts: cmd.ts ?? Date.now() };
      if (cmd.batchId) {
        getIO().to(`batch:${cmd.batchId}`).emit("SOVEREIGN_WAKE", wakePayload);
      } else {
        socket.broadcast.emit("SOVEREIGN_WAKE", wakePayload);
      }

      // Persist activation to DB
      if (cmd.batchId) {
        try {
          await pool.query(
            `UPDATE registered_nodes SET status = 'AUTHORIZED' WHERE batch_id = $1`,
            [cmd.batchId],
          );
        } catch (err) {
          logger.error({ err }, "SOVEREIGN_GLOBAL_COMMAND: DB update failed");
        }
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

    // ── WS ping-pong RTT measurement ─────────────────────────────────────────
    // Client must respond: socket.emit("PONG", { serverTs })
    socket.on("PONG", ({ serverTs }: { serverTs: number }) => {
      const rttMs = Date.now() - serverTs;
      recordPing(socket.id, rttMs);
      logger.info({ socketId: socket.id, rttMs }, "WS ping RTT recorded");
    });

    socket.on("disconnect", (reason) => {
      logger.info({ socketId: socket.id, reason }, "Kiosk client disconnected");
      // unregisterDevice classifies the drop (pocket-placement vs normal lifecycle)
      // and internally emits the appropriate telemetry packet.
      unregisterDevice(socket.id, reason);
    });
  });

  logger.info("Socket.io server initialised at path /api/socket.io");
  return _io;
}

export function getIO(): Server {
  if (!_io) throw new Error("Socket.io not yet initialised — call initSocketServer first");
  return _io;
}
