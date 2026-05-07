/**
 * Hardware Registry API
 *
 * GET    /api/hardware-registry
 *   Query: ?venueId= &status= &deviceType= &limit= &offset=
 *   super_admin sees all; manager/venue_owner scoped to their venue.
 *   Roles: manager, venue_owner, super_admin
 *
 * GET    /api/hardware-registry/:deviceId
 *   Returns a single hardware registry entry.
 *   Roles: staff, manager, venue_owner, super_admin
 *
 * POST   /api/hardware-registry
 *   Registers a new device. device_id must be provided by caller.
 *   Body: { deviceId, venueId, deviceType, firmwareVersion, oledProtectionStatus? }
 *   Roles: super_admin
 *
 * PATCH  /api/hardware-registry/:deviceId/heartbeat
 *   Device self-reports liveness + current firmware version.
 *   Body: { firmwareVersion? }
 *   Updates last_heartbeat to now and optionally bumps firmware_version.
 *   Roles: staff, manager, venue_owner, super_admin
 *
 * PATCH  /api/hardware-registry/:deviceId
 *   Update status, firmware, or OLED protection flag.
 *   Body: { status?, firmwareVersion?, oledProtectionStatus? }
 *   Roles: manager, venue_owner, super_admin
 *
 * DELETE /api/hardware-registry/:deviceId
 *   Sets status = DECOMMISSIONED (soft delete — row is retained for audit).
 *   Roles: super_admin
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, inArray }                    from "drizzle-orm";
import { z }                                   from "zod";
import {
  db,
  hardwareRegistryTable,
  HARDWARE_DEVICE_TYPES,
  HARDWARE_STATUSES,
}                                              from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";

const router: IRouter = Router();

const staffUp   = [requireAuth, requireRole("staff",   "manager", "venue_owner", "super_admin")];
const managerUp = [requireAuth, requireRole("manager", "venue_owner", "super_admin")];
const superOnly = [requireAuth, requireRole("super_admin")];

// ── Helpers ────────────────────────────────────────────────────────────────────

function resolveVenueScope(req: AuthRequest): string | null {
  if (req.user!.role === "super_admin") {
    return typeof req.query["venueId"] === "string" ? req.query["venueId"] : null;
  }
  return req.user!.venueId ?? null;
}

// ── GET / ─────────────────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  venueId:    z.string().uuid().optional(),
  status:     z.enum(HARDWARE_STATUSES as unknown as [string, ...string[]]).optional(),
  deviceType: z.enum(HARDWARE_DEVICE_TYPES as unknown as [string, ...string[]]).optional(),
  limit:      z.coerce.number().int().min(1).max(200).default(50),
  offset:     z.coerce.number().int().min(0).default(0),
});

router.get(
  "/",
  ...managerUp,
  async (req: AuthRequest, res: Response) => {
    const q = listQuerySchema.safeParse(req.query);
    if (!q.success) {
      res.status(400).json({ error: "Invalid query", details: q.error.flatten() });
      return;
    }

    const { status, deviceType, limit, offset } = q.data;
    const venueId = resolveVenueScope(req);

    const conditions = [];
    if (venueId)    conditions.push(eq(hardwareRegistryTable.venueId, venueId));
    if (status)     conditions.push(eq(hardwareRegistryTable.status, status as typeof HARDWARE_STATUSES[number]));
    if (deviceType) conditions.push(eq(hardwareRegistryTable.deviceType, deviceType as typeof HARDWARE_DEVICE_TYPES[number]));

    const rows = await db
      .select()
      .from(hardwareRegistryTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset);

    res.json({ total: rows.length, limit, offset, devices: rows });
  },
);

// ── GET /:deviceId ────────────────────────────────────────────────────────────

router.get(
  "/:deviceId",
  ...staffUp,
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.deviceId ?? "").trim();
    const [row] = await db
      .select()
      .from(hardwareRegistryTable)
      .where(eq(hardwareRegistryTable.deviceId, id));

    if (!row) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    // Tenant guard for non-super_admin
    if (req.user!.role !== "super_admin" && row.venueId !== req.user!.venueId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    res.json(row);
  },
);

// ── POST / — register ─────────────────────────────────────────────────────────

const registerSchema = z.object({
  deviceId:            z.string().uuid(),
  venueId:             z.string().uuid().optional(),
  deviceType:          z.enum(HARDWARE_DEVICE_TYPES as unknown as [string, ...string[]]).optional(),
  firmwareVersion:     z.string().max(20).optional(),
  oledProtectionStatus: z.boolean().default(true),
});

router.post(
  "/",
  ...superOnly,
  async (req: AuthRequest, res: Response) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
      return;
    }

    const { deviceId, venueId, deviceType, firmwareVersion, oledProtectionStatus } = parsed.data;

    const [row] = await db
      .insert(hardwareRegistryTable)
      .values({
        deviceId,
        venueId:              venueId ?? null,
        deviceType:           deviceType as typeof HARDWARE_DEVICE_TYPES[number] | undefined,
        firmwareVersion:      firmwareVersion ?? null,
        oledProtectionStatus,
        status:               "ACTIVE",
      })
      .onConflictDoNothing()
      .returning();

    if (!row) {
      res.status(409).json({ error: "A device with this ID is already registered" });
      return;
    }

    res.status(201).json({ message: "Device registered", device: row });
  },
);

// ── PATCH /:deviceId/heartbeat ────────────────────────────────────────────────

const heartbeatSchema = z.object({
  firmwareVersion: z.string().max(20).optional(),
});

router.patch(
  "/:deviceId/heartbeat",
  ...staffUp,
  async (req: AuthRequest, res: Response) => {
    const id     = String(req.params.deviceId ?? "").trim();
    const parsed = heartbeatSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
      return;
    }

    const setFields: Record<string, unknown> = {
      lastHeartbeat: new Date(),
      updatedAt:     new Date(),
    };
    if (parsed.data.firmwareVersion) {
      setFields["firmwareVersion"] = parsed.data.firmwareVersion;
    }

    const [row] = await db
      .update(hardwareRegistryTable)
      .set(setFields)
      .where(eq(hardwareRegistryTable.deviceId, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    res.json({ message: "Heartbeat recorded", lastHeartbeat: row.lastHeartbeat });
  },
);

// ── PATCH /:deviceId — update ─────────────────────────────────────────────────

const updateSchema = z.object({
  status:               z.enum(HARDWARE_STATUSES as unknown as [string, ...string[]]).optional(),
  firmwareVersion:      z.string().max(20).optional(),
  oledProtectionStatus: z.boolean().optional(),
}).refine(d => Object.values(d).some(v => v !== undefined), {
  message: "At least one field must be provided",
});

router.patch(
  "/:deviceId",
  ...managerUp,
  async (req: AuthRequest, res: Response) => {
    const id     = String(req.params.deviceId ?? "").trim();
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
      return;
    }

    const setFields: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.status !== undefined)               setFields["status"]               = parsed.data.status;
    if (parsed.data.firmwareVersion !== undefined)      setFields["firmwareVersion"]      = parsed.data.firmwareVersion;
    if (parsed.data.oledProtectionStatus !== undefined) setFields["oledProtectionStatus"] = parsed.data.oledProtectionStatus;

    const [row] = await db
      .update(hardwareRegistryTable)
      .set(setFields)
      .where(eq(hardwareRegistryTable.deviceId, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Device not found" });
      return;
    }

    res.json({ message: "Device updated", device: row });
  },
);

// ── DELETE /:deviceId — soft decommission ─────────────────────────────────────

router.delete(
  "/:deviceId",
  ...superOnly,
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.deviceId ?? "").trim();

    const [row] = await db
      .update(hardwareRegistryTable)
      .set({ status: "DECOMMISSIONED", updatedAt: new Date() })
      .where(
        and(
          eq(hardwareRegistryTable.deviceId, id),
          // Prevent decommissioning something already gone
          inArray(hardwareRegistryTable.status, ["ACTIVE", "INACTIVE", "MAINTENANCE"]),
        ),
      )
      .returning({ deviceId: hardwareRegistryTable.deviceId });

    if (!row) {
      res.status(404).json({ error: "Device not found or already decommissioned" });
      return;
    }

    res.json({ message: "Device decommissioned", deviceId: row.deviceId });
  },
);

export default router;
