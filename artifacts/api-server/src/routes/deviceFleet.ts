/**
 * Device Fleet Heartbeat — hardware health telemetry relay.
 *
 * POST /api/devices/heartbeat  — client terminal publishes pulse every 60 s
 * GET  /api/devices/fleet      — Command Hub polls live fleet node status
 */

import { Router } from "express";

const router = Router();

interface HeartbeatRecord {
  deviceId: string;
  batteryPct: number | null;
  networkLatencyMs: number;
  retryQueueDepth: number;
  userAgent: string;
  venueId: string;
  lastSeen: Date;
}

const fleet = new Map<string, HeartbeatRecord>();

// ── POST /api/devices/heartbeat ───────────────────────────────────────────────
router.post("/devices/heartbeat", (req, res) => {
  const {
    deviceId, batteryPct, networkLatencyMs, retryQueueDepth, venueId,
  } = req.body as {
    deviceId?: string; batteryPct?: number | null;
    networkLatencyMs?: number; retryQueueDepth?: number; venueId?: string;
  };

  if (!deviceId || typeof deviceId !== "string") {
    res.status(400).json({ ok: false, error: "deviceId required" }); return;
  }

  fleet.set(deviceId, {
    deviceId,
    batteryPct: typeof batteryPct === "number" ? batteryPct : null,
    networkLatencyMs: typeof networkLatencyMs === "number" ? networkLatencyMs : 0,
    retryQueueDepth: typeof retryQueueDepth === "number" ? retryQueueDepth : 0,
    userAgent: String(req.headers["user-agent"] ?? ""),
    venueId: venueId ?? "default",
    lastSeen: new Date(),
  });

  res.json({ ok: true, nodeCount: fleet.size });
});

// ── GET /api/devices/fleet ────────────────────────────────────────────────────
router.get("/devices/fleet", (_req, res) => {
  const now = Date.now();
  const nodes = Array.from(fleet.values()).map(h => {
    const ageMs  = now - h.lastSeen.getTime();
    const status = ageMs < 90_000 ? "online" : ageMs < 300_000 ? "stale" : "offline";
    return { ...h, status, ageSeconds: Math.floor(ageMs / 1000) };
  });

  const online = nodes.filter(n => n.status === "online").length;
  const avgLatency = nodes.length
    ? Math.round(nodes.reduce((s, n) => s + n.networkLatencyMs, 0) / nodes.length)
    : 0;

  res.json({
    totalNodes:       nodes.length,
    onlineNodes:      online,
    avgLatencyMs:     avgLatency,
    criticalAlerts:   nodes.filter(n => (n.batteryPct ?? 100) < 15 || n.retryQueueDepth > 5).length,
    nodes,
    fetchedAt:        new Date().toISOString(),
  });
});

export default router;
