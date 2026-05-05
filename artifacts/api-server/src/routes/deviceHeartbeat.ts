import { Router, type IRouter, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { z } from "zod";
import { db, devicesTable, offlineQueueTable } from "@workspace/db";
import { and, eq, desc, lte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { logAudit } from "../lib/audit";
import { logger } from "../lib/logger";
import rateLimit from "express-rate-limit";

const router: IRouter = Router();

const heartbeatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
  message: { error: "Too many heartbeats — please slow down" },
});

const heartbeatSchema = z.object({
  deviceId: z.string().uuid(),
  venueId: z.string().uuid(),
  version: z.string().min(1).max(50),
  status: z.enum(["ACTIVE", "IDLE"]),
  ndaSigned: z.boolean().optional(),
  sessionId: z.string().max(200).optional(),
});

const deviceRefreshSet = new Set<string>();

router.post(
  "/heartbeat",
  heartbeatLimiter,
  async (req, res: Response) => {
    const parsed = heartbeatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid heartbeat payload", issues: parsed.error.issues });
      return;
    }

    const { deviceId, venueId, version, status, ndaSigned, sessionId } = parsed.data;

    try {
      const [device] = await db
        .select({ id: devicesTable.id, venueId: devicesTable.venueId })
        .from(devicesTable)
        .where(
          and(
            eq(devicesTable.id, deviceId),
            eq(devicesTable.venueId, venueId),
          ),
        )
        .limit(1);

      if (!device) {
        res.status(404).json({ error: "Device not registered or venue mismatch" });
        return;
      }

      await db
        .update(devicesTable)
        .set({
          lastActiveAt: new Date(),
          status: status === "ACTIVE" ? "active" : "inactive",
          nickname: `v${version}`,
          updatedAt: new Date(),
        })
        .where(eq(devicesTable.id, deviceId));

      const shouldRefresh = deviceRefreshSet.has(deviceId);
      if (shouldRefresh) {
        deviceRefreshSet.delete(deviceId);
      }

      logger.debug(
        { deviceId, venueId, version, status, ndaSigned, sessionId, event: "device_heartbeat" },
        "device heartbeat received",
      );

      res.json({
        ack: true,
        forceRefresh: shouldRefresh,
        serverTime: new Date().toISOString(),
      });
    } catch (err) {
      logger.error({ err, deviceId }, "heartbeat processing failed");
      res.status(500).json({ error: "Internal error" });
    }
  },
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get(
  "/devices",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    try {
      const role = req.user!.role;
      const venueId = req.user!.venueId;

      let devices;
      if (role === "super_admin") {
        devices = await db
          .select()
          .from(devicesTable)
          .orderBy(desc(devicesTable.lastActiveAt));
      } else {
        if (!venueId) {
          res.status(403).json({ error: "No venue context" });
          return;
        }
        devices = await db
          .select()
          .from(devicesTable)
          .where(eq(devicesTable.venueId, venueId))
          .orderBy(desc(devicesTable.lastActiveAt));
      }

      res.json({
        devices: devices.map((d) => ({
          id: d.id,
          venueId: d.venueId,
          type: d.type,
          nickname: d.nickname,
          status: d.status,
          lastActiveAt: d.lastActiveAt,
          tableNumber: d.tableNumber,
          createdAt: d.createdAt,
          pendingRefresh: deviceRefreshSet.has(d.id),
        })),
        total: devices.length,
      });
    } catch (err) {
      logger.error({ err }, "admin device list failed");
      res.status(500).json({ error: "Internal error" });
    }
  },
);

router.post(
  "/device/:deviceId/refresh",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const deviceId = String(req.params.deviceId ?? "");
    if (!UUID_RE.test(deviceId)) {
      res.status(400).json({ error: "Invalid device ID" });
      return;
    }

    const [device] = await db
      .select({ id: devicesTable.id })
      .from(devicesTable)
      .where(eq(devicesTable.id, deviceId))
      .limit(1);

    if (!device) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    deviceRefreshSet.add(deviceId);

    await logAudit(req, {
      action: "device.force_refresh",
      entityType: "device",
      entityId: deviceId,
      after: { forceRefresh: true } as unknown as Record<string, unknown>,
    });

    req.log.info({ deviceId, triggeredBy: req.user!.id }, "device force refresh queued");

    res.json({ deviceId, forceRefresh: true, message: "Device will refresh on next heartbeat" });
  },
);

// ── Offline sweep — runs every 30 s, marks devices offline after 90 s of silence ──

async function offlineSweep() {
  const cutoff = new Date(Date.now() - 90_000);
  try {
    const stale = await db
      .select({ id: devicesTable.id, venueId: devicesTable.venueId })
      .from(devicesTable)
      .where(and(
        lte(devicesTable.lastActiveAt, cutoff),
        eq(devicesTable.status, "active"),
      ));

    if (stale.length === 0) return;

    await db
      .update(devicesTable)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(and(
        lte(devicesTable.lastActiveAt, cutoff),
        eq(devicesTable.status, "active"),
      ));

    // Enqueue a reconnect action for each stale device
    for (const d of stale) {
      try {
        await db.insert(offlineQueueTable).values({
          idempotencyKey:  `offline_sweep_${d.id}_${cutoff.getTime()}`,
          deviceId:        d.id,
          venueId:         d.venueId ?? undefined,
          kind:            "reconnect",
          payload:         { deviceId: d.id, action: "reconnect", reason: "missed_heartbeat", cutoff: cutoff.toISOString() },
          status:          "pending",
          clientCreatedAt: new Date(),
        }).onConflictDoNothing();
      } catch { /* non-fatal */ }
    }

    logger.info({ sweptCount: stale.length }, "offline sweep: marked devices inactive");
  } catch (err) {
    logger.error({ err }, "offline sweep failed");
  }
}

// Start the sweep loop when the module is loaded (every 60s; marks offline after 90s of silence)
setInterval(offlineSweep, 60_000);

export default router;
