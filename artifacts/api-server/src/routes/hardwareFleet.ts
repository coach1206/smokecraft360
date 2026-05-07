/**
 * Hardware Fleet API
 *
 * GET    /api/hardware-fleet                  List fleet (manager+, venue-scoped)
 * GET    /api/hardware-fleet/:deviceId        Single device (staff+)
 * POST   /api/hardware-fleet                  Register device (super_admin)
 * PATCH  /api/hardware-fleet/:deviceId/heartbeat  Liveness ping (staff+)
 * PATCH  /api/hardware-fleet/:deviceId        Update config (manager+)
 *
 * GET    /api/hardware-fleet/:deviceId/claims   Active session claims (manager+)
 * POST   /api/hardware-fleet/claims             Create session claim (staff+)
 * DELETE /api/hardware-fleet/claims/:claimId    Volatile wipe / close claim (staff+)
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, isNull, desc }               from "drizzle-orm";
import { z }                                   from "zod";
import {
  db,
  hardwareFleetTable,
  hardwareSessionClaimsTable,
  FLEET_DEVICE_TYPES,
  FLEET_NETWORK_STATUSES,
  HANDOFF_PROTOCOLS,
}                                              from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";

const router: IRouter = Router();

const staffUp   = [requireAuth, requireRole("staff",   "manager", "venue_owner", "super_admin")];
const managerUp = [requireAuth, requireRole("manager", "venue_owner", "super_admin")];
const superOnly = [requireAuth, requireRole("super_admin")];

function venueScope(req: AuthRequest): string | null {
  return req.user!.role === "super_admin"
    ? (typeof req.query["venueId"] === "string" ? req.query["venueId"] : null)
    : (req.user!.venueId ?? null);
}

// ── GET / ─────────────────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  networkStatus: z.enum(FLEET_NETWORK_STATUSES as unknown as [string, ...string[]]).optional(),
  deviceType:    z.enum(FLEET_DEVICE_TYPES    as unknown as [string, ...string[]]).optional(),
  limit:         z.coerce.number().int().min(1).max(200).default(50),
  offset:        z.coerce.number().int().min(0).default(0),
});

router.get("/", ...managerUp, async (req: AuthRequest, res: Response) => {
  const q = listQuerySchema.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: "Invalid query", details: q.error.flatten() }); return; }

  const { networkStatus, deviceType, limit, offset } = q.data;
  const venueId = venueScope(req);

  const conditions = [];
  if (venueId)       conditions.push(eq(hardwareFleetTable.venueId, venueId));
  if (networkStatus) conditions.push(eq(hardwareFleetTable.networkStatus, networkStatus as typeof FLEET_NETWORK_STATUSES[number]));
  if (deviceType)    conditions.push(eq(hardwareFleetTable.deviceType,    deviceType    as typeof FLEET_DEVICE_TYPES[number]));

  const rows = await db
    .select()
    .from(hardwareFleetTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(hardwareFleetTable.lastHeartbeat))
    .limit(limit)
    .offset(offset);

  res.json({ total: rows.length, limit, offset, devices: rows });
});

// ── GET /:deviceId ────────────────────────────────────────────────────────────

router.get("/:deviceId", ...staffUp, async (req: AuthRequest, res: Response) => {
  const deviceId = String(req.params.deviceId ?? "");
  const [row] = await db
    .select()
    .from(hardwareFleetTable)
    .where(eq(hardwareFleetTable.deviceId, deviceId));

  if (!row) { res.status(404).json({ error: "Device not found" }); return; }
  if (req.user!.role !== "super_admin" && row.venueId !== req.user!.venueId) {
    res.status(403).json({ error: "Access denied" }); return;
  }
  res.json(row);
});

// ── POST / — register ─────────────────────────────────────────────────────────

const registerSchema = z.object({
  venueId:                 z.string().uuid().optional(),
  serialNumber:            z.string().max(100).optional(),
  deviceType:              z.enum(FLEET_DEVICE_TYPES as unknown as [string, ...string[]]).optional(),
  firmwareVersion:         z.string().max(20).optional(),
  thermalThresholdCelsius: z.number().int().min(40).max(120).default(75),
  pixelShiftActive:        z.boolean().default(true),
});

router.post("/", ...superOnly, async (req: AuthRequest, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() }); return; }

  const [row] = await db
    .insert(hardwareFleetTable)
    .values({
      ...parsed.data,
      deviceType:   parsed.data.deviceType   as typeof FLEET_DEVICE_TYPES[number] | undefined,
      networkStatus: "ONLINE",
    })
    .returning();

  res.status(201).json({ message: "Device registered", device: row });
});

// ── PATCH /:deviceId/heartbeat ────────────────────────────────────────────────

const heartbeatSchema = z.object({
  firmwareVersion: z.string().max(20).optional(),
  networkStatus:   z.enum(FLEET_NETWORK_STATUSES as unknown as [string, ...string[]]).optional(),
  thermalCelsius:  z.number().int().optional(),   // current reading (informational, not stored)
});

router.patch("/:deviceId/heartbeat", ...staffUp, async (req: AuthRequest, res: Response) => {
  const deviceId = String(req.params.deviceId ?? "");
  const parsed = heartbeatSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() }); return; }

  const set: Record<string, unknown> = { lastHeartbeat: new Date(), updatedAt: new Date() };
  if (parsed.data.firmwareVersion) set["firmwareVersion"] = parsed.data.firmwareVersion;
  if (parsed.data.networkStatus)   set["networkStatus"]   = parsed.data.networkStatus;

  const [row] = await db
    .update(hardwareFleetTable)
    .set(set)
    .where(eq(hardwareFleetTable.deviceId, deviceId))
    .returning({ deviceId: hardwareFleetTable.deviceId, lastHeartbeat: hardwareFleetTable.lastHeartbeat, networkStatus: hardwareFleetTable.networkStatus });

  if (!row) { res.status(404).json({ error: "Device not found" }); return; }
  res.json({ message: "Heartbeat recorded", ...row });
});

// ── PATCH /:deviceId — config update ─────────────────────────────────────────

const updateSchema = z.object({
  firmwareVersion:         z.string().max(20).optional(),
  thermalThresholdCelsius: z.number().int().min(40).max(120).optional(),
  pixelShiftActive:        z.boolean().optional(),
  networkStatus:           z.enum(FLEET_NETWORK_STATUSES as unknown as [string, ...string[]]).optional(),
}).refine(d => Object.values(d).some(v => v !== undefined), { message: "At least one field required" });

router.patch("/:deviceId", ...managerUp, async (req: AuthRequest, res: Response) => {
  const deviceId = String(req.params.deviceId ?? "");
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() }); return; }

  const set: Record<string, unknown> = { updatedAt: new Date() };
  const { firmwareVersion, thermalThresholdCelsius, pixelShiftActive, networkStatus } = parsed.data;
  if (firmwareVersion         !== undefined) set["firmwareVersion"]         = firmwareVersion;
  if (thermalThresholdCelsius !== undefined) set["thermalThresholdCelsius"] = thermalThresholdCelsius;
  if (pixelShiftActive        !== undefined) set["pixelShiftActive"]        = pixelShiftActive;
  if (networkStatus           !== undefined) set["networkStatus"]           = networkStatus;

  const [row] = await db
    .update(hardwareFleetTable)
    .set(set)
    .where(eq(hardwareFleetTable.deviceId, deviceId))
    .returning();

  if (!row) { res.status(404).json({ error: "Device not found" }); return; }
  res.json({ message: "Device updated", device: row });
});

// ── GET /:deviceId/claims — active session claims ────────────────────────────

router.get("/:deviceId/claims", ...managerUp, async (req: AuthRequest, res: Response) => {
  const deviceId = String(req.params.deviceId ?? "");
  const claims = await db
    .select()
    .from(hardwareSessionClaimsTable)
    .where(
      and(
        eq(hardwareSessionClaimsTable.deviceId, deviceId),
        isNull(hardwareSessionClaimsTable.sessionEnd),
      ),
    )
    .orderBy(desc(hardwareSessionClaimsTable.sessionStart));

  res.json({ deviceId, activeClaims: claims.length, claims });
});

// ── POST /claims — create session claim ──────────────────────────────────────

const claimSchema = z.object({
  claimId:         z.string().uuid(),
  deviceId:        z.string().uuid(),
  guestIdentityId: z.string().uuid().optional(),
  handoffProtocol: z.enum(HANDOFF_PROTOCOLS as unknown as [string, ...string[]]),
  isVolatile:      z.boolean().default(true),
});

router.post("/claims", ...staffUp, async (req: AuthRequest, res: Response) => {
  const parsed = claimSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() }); return; }

  const [row] = await db
    .insert(hardwareSessionClaimsTable)
    .values({
      claimId:         parsed.data.claimId,
      deviceId:        parsed.data.deviceId,
      guestIdentityId: parsed.data.guestIdentityId ?? null,
      handoffProtocol: parsed.data.handoffProtocol as typeof HANDOFF_PROTOCOLS[number],
      isVolatile:      parsed.data.isVolatile,
    })
    .onConflictDoNothing()
    .returning();

  if (!row) { res.status(409).json({ error: "Claim ID already exists — idempotent no-op" }); return; }
  res.status(201).json({ message: "Session claim created", claim: row });
});

// ── DELETE /claims/:claimId — volatile wipe / close ──────────────────────────

router.delete("/claims/:claimId", ...staffUp, async (req: AuthRequest, res: Response) => {
  const now     = new Date();
  const claimId = String(req.params.claimId ?? "");

  const [row] = await db
    .update(hardwareSessionClaimsTable)
    .set({ sessionEnd: now, wipedAt: now })
    .where(
      and(
        eq(hardwareSessionClaimsTable.claimId, claimId),
        isNull(hardwareSessionClaimsTable.sessionEnd),
      ),
    )
    .returning({ claimId: hardwareSessionClaimsTable.claimId, isVolatile: hardwareSessionClaimsTable.isVolatile });

  if (!row) { res.status(404).json({ error: "Claim not found or already closed" }); return; }
  res.json({
    message:   row.isVolatile ? "Session closed — volatile wipe recorded" : "Session closed",
    claimId:   row.claimId,
    isVolatile: row.isVolatile,
    closedAt:  now.toISOString(),
  });
});

export default router;
