/**
 * Device Management routes
 *
 * GET    /api/devices                — list venue devices (manager+)
 * POST   /api/devices                — register a device (manager+)
 * PATCH  /api/devices/:id            — update device (manager+)
 * DELETE /api/devices/:id            — remove device (manager+)
 * GET    /api/devices/:id/metrics    — usage stats for a device (manager+)
 * POST   /api/devices/:id/reset      — staff reset session (staff+)
 * POST   /api/devices/:id/session    — start / end a session (any auth)
 * GET    /api/devices/venue-qr/:vid  — SVG QR code for a venue (any auth)
 */

import { Router, type IRouter, type Response }    from "express";
import { eq, and, sql, desc, count, isNull }       from "drizzle-orm";
import {
  db,
  devicesTable,
  deviceSessionsTable,
  venuesTable,
  type DeviceType,
  type DeviceStatus,
  type ResetReason,
  DEVICE_TYPES,
  DEVICE_STATUSES,
}                                                  from "@workspace/db";
import { requireAuth, type AuthRequest }           from "../middleware/auth";
import { requireRole }                             from "../middleware/roles";
import { logger }                                  from "../lib/logger";
import { z }                                       from "zod";
import QRCode                                      from "qrcode";

const router: IRouter = Router();

// ── Zod schemas ────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  type:        z.enum(["mobile", "tablet", "kiosk"] as [DeviceType, ...DeviceType[]]),
  nickname:    z.string().min(1).max(60),
  tableNumber: z.string().max(20).optional(),
});

const updateSchema = z.object({
  nickname:    z.string().min(1).max(60).optional(),
  tableNumber: z.string().max(20).nullable().optional(),
  status:      z.enum(["active", "inactive"] as [DeviceStatus, ...DeviceStatus[]]).optional(),
});

const sessionSchema = z.object({
  action:      z.enum(["start", "end"]),
  userId:      z.string().uuid().optional(),
  orderPlaced: z.boolean().optional(),
  resetReason: z.enum(["inactivity", "order_complete", "staff_reset"]).optional(),
  tableNumber: z.string().max(20).optional(),
});

// ── GET /api/devices ───────────────────────────────────────────────────────────

router.get(
  "/",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user?.venueId;
    if (!venueId) { res.status(400).json({ error: "No venueId on token" }); return; }

    const rows = await db
      .select()
      .from(devicesTable)
      .where(eq(devicesTable.venueId, venueId))
      .orderBy(desc(devicesTable.createdAt));

    res.json(rows);
  },
);

// ── POST /api/devices ──────────────────────────────────────────────────────────

router.post(
  "/",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user?.venueId;
    if (!venueId) { res.status(400).json({ error: "No venueId on token" }); return; }

    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) { res.status(422).json({ error: parsed.error.flatten() }); return; }

    const [device] = await db.insert(devicesTable).values({
      venueId,
      type:        parsed.data.type,
      nickname:    parsed.data.nickname,
      tableNumber: parsed.data.tableNumber ?? null,
      status:      "active",
    }).returning();

    res.status(201).json(device);
  },
);

// ── PATCH /api/devices/:id ─────────────────────────────────────────────────────

router.patch(
  "/:id",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user?.venueId;
    if (!venueId) { res.status(400).json({ error: "No venueId on token" }); return; }

    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) { res.status(422).json({ error: parsed.error.flatten() }); return; }

    const existing = await db
      .select()
      .from(devicesTable)
      .where(and(eq(devicesTable.id, String(req.params.id ?? "")), eq(devicesTable.venueId, venueId)))
      .limit(1);

    if (!existing[0]) { res.status(404).json({ error: "Device not found" }); return; }

    const updates: Partial<typeof devicesTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (parsed.data.nickname    !== undefined) updates.nickname    = parsed.data.nickname;
    if (parsed.data.tableNumber !== undefined) updates.tableNumber = parsed.data.tableNumber;
    if (parsed.data.status      !== undefined) updates.status      = parsed.data.status;

    const [updated] = await db
      .update(devicesTable)
      .set(updates)
      .where(eq(devicesTable.id, String(req.params.id ?? "")))
      .returning();

    res.json(updated);
  },
);

