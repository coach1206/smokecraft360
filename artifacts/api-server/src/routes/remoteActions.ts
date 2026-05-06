/**
 * /api/remote-actions — Remote Device Control
 *
 * Extends the existing device + heartbeat infrastructure with a richer set
 * of remote commands. Commands are queued in offlineQueueTable so devices
 * pick them up on the next heartbeat. All writes are audit-logged.
 *
 *   GET  /api/remote-actions/queue/:deviceId   pending commands for a device
 *   POST /api/remote-actions/:deviceId         dispatch a remote action
 *   GET  /api/remote-actions/venue-summary     all device command statuses
 *
 * Supported action kinds:
 *   force_refresh   — reload app UI without closing session
 *   restart_app     — full app restart (clears state)
 *   lock_kiosk      — block guest interaction, show maintenance screen
 *   unlock_kiosk    — restore normal operation
 *   force_logout    — terminate active guest session
 *   maintenance_mode  — enable venue-level maintenance mode
 *   deploy_update   — instruct device to pull latest OTA version
 *   emergency_shutdown — halt all venue processes (super_admin only)
 *
 * Auth: manager+ for low-risk; venue_owner+ for medium; super_admin for high.
 */

import { Router, type IRouter, type Response } from "express";
import { z }                                   from "zod/v4";
import { db, devicesTable, offlineQueueTable } from "@workspace/db";
import { and, eq, desc }                       from "drizzle-orm";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";
import { logAudit }                            from "../lib/audit";
import { logger }                              from "../lib/logger";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Action definitions ─────────────────────────────────────────────────────

type ActionKind =
  | "force_refresh"
  | "restart_app"
  | "lock_kiosk"
  | "unlock_kiosk"
  | "force_logout"
  | "maintenance_mode"
  | "deploy_update"
  | "emergency_shutdown";

interface ActionDef {
  kind:        ActionKind;
  label:       string;
  description: string;
  risk:        "low" | "medium" | "high";
  minRole:     "manager" | "venue_owner" | "super_admin";
  reversible:  boolean;
}

export const REMOTE_ACTIONS: ActionDef[] = [
  {
    kind: "force_refresh",   label: "Force Refresh",
    description: "Reload the app UI without closing the guest session.",
    risk: "low", minRole: "manager", reversible: true,
  },
  {
    kind: "restart_app",     label: "Restart App",
    description: "Full app restart. Clears all in-memory state and active sessions.",
    risk: "medium", minRole: "manager", reversible: true,
  },
  {
    kind: "lock_kiosk",      label: "Lock Kiosk",
    description: "Block guest interaction and display a maintenance screen.",
    risk: "medium", minRole: "venue_owner", reversible: true,
  },
  {
    kind: "unlock_kiosk",    label: "Unlock Kiosk",
    description: "Restore normal kiosk operation after a lock.",
    risk: "low", minRole: "manager", reversible: false,
  },
  {
    kind: "force_logout",    label: "Force Logout",
    description: "Terminate the active guest session immediately.",
    risk: "medium", minRole: "manager", reversible: false,
  },
  {
    kind: "maintenance_mode", label: "Maintenance Mode",
    description: "Put the venue into maintenance — blocks all guest-facing flows.",
    risk: "high", minRole: "venue_owner", reversible: true,
  },
  {
    kind: "deploy_update",   label: "Deploy Update",
    description: "Instruct the device to pull and apply the latest OTA version.",
    risk: "medium", minRole: "venue_owner", reversible: false,
  },
  {
    kind: "emergency_shutdown", label: "Emergency Shutdown",
    description: "Halt all venue processes immediately. Requires super_admin.",
    risk: "high", minRole: "super_admin", reversible: false,
  },
];

const ROLE_RANK: Record<string, number> = {
  staff: 0, manager: 1, venue_owner: 2, super_admin: 3,
};

function canPerform(userRole: string, def: ActionDef): boolean {
  return (ROLE_RANK[userRole] ?? 0) >= (ROLE_RANK[def.minRole] ?? 99);
}

// ── Schema ─────────────────────────────────────────────────────────────────

const dispatchSchema = z.object({
  action: z.enum([
    "force_refresh", "restart_app", "lock_kiosk", "unlock_kiosk",
    "force_logout", "maintenance_mode", "deploy_update", "emergency_shutdown",
  ]),
  reason: z.string().max(200).optional(),
});

// ── GET /api/remote-actions/queue/:deviceId ───────────────────────────────

