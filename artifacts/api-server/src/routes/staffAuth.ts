/**
 * /api/staff — Staff Identity & Live Floor Operations
 *
 *   POST /api/staff/login          — PIN-based staff auth, returns JWT
 *   GET  /api/staff/tables         — current floor table grid
 *   GET  /api/staff/pulse          — SSE stream of BOH_PULSE events
 *   POST /api/staff/nudge          — emit a Service Sage nudge to all connected staff
 *
 * The SSE endpoint uses a per-request listener on the global pulseEmitter.
 * Each BOH_PULSE emitted by the Pairing Engine or the /nudge route is pushed
 * to all connected SSE clients within ~1 ms.
 *
 * Staff JWT payload:
 *   { sub: staffId, role: "staff", staffName, venueId, assignedSection }
 *   signed with SESSION_SECRET, 8 h expiry.
 */

import { Router, type Request, type Response } from "express";
import { eq, and }                              from "drizzle-orm";
import { SignJWT }                              from "jose";
import { db, venueStaffTable,
         guestProfilesTable,
         serverPulseEventsTable }              from "@workspace/db";
import { z }                                   from "zod";
import { matchInventory }                      from "../engines/inventoryMatcher";
import pulseEmitter, { emitPulse, type PulsePayload } from "../lib/pulseEmitter";
import { getIO }                               from "../lib/socketServer";

const router = Router();

const secret  = new TextEncoder().encode(
  process.env["SESSION_SECRET"] ?? "smokecraft-dev-secret-change-in-production",
);
const STAFF_EXPIRY = "8h";

// ── POST /login ────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  staffPin: z.string().length(4).regex(/^\d{4}$/),
  venueId:  z.string().uuid().optional(),
});

