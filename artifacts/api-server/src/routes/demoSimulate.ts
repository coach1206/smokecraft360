/**
 * Investor Demo Simulation Engine
 *
 * POST /api/demo/simulate/start  — start a simulation session
 * GET  /api/demo/simulate/feed   — SSE stream of live sim events
 * POST /api/demo/simulate/stop   — stop an active simulation
 * GET  /api/demo/simulate/events — poll-based alternative (returns recent events)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID }               from "crypto";
import { logger }                   from "../lib/logger";

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
  events:    SimEvent[];
  interval?: ReturnType<typeof setInterval>;
  clients:   Set<Response>;
}

interface SimEvent {
  id:        string;
  type:      string;
  payload:   Record<string, unknown>;
  timestamp: string;
}

const SIM_SESSIONS = new Map<string, SimSession>();

const PRODUCTS = [
  { name: "Arturo Fuente Opus X",       category: "cigar",  price: 42 },
  { name: "Macallan 18 Sherry Oak",      category: "spirit", price: 28 },
  { name: "Cohiba Behike 52",            category: "cigar",  price: 68 },
  { name: "Guinness Draught",            category: "beer",   price: 9  },
  { name: "Padrón 1926 Serie #80",      category: "cigar",  price: 55 },
  { name: "Glenfiddich 21 Gran Reserva", category: "spirit", price: 35 },
  { name: "Wagyu Beef Sliders",          category: "food",   price: 24 },
  { name: "Rocky Patel Vintage 1992",    category: "cigar",  price: 38 },
];

const GUESTS = [
  "Jordan M.", "Alex R.", "Casey T.", "Sam W.",
  "Morgan B.", "Taylor K.", "Chris D.", "Riley P.",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function generateEvent(session: SimSession): SimEvent {
  const types = ["order_placed", "reward_unlocked", "product_viewed", "revenue_update", "device_ping"];
  const weights = [0.35, 0.15, 0.25, 0.15, 0.10];
  const rand = Math.random();
  let cum = 0;
  let type = types[0]!;
  for (let i = 0; i < types.length; i++) {
    cum += weights[i]!;
    if (rand <= cum) { type = types[i]!; break; }
  }

  const product = pickRandom(PRODUCTS);
  const guest   = pickRandom(GUESTS);
  const qty     = Math.ceil(Math.random() * 3);
  const total   = product.price * qty;

  const payloads: Record<string, Record<string, unknown>> = {
    order_placed: {
      orderId:   `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      guest,
      product:   product.name,
      category:  product.category,
      qty,
      total,
      rewardApplied: Math.random() > 0.8,
    },
    reward_unlocked: {
      guest,
      tier:       pickRandom(["Bronze", "Silver", "Gold", "Platinum"]),
      discount:   `${Math.floor(Math.random() * 15) + 5}%`,
      savedAmount: Math.floor(Math.random() * 20) + 5,
    },
    product_viewed: {
      product:   product.name,
      category:  product.category,
      source:    pickRandom(["recommendation", "browse", "search"]),
    },
    revenue_update: {
      currentRevenue: session.revenue,
      hourlyRate:     Math.floor(session.revenue / Math.max(1, (Date.now() - session.startedAt.getTime()) / 3600000)),
      trend:          Math.random() > 0.3 ? "up" : "down",
    },
    device_ping: {
      deviceName: pickRandom(["Main Bar Kiosk", "Lounge Tablet #1", "Manager Phone", "Demo iPad"]),
      status:     Math.random() > 0.1 ? "online" : "offline",
      battery:    Math.floor(Math.random() * 40) + 60,
    },
  };

  // Update session metrics
  if (type === "order_placed") {
    session.revenue += total;
    session.orders  += 1;
    if ((payloads.order_placed.rewardApplied as boolean)) session.rewards += 1;
  }

  return {
    id:        randomUUID(),
    type,
    payload:   payloads[type]!,
    timestamp: new Date().toISOString(),
  };
}

function broadcast(session: SimSession, event: SimEvent) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  session.clients.forEach(client => {
    try { client.write(data); } catch { /* client gone */ }
  });
}

// ── POST /api/demo/simulate/start ─────────────────────────────────────────────

router.post("/demo/simulate/start", (req: Request, res: Response) => {
  const profile = typeof req.body.profile === "string" ? req.body.profile : "investor";

  const session: SimSession = {
    id:        randomUUID(),
    startedAt: new Date(),
    profile,
    revenue:   0,
    orders:    0,
    rewards:   0,
    active:    true,
    events:    [],
    clients:   new Set(),
  };

  SIM_SESSIONS.set(session.id, session);

  // Auto-clean after 10 minutes
  setTimeout(() => {
    const s = SIM_SESSIONS.get(session.id);
    if (s) {
      clearInterval(s.interval);
      s.active = false;
      s.clients.forEach(c => { try { c.end(); } catch { /* ignore */ } });
      SIM_SESSIONS.delete(session.id);
    }
  }, 10 * 60 * 1000);

  logger.info({ sessionId: session.id, profile }, "Demo simulation started");
  res.status(201).json({ sessionId: session.id, profile, startedAt: session.startedAt });
});

// ── GET /api/demo/simulate/feed ────────────────────────────────────────────────

router.get("/demo/simulate/feed", (req: Request, res: Response) => {
  const sessionId = String(req.query.sessionId ?? "");
  const session   = SIM_SESSIONS.get(sessionId);

  if (!session || !session.active) {
    res.status(404).json({ error: "Session not found or stopped" });
    return;
  }

  // SSE headers
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  session.clients.add(res);

  // Send recent events backlog (last 10)
  const backlog = session.events.slice(-10);
  for (const evt of backlog) {
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  }

  // Start interval if first client
  if (!session.interval) {
    const speed = Number(req.query.speed ?? 2000);
    session.interval = setInterval(() => {
      if (!session.active) { clearInterval(session.interval); return; }
      const evt = generateEvent(session);
      session.events.push(evt);
      if (session.events.length > 500) session.events.shift();
      broadcast(session, evt);
    }, Math.max(500, Math.min(speed, 10000)));
  }

  req.on("close", () => {
    session.clients.delete(res);
    if (session.clients.size === 0) {
      clearInterval(session.interval);
      delete session.interval;
    }
  });
});

// ── POST /api/demo/simulate/stop ──────────────────────────────────────────────

router.post("/demo/simulate/stop", (req: Request, res: Response) => {
  const sessionId = String(req.body.sessionId ?? "");
  const session   = SIM_SESSIONS.get(sessionId);

  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  clearInterval(session.interval);
  session.active = false;
  session.clients.forEach(c => { try { c.end(); } catch { /* ignore */ } });
  SIM_SESSIONS.delete(sessionId);

  logger.info({ sessionId, revenue: session.revenue, orders: session.orders }, "Demo simulation stopped");
  res.json({ ok: true, summary: { revenue: session.revenue, orders: session.orders, rewards: session.rewards } });
});

// ── GET /api/demo/simulate/events ─────────────────────────────────────────────
// Poll-based alternative — returns recent events for clients that can't do SSE

router.get("/demo/simulate/events", (req: Request, res: Response) => {
  const sessionId = String(req.query.sessionId ?? "");
  const session   = SIM_SESSIONS.get(sessionId);

  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  const since = req.query.since ? new Date(String(req.query.since)) : null;
  const events = since
    ? session.events.filter(e => new Date(e.timestamp) > since)
    : session.events.slice(-20);

  res.json({
    active:  session.active,
    revenue: session.revenue,
    orders:  session.orders,
    rewards: session.rewards,
    events,
  });
});

export default router;
