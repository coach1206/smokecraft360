/**
 * /api/demo — Demo Engine — generates synthetic live venue events.
 *
 *   GET  /api/demo/live-events     — returns rotating synthetic venue events
 *   GET  /api/demo/fake-orders     — returns fake order stream
 *   GET  /api/demo/fake-analytics  — returns simulated analytics snapshot
 *   POST /api/demo/reset           — no-op (all data is synthetic, no DB state)
 *
 * All data is synthetic — zero production impact.
 */

import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

// ── Synthetic event pool ──────────────────────────────────────────────────────

const EVENT_POOL = [
  { type: "reservation",  message: "VIP reservation confirmed — Table 7 for James Whitmore",              priority: "high"   },
  { type: "ai",           message: "Pairing confidence increased to 94% — Buffalo Trace + Opus X",        priority: "normal" },
  { type: "inventory",    message: "Macanudo Vintage running low — 3 units remaining",                    priority: "warn"   },
  { type: "ai",           message: "Recommendation engine adapted to Marcus Chen's flavor profile",       priority: "normal" },
  { type: "loyalty",      message: "Rachel Kim reached Platinum tier — 5,600 lifetime points",            priority: "high"   },
  { type: "trend",        message: "Buffalo Trace trending tonight — 8 pours in the last hour",           priority: "normal" },
  { type: "order",        message: "Table 12 order confirmed — Davidoff Grand Cru + Macallan 18",         priority: "normal" },
  { type: "ai",           message: "Behavioral intelligence updated — upsell window at Table 9",          priority: "normal" },
  { type: "campaign",     message: "Padron brand campaign active — 12% lift in recommendations",          priority: "normal" },
  { type: "inventory",    message: "Pappy Van Winkle 15yr — only 4 bottles remaining in vault",          priority: "warn"   },
  { type: "ai",           message: "Personalization score for tonight: 97/100 — peak engagement",         priority: "high"   },
  { type: "reservation",  message: "Thornton Group corporate table confirmed — 6 guests at 8:30 PM",      priority: "high"   },
  { type: "loyalty",      message: "James Whitmore redeemed 250 points — complimentary vintage",          priority: "normal" },
  { type: "ai",           message: "Taste profile updated for Aria Nakamura — floral preference detected", priority: "normal" },
  { type: "order",        message: "Table 3 spend $113 — highest tab of the evening",                    priority: "high"   },
  { type: "trend",        message: "Arturo Fuente Opus X: 4 units in 30 minutes — restocking recommended", priority: "warn" },
  { type: "ai",           message: "Cross-venue: Davidoff trending across 3 Chicago locations tonight",   priority: "normal" },
  { type: "staff",        message: "Carlos Reyes completed 3 expert pairings — satisfaction 100%",       priority: "normal" },
  { type: "campaign",     message: "Distributor campaign generated $420 in incremental revenue",          priority: "high"   },
  { type: "ai",           message: "Revenue forecast: $4,200 tonight — 18% above Tuesday average",       priority: "high"   },
  { type: "order",        message: "New order: Table 5 — Elf Bar BC5000 + Hendrick's Gin",               priority: "normal" },
  { type: "ai",           message: "Match confidence for David Okafor increased from 72% to 91%",         priority: "normal" },
  { type: "loyalty",      message: "Aria Nakamura earned 34 loyalty points from tonight's session",       priority: "normal" },
  { type: "reservation",  message: "Walk-in added to waitlist — estimated 22-minute wait",               priority: "normal" },
  { type: "ai",           message: "Revenue engine detected premium upsell opportunity at Table 12",      priority: "high"   },
];

let eventCursor = 0;

router.get("/live-events", (_req: Request, res: Response) => {
  // Return a rotating window of 8 events, shifted by a time-based offset
  const offset = Math.floor(Date.now() / 3000) % EVENT_POOL.length; // rotates every 3s
  const events: typeof EVENT_POOL = [];
  for (let i = 0; i < 8; i++) {
    events.push(EVENT_POOL[(offset + i) % EVENT_POOL.length]!);
  }
  res.json({ events, ts: Date.now() });
});

// ── Fake orders ───────────────────────────────────────────────────────────────

router.get("/fake-orders", (_req: Request, res: Response) => {
  const offset = Math.floor(Date.now() / 5000) % 3;
  const orders = [
    { id: "o01", customer: "James Whitmore",   items: ["Arturo Fuente Opus X", "Buffalo Trace"], total: 52,  status: "active",    table: 7  },
    { id: "o02", customer: "Marcus Chen",      items: ["Davidoff Grand Cru", "Macallan 18"],     total: 100, status: "active",    table: 12 },
    { id: "o03", customer: "Rachel Kim",       items: ["Padron 1964", "Pappy Van Winkle"],        total: 113, status: "active",    table: 3  },
    { id: "o04", customer: "David Okafor",     items: ["Arturo Fuente Opus X"],                  total: 38,  status: offset > 0 ? "paid" : "preparing", table: 9 },
    { id: "o05", customer: "Aria Nakamura",    items: ["Elf Bar BC5000", "Hendrick's Gin"],       total: 34,  status: "active",    table: 5  },
    { id: "o06", customer: "Elena Vasquez",    items: ["Macanudo Vintage", "Buffalo Trace"],      total: 32,  status: offset > 1 ? "paid" : "preparing", table: 11 },
  ];
  res.json({ orders, ts: Date.now() });
});

// ── Fake analytics ────────────────────────────────────────────────────────────

router.get("/fake-analytics", (_req: Request, res: Response) => {
  // Slightly randomize to simulate live data
  const jitter = (base: number, pct = 0.05) =>
    Math.round(base * (1 + (Math.random() - 0.5) * 2 * pct));

  res.json({
    revenue: {
      tonight:      jitter(4200),
      mtd:          jitter(68400),
      avgTab:       jitter(82),
      projectedEOD: jitter(5100),
    },
    guests: {
      active:           6,
      tonight:          20,
      satisfactionScore: jitter(97),
      platinumOnFloor:  2,
    },
    ai: {
      pairingConfidence: jitter(94),
      personalizationScore: jitter(97),
      upsellRate:        jitter(34),
      recommendationAccuracy: jitter(91),
    },
    inventory: {
      alertCount:     2,
      lowStockItems: ["Macanudo Vintage", "Pappy Van Winkle 15yr"],
      trendingTonight: ["Buffalo Trace", "Arturo Fuente Opus X", "Macallan 18"],
    },
    loyalty: {
      pointsIssuedTonight: jitter(840),
      redemptionsTonight:  2,
      activeMembersOnFloor: 8,
    },
    ts: Date.now(),
  });
});

// ── Demo reset (no-op — all data is synthetic) ────────────────────────────────

router.post("/reset", (_req: Request, res: Response) => {
  res.json({ success: true, message: "Demo state is stateless — no reset needed.", ts: Date.now() });
});

export default router;