// ── DELETE /api/devices/:id ────────────────────────────────────────────────────

router.delete(
  "/:id",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user?.venueId;
    if (!venueId) { res.status(400).json({ error: "No venueId on token" }); return; }

    const existing = await db
      .select({ id: devicesTable.id })
      .from(devicesTable)
      .where(and(eq(devicesTable.id, String(req.params.id ?? "")), eq(devicesTable.venueId, venueId)))
      .limit(1);

    if (!existing[0]) { res.status(404).json({ error: "Device not found" }); return; }

    await db.delete(devicesTable).where(eq(devicesTable.id, String(req.params.id ?? "")));
    res.json({ ok: true });
  },
);

// ── GET /api/devices/:id/metrics ──────────────────────────────────────────────

router.get(
  "/:id/metrics",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user?.venueId;
    if (!venueId) { res.status(400).json({ error: "No venueId on token" }); return; }

    const device = await db
      .select()
      .from(devicesTable)
      .where(and(eq(devicesTable.id, String(req.params.id ?? "")), eq(devicesTable.venueId, venueId)))
      .limit(1);

    if (!device[0]) { res.status(404).json({ error: "Device not found" }); return; }

    const sessions = await db
      .select()
      .from(deviceSessionsTable)
      .where(eq(deviceSessionsTable.deviceId, String(req.params.id ?? "")))
      .orderBy(desc(deviceSessionsTable.startedAt))
      .limit(100);

    const completed = sessions.filter((s) => s.endedAt !== null);
    const avgMs     = completed.length > 0
      ? completed.reduce((sum, s) => {
          const ms = new Date(s.endedAt!).getTime() - new Date(s.startedAt).getTime();
          return sum + ms;
        }, 0) / completed.length
      : 0;

    const resets = sessions.filter((s) => s.resetReason !== null).length;
    const orders = sessions.filter((s) => s.orderPlaced).length;

    res.json({
      device: device[0],
      metrics: {
        sessionsStarted:  sessions.length,
        ordersPlaced:     orders,
        resetsTriggered:  resets,
        avgSessionMs:     Math.round(avgMs),
        avgSessionMin:    Math.round(avgMs / 60000 * 10) / 10,
        resetBreakdown: {
          inactivity:     sessions.filter((s) => s.resetReason === "inactivity").length,
          orderComplete:  sessions.filter((s) => s.resetReason === "order_complete").length,
          staffReset:     sessions.filter((s) => s.resetReason === "staff_reset").length,
        },
      },
      recentSessions: sessions.slice(0, 20),
    });
  },
);

// ── POST /api/devices/:id/reset ────────────────────────────────────────────────

router.post(
  "/:id/reset",
  requireAuth,
  requireRole("staff", "manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user?.venueId;
    if (!venueId) { res.status(400).json({ error: "No venueId on token" }); return; }

    const device = await db
      .select()
      .from(devicesTable)
      .where(and(eq(devicesTable.id, String(req.params.id ?? "")), eq(devicesTable.venueId, venueId)))
      .limit(1);

    if (!device[0]) { res.status(404).json({ error: "Device not found" }); return; }

    // Close any open session
    await db
      .update(deviceSessionsTable)
      .set({ endedAt: new Date(), resetReason: "staff_reset" })
      .where(
        and(
          eq(deviceSessionsTable.deviceId, String(req.params.id ?? "")),
          isNull(deviceSessionsTable.endedAt),
        ),
      );

    // Update lastActiveAt
    await db
      .update(devicesTable)
      .set({ lastActiveAt: new Date(), updatedAt: new Date() })
      .where(eq(devicesTable.id, String(req.params.id ?? "")));

    res.json({ ok: true, resetAt: new Date() });
  },
);

// ── POST /api/devices/:id/session ─────────────────────────────────────────────

