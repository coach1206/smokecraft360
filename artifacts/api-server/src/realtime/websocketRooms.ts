/**
 * websocketRooms — intelligence & ops room registration layer.
 *
 * Called once from socketServer.ts after the Socket.IO server is created.
 * Adds intelligence-specific room events on top of the existing venue/batch
 * rooms. All events here bridge to the pgPubSub → Socket.IO pipeline.
 */

import type { Server, Socket } from "socket.io";
import { logger } from "../lib/logger";
import { pgPubSub } from "./pgPubSub";

export function registerIntelligenceRooms(io: Server): void {
  io.on("connection", (socket: Socket) => {
    // ── join_ops — Command Center / Novee OS dashboard joins ops room ────────
    // Receives: orchestration_event, ambient_update, twin_update, telemetry_update,
    //           cognition_update, intelligence_update, staff_notification
    socket.on("join_ops", ({ venueId }: { venueId: string }) => {
      if (typeof venueId !== "string" || !venueId) return;
      socket.join(`ops:${venueId}`);
      socket.emit("ops_joined", { venueId, ts: Date.now() });
      logger.info({ socketId: socket.id, venueId }, "Socket joined ops room");
    });

    // ── join_intelligence — analytics clients ────────────────────────────────
    socket.on("join_intelligence", ({ venueId }: { venueId: string }) => {
      if (typeof venueId !== "string" || !venueId) return;
      socket.join(`intelligence:${venueId}`);
      socket.emit("intelligence_joined", { venueId, ts: Date.now() });
      logger.info({ socketId: socket.id, venueId }, "Socket joined intelligence room");
    });

    // ── heartbeat ────────────────────────────────────────────────────────────
    socket.on("heartbeat", ({ ts }: { ts?: number }) => {
      socket.emit("heartbeat_ack", { ts: ts ?? Date.now(), serverTs: Date.now() });
    });

    // ── ops_command — operator sends control commands ────────────────────────
    socket.on("ops_command", async (cmd: {
      venueId:  string;
      action:   string;
      payload?: Record<string, unknown>;
      authKey?: string;
    }) => {
      if (!cmd.venueId || !cmd.action) return;
      logger.info({ socketId: socket.id, action: cmd.action, venueId: cmd.venueId }, "ops_command received");

      // Relay to ops room (other dashboards see it)
      io.to(`ops:${cmd.venueId}`).emit("ops_command_relay", {
        action:  cmd.action,
        payload: cmd.payload,
        ts:      Date.now(),
      });

      // Bridge to orchestration channel for backend consumers
      await pgPubSub.publish("orchestration", {
        event:   "OPS_COMMAND",
        venueId: cmd.venueId,
        action:  cmd.action,
        payload: cmd.payload ?? {},
      }).catch(() => {});
    });

    // ── request_twin — client requests the current twin state ────────────────
    socket.on("request_twin", async ({ venueId }: { venueId: string }) => {
      if (!venueId) return;
      await pgPubSub.publish("twin", {
        event:   "TWIN_REQUESTED",
        venueId,
        socketId: socket.id,
      }).catch(() => {});
    });
  });

  logger.info("websocketRooms: intelligence & ops rooms registered");
}
