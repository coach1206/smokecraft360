/**
 * Investor Demo Simulation Engine
 *
 * POST /api/demo/simulate/start  — start a simulation session (super_admin)
 * GET  /api/demo/simulate/feed   — SSE stream of live sim events (authenticated)
 * POST /api/demo/simulate/stop   — stop an active simulation (super_admin)
 * GET  /api/demo/simulate/events — poll endpoint: last 50 events + running KPIs (authenticated)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID }                     from "crypto";
import { db, demoSimEventsTable }         from "@workspace/db";
import { eq, desc }                       from "drizzle-orm";
import { requireAuth, type AuthRequest }  from "../middleware/auth";
import { requireRole }                    from "../middleware/roles";
import { logger }                         from "../lib/logger";

const router: IRouter = Router();

// ── In-memory simulation state ─────────────────────────────────────────────────

interface SimSession {
  id:        string;
  startedAt: Date;
  profile:   string;
  revenue:   number;
  orders:    number;
  rewards:   number;
  active:    boolean;
  clients:   Set<Response>;
  interval?: ReturnType<typeof setInterval>;
}

const SIM_SESSIONS = new Map<string, SimSession>();

const PRODUCTS = [
  { name: "Arturo Fuente Opus X",        category: "cigar",  price: 42 },
  { name: "Macallan 18 Sherry Oak",       category: "spirit", price: 28 },
  { name: "Cohiba Behike 52",             category: "cigar",  price: 68 },
  { name: "Guinness Draught",             category: "beer",   price: 9  },
  { name: "Padrón 1926 Serie #80",       category: "cigar",  price: 55 },
  { name: "Glenfiddich 21 Gran Reserva",  category: "spirit", price: 35 },
  { name: "Wagyu Beef Sliders",           category: "food",   price: 24 },
  { name: "Rocky Patel Vintage 1992",     category: "cigar",  price: 38 },
];

const GUESTS = [
  "Jordan M.", "Alex R.", "Casey T.", "Sam W.",
  "Morgan B.", "Taylor K.", "Chris D.", "Riley P.",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function buildEventPayload(type: string, session: SimSession): Record<string, unknown> {
  const product = pickRandom(PRODUCTS);
  const guest   = pickRandom(GUESTS);
  const qty     = Math.ceil(Math.random() * 3);
  const total   = product.price * qty;

  const payloads: Record<string, Record<string, unknown>> = {
    order_placed: {
      orderId: `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      guest, product: product.name, category: product.category, qty, total,
      rewardApplied: Math.random() > 0.8,
    },
    reward_unlocked: {
      guest,
      tier:        pickRandom(["Bronze", "Silver", "Gold", "Platinum"]),
      discount:    `${Math.floor(Math.random() * 15) + 5}%`,
      savedAmount: Math.floor(Math.random() * 20) + 5,
    },
    product_viewed: {
      product: product.name, category: product.category,
      source: pickRandom(["recommendation", "browse", "search"]),
    },
    revenue_update: {
      currentRevenue: session.revenue,
      hourlyRate: Math.floor(session.revenue / Math.max(1, (Date.now() - session.startedAt.getTime()) / 3600000)),
      trend: Math.random() > 0.3 ? "up" : "down",
    },
    device_ping: {
      deviceName: pickRandom(["Main Bar Kiosk", "Lounge Tablet #1", "Manager Phone", "Demo iPad"]),
      status:     Math.random() > 0.1 ? "online" : "offline",
      battery:    Math.floor(Math.random() * 40) + 60,
    },
  };

  // Update session revenue/order counters
  if (type === "order_placed") {
    session.revenue += total;
    session.orders  += 1;
    if (payloads.order_placed.rewardApplied) session.rewards += 1;
  }

  return payloads[type] ?? {};
}

function selectEventType(): string {
  // Weighted random — orders 35%, views 25%, rewards 15%, revenue 15%, device 10%
  const r = Math.random();
  if (r < 0.35) return "order_placed";
  if (r < 0.60) return "product_viewed";
  if (r < 0.75) return "reward_unlocked";
  if (r < 0.90) return "revenue_update";
  return "device_ping";
}

function broadcast(session: SimSession, data: string) {
  session.clients.forEach(client => {
    try { client.write(data); } catch { /* client disconnected */ }
  });
}

// ── POST /api/demo/simulate/start ─────────────────────────────────────────────
// super_admin-only: only admins kick off investor demo sessions

