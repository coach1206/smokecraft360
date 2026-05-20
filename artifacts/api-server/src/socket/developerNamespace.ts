/**
 * developerNamespace.ts — Socket.io /developer namespace for root-level
 * off-site access. Wired to the existing socket server via initDeveloperNamespace().
 *
 * Auth:   JWT with role "developer" or "super_admin" required on handshake.
 * Events emitted TO developer:  state_snapshot, memory_dump, active_sessions, error_log
 * Events FROM developer:        push_override, clear_memory, run_diagnostic, inject_state
 * Rate:   max 10 override commands per minute per connection.
 */

import type { Server, Namespace } from "socket.io";
import { verifyToken }            from "../lib/jwt";
import { logger }                 from "../lib/logger";
import { db, auditLogTable }      from "@workspace/db";

interface DevSocket {
  id:           string;
  data: {
    userId:      string;
    role:        string;
    commandsThisMinute: number;
    windowStart: number;
  };
}

const RATE_LIMIT = 10;

function resetWindowIfNeeded(s: DevSocket): void {
  const now = Date.now();
  if (now - s.data.windowStart > 60_000) {
    s.data.commandsThisMinute = 0;
    s.data.windowStart        = now;
  }
}

function underLimit(s: DevSocket): boolean {
  resetWindowIfNeeded(s);
  if (s.data.commandsThisMinute >= RATE_LIMIT) return false;
  s.data.commandsThisMinute++;
  return true;
}

async function writeAudit(
  actorId: string,
  actorRole: string,
  action: string,
  afterState: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(auditLogTable).values({
      actorId:    actorId || null,
      actorRole:  actorRole,
      action,
      entityType: "developer_remote",
      entityId:   actorId || "unknown",
      afterState,
    });
  } catch (err) {
    logger.warn({ err }, "developer namespace audit write failed");
  }
}

/** Attach the /developer namespace to the main Socket.io server instance. */
export function initDeveloperNamespace(io: Server): Namespace {
  const dev = io.of("/developer");

  // ── Auth middleware ────────────────────────────────────────────────────────
  dev.use(async (socket, next) => {
    const token =
      (socket.handshake.auth as { token?: string }).token ??
      (socket.handshake.headers["authorization"] ?? "").replace(/^Bearer\s+/i, "");

    if (!token) {
      next(new Error("Authentication required"));
      return;
    }
    try {
      const payload = await verifyToken(token);
      if (payload.role !== "developer" && payload.role !== "super_admin") {
        next(new Error("Insufficient role — developer or super_admin required"));
        return;
      }
      socket.data = {
        userId:             payload.sub,
        role:               payload.role,
        commandsThisMinute: 0,
        windowStart:        Date.now(),
      };
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  dev.on("connection", (socket) => {
    const s = socket as unknown as DevSocket;
    logger.info({ socketId: socket.id, userId: s.data.userId }, "Developer connected");

    // ── Send initial state snapshot ──────────────────────────────────────────
    socket.emit("state_snapshot", {
      ts:          Date.now(),
      socketId:    socket.id,
      activeSockets: io.of("/").sockets.size,
      devSockets:    dev.sockets.size,
    });

    // ── push_override — update a named state key on all kiosk clients ────────
    socket.on("push_override", async (payload: { key: string; value: unknown; targetVenueId?: string }) => {
      if (!underLimit(s)) {
        socket.emit("error_log", { error: "RATE_LIMIT_EXCEEDED", ts: Date.now() });
        return;
      }
      const event = { key: payload.key, value: payload.value, ts: Date.now(), sourceSocketId: socket.id };
      io.emit("dev_override", event);
      logger.info({ userId: s.data.userId, key: payload.key }, "Developer push_override broadcast");
      await writeAudit(s.data.userId, s.data.role, "dev_push_override", { key: payload.key, value: String(payload.value) });
      socket.emit("command_ack", { command: "push_override", ok: true, ts: Date.now() });
    });

    // ── clear_memory — triggers sessionStorage.clear on target terminal ──────
    socket.on("clear_memory", async (payload: { targetSocketId?: string }) => {
      if (!underLimit(s)) {
        socket.emit("error_log", { error: "RATE_LIMIT_EXCEEDED", ts: Date.now() });
        return;
      }
      if (payload.targetSocketId) {
        io.to(payload.targetSocketId).emit("dev_clear_memory", { ts: Date.now() });
        logger.info({ userId: s.data.userId, target: payload.targetSocketId }, "Developer clear_memory targeted");
      } else {
        io.emit("dev_clear_memory", { ts: Date.now() });
        logger.info({ userId: s.data.userId }, "Developer clear_memory broadcast");
      }
      await writeAudit(s.data.userId, s.data.role, "dev_clear_memory", { target: payload.targetSocketId ?? "all" });
      socket.emit("command_ack", { command: "clear_memory", ok: true, ts: Date.now() });
    });

    // ── run_diagnostic — returns system health metrics ────────────────────────
    socket.on("run_diagnostic", async () => {
      if (!underLimit(s)) {
        socket.emit("error_log", { error: "RATE_LIMIT_EXCEEDED", ts: Date.now() });
        return;
      }
      const metrics = {
        ts:             Date.now(),
        uptime:         process.uptime(),
        memoryUsedMb:   Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        activeSockets:  io.of("/").sockets.size,
        devSockets:     dev.sockets.size,
        nodeVersion:    process.version,
        env:            process.env["NODE_ENV"] ?? "unknown",
      };
      socket.emit("memory_dump", metrics);
      await writeAudit(s.data.userId, s.data.role, "dev_run_diagnostic", {});
    });

    // ── inject_state — push arbitrary state to a named guest session ─────────
    socket.on("inject_state", async (payload: { sessionId: string; state: Record<string, unknown> }) => {
      if (!underLimit(s)) {
        socket.emit("error_log", { error: "RATE_LIMIT_EXCEEDED", ts: Date.now() });
        return;
      }
      io.emit("dev_inject_state", { sessionId: payload.sessionId, state: payload.state, ts: Date.now() });
      logger.info({ userId: s.data.userId, sessionId: payload.sessionId }, "Developer inject_state");
      await writeAudit(s.data.userId, s.data.role, "dev_inject_state", { sessionId: payload.sessionId });
      socket.emit("command_ack", { command: "inject_state", ok: true, ts: Date.now() });
    });

    // ── active_sessions — request list of connected kiosks ───────────────────
    socket.on("get_active_sessions", () => {
      const sessions = Array.from(io.of("/").sockets.values()).map(ss => ({
        socketId: ss.id,
        rooms:    Array.from(ss.rooms),
      }));
      socket.emit("active_sessions", { sessions, ts: Date.now() });
    });

    socket.on("disconnect", (reason) => {
      logger.info({ socketId: socket.id, userId: s.data.userId, reason }, "Developer disconnected");
    });
  });

  logger.info("Developer socket namespace /developer initialised");
  return dev;
}