router.post(
  "/:id/session",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const parsed = sessionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(422).json({ error: parsed.error.flatten() }); return; }

    const device = await db
      .select()
      .from(devicesTable)
      .where(eq(devicesTable.id, String(req.params.id ?? "")))
      .limit(1);

    if (!device[0]) { res.status(404).json({ error: "Device not found" }); return; }

    if (parsed.data.action === "start") {
      // Close any lingering open session
      await db
        .update(deviceSessionsTable)
        .set({ endedAt: new Date(), resetReason: "staff_reset" })
        .where(and(
          eq(deviceSessionsTable.deviceId, String(req.params.id ?? "")),
          isNull(deviceSessionsTable.endedAt),
        ));

      const [session] = await db.insert(deviceSessionsTable).values({
        deviceId:    String(req.params.id ?? ""),
        venueId:     device[0].venueId,
        tableNumber: parsed.data.tableNumber ?? device[0].tableNumber ?? null,
        userId:      parsed.data.userId ?? req.user?.id ?? null,
      }).returning();

      // Stamp lastActiveAt
      await db
        .update(devicesTable)
        .set({ lastActiveAt: new Date(), updatedAt: new Date() })
        .where(eq(devicesTable.id, String(req.params.id ?? "")));

      res.status(201).json(session);
    } else {
      // End open session
      const [ended] = await db
        .update(deviceSessionsTable)
        .set({
          endedAt:     new Date(),
          orderPlaced: parsed.data.orderPlaced ?? false,
          resetReason: (parsed.data.resetReason as ResetReason) ?? null,
        })
        .where(and(
          eq(deviceSessionsTable.deviceId, String(req.params.id ?? "")),
          isNull(deviceSessionsTable.endedAt),
        ))
        .returning();

      res.json(ended ?? { ok: true });
    }
  },
);

// ── POST /api/devices/:id/recover ─────────────────────────────────────────────
// Marks a device as active after it was offline, queues a recovery ping.

router.post(
  "/:id/recover",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user?.venueId;
    if (!venueId) { res.status(400).json({ error: "No venueId on token" }); return; }

    const device = await db
      .select()
      .from(devicesTable)
      .where(and(eq(devicesTable.id, String(req.params.id ?? "")), eq(devicesTable.venueId, venueId)))
      .limit(1);

    if (!device[0]) { res.status(404).json({ error: "Device not found" }); return; }

    const [updated] = await db
      .update(devicesTable)
      .set({ status: "active", lastActiveAt: new Date(), updatedAt: new Date() })
      .where(eq(devicesTable.id, String(req.params.id ?? "")))
      .returning();

    logger.info({ deviceId: updated.id, venueId }, "Device recovery initiated");
    res.json({ ok: true, device: updated, recoveredAt: new Date() });
  },
);

// ── GET /api/devices/venue-qr/:venueId ────────────────────────────────────────

router.get(
  "/venue-qr/:venueId",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const venueId = String(req.params.venueId ?? "");
    const tableNumber = req.query["tableNumber"] as string | undefined;
    const mode        = (req.query["mode"] as string) ?? "normal";

    // Build the deep link URL
    const domains = (process.env.REPLIT_DOMAINS ?? "localhost").split(",");
    const host    = domains[0]!;
    const base    = process.env.BASE_URL ?? "";

    const qs = new URLSearchParams({ venueId, mode });
    if (tableNumber) qs.set("tableNumber", tableNumber);
    const deepLink = `https://${host}${base}?${qs.toString()}`;

    try {
      const svgString = await QRCode.toString(deepLink, {
        type:          "svg",
        width:         300,
        margin:        2,
        color:         { dark: "#D4AF37", light: "#00000000" },
        errorCorrectionLevel: "M",
      });
      res.setHeader("Content-Type", "image/svg+xml");
      res.send(svgString);
    } catch (err) {
      logger.error({ err }, "QR generation failed");
      res.status(500).json({ error: "QR generation failed" });
    }
  },
);

export default router;