router.post(
  "/demo/simulate/start",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const profile = typeof req.body.profile === "string" ? req.body.profile : "investor";
    const speedMs = Math.max(3000, Math.min(Number(req.body.speedMs ?? 3500), 10000));

    const session: SimSession = {
      id:        randomUUID(),
      startedAt: new Date(),
      profile,
      revenue:   0,
      orders:    0,
      rewards:   0,
      active:    true,
      clients:   new Set(),
    };

    SIM_SESSIONS.set(session.id, session);

    // Start event generation immediately
    session.interval = setInterval(async () => {
      if (!session.active) { clearInterval(session.interval); return; }

      const type    = selectEventType();
      const payload = buildEventPayload(type, session);
      const event   = {
        id:        randomUUID(),
        sessionId: session.id,
        type,
        payload,
        revenue:   session.revenue,
        orders:    session.orders,
        rewards:   session.rewards,
        timestamp: new Date().toISOString(),
      };

      // Persist event to DB
      try {
        await db.insert(demoSimEventsTable).values({
          sessionId: session.id,
          eventType: type,
          payload:   { ...payload, ...event },
        });
      } catch { /* non-fatal */ }

      broadcast(session, `data: ${JSON.stringify(event)}\n\n`);
    }, speedMs);

    // Auto-clean after 15 minutes
    setTimeout(() => {
      const s = SIM_SESSIONS.get(session.id);
      if (s) {
        clearInterval(s.interval);
        s.active = false;
        s.clients.forEach(c => { try { c.end(); } catch { /* ignore */ } });
        SIM_SESSIONS.delete(session.id);
      }
    }, 15 * 60 * 1000);

    logger.info({ sessionId: session.id, profile }, "Demo simulation started");
    res.status(201).json({ sessionId: session.id, profile, startedAt: session.startedAt, speedMs });
  },
);

// ── GET /api/demo/simulate/feed ────────────────────────────────────────────────
// Authenticated: SSE stream for a running simulation session

router.get(
  "/demo/simulate/feed",
  requireAuth,
  (req: Request, res: Response) => {
    const sessionId = String(req.query.sessionId ?? "");
    const session   = SIM_SESSIONS.get(sessionId);

    if (!session || !session.active) {
      res.status(404).json({ error: "Session not found or stopped" });
      return;
    }

    res.setHeader("Content-Type",      "text/event-stream");
    res.setHeader("Cache-Control",     "no-cache");
    res.setHeader("Connection",        "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    session.clients.add(res);

    // Send current KPI state immediately as first message
    res.write(`data: ${JSON.stringify({
      type: "kpi_snapshot",
      revenue: session.revenue, orders: session.orders, rewards: session.rewards,
      timestamp: new Date().toISOString(),
    })}\n\n`);

    req.on("close", () => { session.clients.delete(res); });
  },
);

// ── POST /api/demo/simulate/stop ──────────────────────────────────────────────
// super_admin / manager: stop an active simulation session

router.post(
  "/demo/simulate/stop",
  requireAuth,
  requireRole("super_admin"),
  (req: Request, res: Response) => {
    const sessionId = String(req.body.sessionId ?? "");
    const session   = SIM_SESSIONS.get(sessionId);

    if (!session) { res.status(404).json({ error: "Session not found" }); return; }

    clearInterval(session.interval);
    session.active = false;
    session.clients.forEach(c => { try { c.end(); } catch { /* ignore */ } });
    SIM_SESSIONS.delete(sessionId);

    logger.info({ sessionId, revenue: session.revenue, orders: session.orders }, "Demo simulation stopped");
    res.json({
      ok: true,
      summary: { revenue: session.revenue, orders: session.orders, rewards: session.rewards },
    });
  },
);

// ── GET /api/demo/simulate/events ─────────────────────────────────────────────
// Authenticated: poll endpoint — returns last 50 DB-persisted events + running KPIs

router.get(
  "/demo/simulate/events",
  requireAuth,
  async (req: Request, res: Response) => {
    const sessionId = String(req.query.sessionId ?? "");
    const session   = SIM_SESSIONS.get(sessionId);

    // Fetch last 50 persisted events for this session
    let events: Array<Record<string, unknown>> = [];
    try {
      const rows = await db
        .select()
        .from(demoSimEventsTable)
        .where(eq(demoSimEventsTable.sessionId, sessionId))
        .orderBy(desc(demoSimEventsTable.createdAt))
        .limit(50);

      events = rows.map(r => ({
        id:        r.id,
        type:      r.eventType,
        payload:   r.payload,
        timestamp: r.createdAt.toISOString(),
      })).reverse();
    } catch { /* DB unavailable — return in-memory */ }

    res.json({
      active:  session?.active ?? false,
      revenue: session?.revenue ?? 0,
      orders:  session?.orders  ?? 0,
      rewards: session?.rewards ?? 0,
      events,
    });
  },
);

export default router;