router.post("/login", async (req: Request, res: Response) => {
  const body = loginSchema.parse(req.body);

  const conditions = body.venueId
    ? and(eq(venueStaffTable.staffPin, body.staffPin), eq(venueStaffTable.venueId, body.venueId), eq(venueStaffTable.isActive, true))
    : and(eq(venueStaffTable.staffPin, body.staffPin), eq(venueStaffTable.isActive, true));

  const [staff] = await db
    .select()
    .from(venueStaffTable)
    .where(conditions)
    .limit(1);

  if (!staff) {
    res.status(401).json({ error: "invalid_pin", message: "Incorrect PIN or staff account not found." });
    return;
  }

  const token = await new SignJWT({
    sub:             staff.staffId,
    role:            "staff",
    staffName:       staff.staffName,
    venueId:         staff.venueId,
    assignedSection: staff.assignedSection,
    assignedTables:  staff.assignedTables,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(STAFF_EXPIRY)
    .sign(secret);

  res.json({
    ok:      true,
    token,
    staff: {
      staffId:         staff.staffId,
      staffName:       staff.staffName,
      assignedSection: staff.assignedSection,
      assignedTables:  staff.assignedTables,
      venueId:         staff.venueId,
    },
  });
});

// ── GET /tables ────────────────────────────────────────────────────────────────
// Delegates to the same demo-fallback floor logic as /api/sage/floor
// (avoids importing sage router — duplicates the lightweight inline logic)

router.get("/tables", async (req: Request, res: Response) => {
  const venueId = req.query["venueId"] as string | undefined;

  // Lightweight demo fallback (real data flows from guest_tabs in sage router)
  const demoTables = [
    { tableId: "Table 1", guestCount: 2, status: "active",  lastAction: new Date(Date.now() - 5  * 60000).toISOString(), section: "Main Floor" },
    { tableId: "Table 2", guestCount: 4, status: "active",  lastAction: new Date(Date.now() - 12 * 60000).toISOString(), section: "Main Floor" },
    { tableId: "Table 3", guestCount: 1, status: "idle",    lastAction: new Date(Date.now() - 35 * 60000).toISOString(), section: "Main Floor" },
    { tableId: "Table 4", guestCount: 3, status: "active",  lastAction: new Date(Date.now() - 8  * 60000).toISOString(), section: "Lounge" },
    { tableId: "Bar",     guestCount: 5, status: "active",  lastAction: new Date(Date.now() - 1  * 60000).toISOString(), section: "Bar" },
  ];

  res.json({ tables: demoTables, venueId: venueId ?? null, timestamp: new Date().toISOString() });
});

// ── GET /pulse — SSE stream ────────────────────────────────────────────────────

router.get("/pulse", (req: Request, res: Response) => {
  // SSE headers
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");  // disable nginx buffering
  res.flushHeaders();

  // Send a connected heartbeat immediately
  res.write(`event: connected\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);

  // Heartbeat every 25 s to keep the connection alive through load balancers
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 25_000);

  // Forward every pulse event to this SSE client
  const listener = (data: PulsePayload) => {
    res.write(`event: pulse\ndata: ${JSON.stringify(data)}\n\n`);
  };
  pulseEmitter.onPulse(listener);

  // Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeat);
    pulseEmitter.offPulse(listener);
  });
});

// ── POST /nudge — emit a Service Sage nudge ────────────────────────────────────

const nudgeSchema = z.object({
  tableId:          z.string().min(1),
  guestProfileId:   z.string().uuid().optional(),
  guestName:        z.string().min(1),
  guestLevel:       z.string().optional().default("Explorer"),
  draftProfile:     z.string().optional().default(""),
  flavorTags:       z.array(z.string()).optional().default([]),
  body:             z.string().optional(),
  boldness:         z.number().int().min(1).max(5).optional(),
  craftType:        z.enum(["smoke", "pour", "brew", "vape"]).optional(),
  venueId:          z.string().uuid().optional(),
  topMatch:         z.string().optional(),
  masteryBoost:     z.number().int().optional().default(15),
});

router.post("/nudge", async (req: Request, res: Response) => {
  const body = nudgeSchema.parse(req.body);

  // If venueId is provided, run inventory matching for the best recommendation
  let sagesRecommendation: string | undefined;
  let topMatch = body.topMatch;

  if (body.venueId && body.flavorTags.length > 0) {
    try {
      const matches = await matchInventory(body.venueId, {
        flavorTags: body.flavorTags,
        body:       body.body,
        boldness:   body.boldness,
        craftType:  body.craftType,
      });
      if (matches[0]) {
        topMatch              = matches[0].name;
        sagesRecommendation   = matches[0].sagesRecommendation;
      }
    } catch { /* non-fatal — fall through */ }
  }

  const payload: PulsePayload = {
    type:                "BOH_PULSE",
    table:               body.tableId,
    guestName:           body.guestName,
    guestLevel:          body.guestLevel,
    draftProfile:        body.draftProfile,
    topMatch:            topMatch ?? "Chef's Selection",
    masteryBoost:        body.masteryBoost,
    sagesRecommendation: sagesRecommendation,
    recommendation:      sagesRecommendation,
    timestamp:           new Date().toISOString(),
  };

  // Push via SSE
  emitPulse(payload);

  // Also push via Socket.io for the existing StaffBOHFeed component
  const io = getIO();
  if (io) {
    io.emit("BOH_PULSE", {
      ...payload,
      table:        body.tableId,
      guestName:    body.guestName,
      guestLevel:   body.guestLevel,
      draftProfile: body.draftProfile,
      topMatch:     topMatch ?? "Chef's Selection",
      masteryBoost: body.masteryBoost,
      recommendation: sagesRecommendation,
    });
  }

  // Persist to server_pulse_events
  if (body.venueId) {
    await db.insert(serverPulseEventsTable).values({
      venueId:         body.venueId,
      tableId:         body.tableId,
      guestProfileId:  body.guestProfileId,
      guestName:       body.guestName,
      guestLevel:      body.guestLevel,
      draftProfile:    body.draftProfile,
      recommendedItem: topMatch ?? "Chef's Selection",
      masteryBoost:    body.masteryBoost,
    }).catch(() => {});
  }

  res.json({ ok: true, payload });
});

export default router;