router.get(
  "/queue/:deviceId",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const deviceId = String(req.params["deviceId"] ?? "");
    if (!UUID_RE.test(deviceId)) {
      res.status(400).json({ error: "Invalid device ID" });
      return;
    }

    const [device] = await db
      .select({ id: devicesTable.id, venueId: devicesTable.venueId })
      .from(devicesTable)
      .where(eq(devicesTable.id, deviceId))
      .limit(1);

    if (!device) { res.status(404).json({ error: "Device not found" }); return; }

    if (req.user!.role !== "super_admin" && device.venueId !== req.user!.venueId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const pending = await db
      .select()
      .from(offlineQueueTable)
      .where(and(
        eq(offlineQueueTable.deviceId, deviceId),
        eq(offlineQueueTable.status, "pending"),
      ))
      .orderBy(desc(offlineQueueTable.clientCreatedAt))
      .limit(20);

    res.json({ deviceId, pending });
  },
);

// ── POST /api/remote-actions/:deviceId ────────────────────────────────────

router.post(
  "/:deviceId",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const deviceId = String(req.params["deviceId"] ?? "");
    if (!UUID_RE.test(deviceId)) {
      res.status(400).json({ error: "Invalid device ID" });
      return;
    }

    const parsed = dispatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
      return;
    }

    const { action, reason } = parsed.data;
    const def = REMOTE_ACTIONS.find(a => a.kind === action)!;

    // Permission check against action's minimum role
    if (!canPerform(req.user!.role, def)) {
      res.status(403).json({
        error: `Action "${action}" requires ${def.minRole} or higher`,
      });
      return;
    }

    // Load and validate device
    const [device] = await db
      .select()
      .from(devicesTable)
      .where(eq(devicesTable.id, deviceId))
      .limit(1);

    if (!device) { res.status(404).json({ error: "Device not found" }); return; }

    if (req.user!.role !== "super_admin" && device.venueId !== req.user!.venueId) {
      res.status(403).json({ error: "Access denied — device is in another venue" });
      return;
    }

    const now = new Date();

    await db.insert(offlineQueueTable).values({
      idempotencyKey:  `remote_${action}_${deviceId}_${now.getTime()}`,
      deviceId,
      venueId:         device.venueId ?? undefined,
      kind:            action,
      payload:         {
        action,
        reason: reason ?? null,
        triggeredBy: req.user!.id,
        triggeredByRole: req.user!.role,
        triggeredAt: now.toISOString(),
        deviceType: device.type,
        risk: def.risk,
      },
      status:          "pending",
      clientCreatedAt: now,
    }).onConflictDoNothing();

    await logAudit(req, {
      action:     `device.remote.${action}`,
      entityType: "device",
      entityId:   deviceId,
      after:      { action, reason: reason ?? null, deviceType: device.type },
      venueId:    device.venueId ?? null,
    });

    logger.info(
      { deviceId, action, triggeredBy: req.user!.id, risk: def.risk },
      "remote action queued",
    );

    res.status(202).json({
      deviceId,
      action,
      label:       def.label,
      risk:        def.risk,
      queuedAt:    now.toISOString(),
      message:     `${def.label} queued — device will execute on next heartbeat`,
    });
  },
);

// ── GET /api/remote-actions/venue-summary ────────────────────────────────

router.get(
  "/venue-summary",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const isSuper = req.user!.role === "super_admin";
    const venueId = req.user!.venueId;

    const devices = isSuper
      ? await db.select().from(devicesTable)
      : venueId
        ? await db.select().from(devicesTable).where(eq(devicesTable.venueId, venueId))
        : [];

    const summary = await Promise.all(
      devices.map(async d => {
        const pending = await db
          .select({ kind: offlineQueueTable.kind })
          .from(offlineQueueTable)
          .where(and(
            eq(offlineQueueTable.deviceId, d.id),
            eq(offlineQueueTable.status, "pending"),
          ))
          .limit(5);

        return {
          id:              d.id,
          venueId:         d.venueId,
          type:            d.type,
          nickname:        d.nickname,
          status:          d.status,
          lastActiveAt:    d.lastActiveAt,
          pendingActions:  pending.map(p => p.kind),
          availableActions: REMOTE_ACTIONS
            .filter(a => canPerform(req.user!.role, a))
            .map(a => ({ kind: a.kind, label: a.label, risk: a.risk })),
        };
      }),
    );

    res.json({
      devices:     summary,
      actionCatalog: REMOTE_ACTIONS.map(a => ({
        kind: a.kind, label: a.label, description: a.description,
        risk: a.risk, minRole: a.minRole, reversible: a.reversible,
      })),
    });
  },
);

export default router;
