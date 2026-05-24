import { Router, type Request, type Response } from "express";
import { getIO } from "../lib/socketServer";
import {
  developerLogBuffer,
  mutationLog,
  wsPingLog,
  shadowQueue,
  commandCenterMetrics,
  getMutationStats,
  getWsPingStats,
  pushTelemetry,
} from "../lib/eatCommandState";

// ══════════════════════════════════════════════════════════════════════════════
// DEVELOPER DASHBOARD TELEMETRY ROUTER
// Mounted at /api — all routes under /developer/
// ══════════════════════════════════════════════════════════════════════════════

export const eatTelemetryRouter = Router();

/**
 * GET /api/developer/telemetry-bus
 * Ring buffer of system telemetry packets, newest-first.
 * Query params:
 *   ?system=EAT_ENGINE|COMMAND_CENTER|DEV_DASHBOARD  (filter by subsystem)
 *   ?level=INFO|WARN|CRITICAL                        (filter by severity)
 *   ?limit=N                                         (max entries, capped at 100)
 */
eatTelemetryRouter.get("/developer/telemetry-bus", (req: Request, res: Response) => {
  const { system, level, limit } = req.query as Record<string, string | undefined>;

  let logs = developerLogBuffer as typeof developerLogBuffer;
  if (system) logs = logs.filter((l) => l.system === system.toUpperCase());
  if (level)  logs = logs.filter((l) => l.level  === level.toUpperCase());
  const cap = Math.min(Number(limit ?? 100), 100);
  logs = logs.slice(0, cap);

  return res.status(200).json({
    ok:          true,
    ts:          Date.now(),
    bufferDepth: developerLogBuffer.length,
    count:       logs.length,
    logs,
  });
});

/**
 * GET /api/developer/mutation-stats
 * Latency percentile stats (p50/p95/p99/max) over recent route mutations.
 * Query params: ?n=N (window size, max 200)
 */
eatTelemetryRouter.get("/developer/mutation-stats", (req: Request, res: Response) => {
  const n = Math.min(Number(req.query.n ?? 100), 200);
  const stats = getMutationStats(n);

  const total      = mutationLog.length;
  const invalidCt  = mutationLog.filter((m) => !m.payloadValid).length;
  const invalidPct = total ? Number(((invalidCt / total) * 100).toFixed(1)) : 0;

  return res.status(200).json({
    ok:           true,
    ts:           Date.now(),
    stats,
    invalidPayloads: { count: invalidCt, pct: invalidPct },
    recent:       mutationLog.slice(0, 10),
  });
});

/**
 * GET /api/developer/ws-ping-stats
 * RTT percentile stats across all tracked WebSocket ping-pong cycles.
 * Query params: ?n=N (window size, max 50)
 */
eatTelemetryRouter.get("/developer/ws-ping-stats", (req: Request, res: Response) => {
  const n = Math.min(Number(req.query.n ?? 50), 50);
  const stats = getWsPingStats(n);

  return res.status(200).json({
    ok:     true,
    ts:     Date.now(),
    stats,
    recent: wsPingLog.slice(0, 10),
  });
});

/**
 * GET /api/developer/payload-health
 * Aggregated payload validation status — debugging aid for touchscreen clients
 * sending malformed bodies during rapid-tap gestures.
 */
eatTelemetryRouter.get("/developer/payload-health", (_req: Request, res: Response) => {
  const total   = mutationLog.length;
  const invalid = mutationLog.filter((m) => !m.payloadValid).length;
  const valid   = total - invalid;

  return res.status(200).json({
    ok:          true,
    ts:          Date.now(),
    total,
    valid,
    invalid,
    validPct:    total ? Number(((valid / total) * 100).toFixed(1)) : 100,
    recentInvalid: mutationLog.filter((m) => !m.payloadValid).slice(0, 20),
  });
});

/**
 * POST /api/developer/ws-ping
 * Admin-triggered ping broadcast — emits PING to every connected Socket.IO node.
 * Nodes must respond with: socket.emit("PONG", { serverTs })
 * RTT is recorded in wsPingLog by the PONG handler in socketServer.ts.
 */
eatTelemetryRouter.post("/developer/ws-ping", (_req: Request, res: Response) => {
  const serverTs = Date.now();
  const io       = getIO();
  const nodeCount = io.sockets.sockets.size;

  io.emit("PING", { serverTs });

  pushTelemetry({
    timestamp: serverTs,
    system:    "DEV_DASHBOARD",
    level:     "INFO",
    message:   `Admin WS ping broadcast: ${nodeCount} node(s) targeted`,
    payload:   { nodeCount },
  });

  return res.status(200).json({ ok: true, serverTs, nodeCount });
});

/**
 * GET /api/developer/system-snapshot
 * Single-call full developer dashboard snapshot — minimises mobile round-trips.
 */
eatTelemetryRouter.get("/developer/system-snapshot", (_req: Request, res: Response) => {
  const io = getIO();

  return res.status(200).json({
    ok:            true,
    ts:            Date.now(),
    wsNodeCount:   io.sockets.sockets.size,
    metrics:       commandCenterMetrics,
    mutationStats: getMutationStats(100),
    wsPingStats:   getWsPingStats(50),
    payloadHealth: {
      total:     mutationLog.length,
      invalidPct: mutationLog.length
        ? Number(((mutationLog.filter((m) => !m.payloadValid).length / mutationLog.length) * 100).toFixed(1))
        : 0,
    },
    telemetry: {
      bufferDepth:  developerLogBuffer.length,
      recentLogs:   developerLogBuffer.slice(0, 5),
    },
    shadowQueue: {
      depth:   shadowQueue.length,
      pending: shadowQueue.filter((q) => q.status === "pending").length,
    },
  });
});
