/**
 * Novee Pulse — real-time telemetry endpoints.
 *
 * GET /api/novee/pulse/mood         — zone mood + pressure data
 * GET /api/novee/pulse/hardware     — device telemetry
 * GET /api/novee/pulse/predictions  — AI predictive forecast cards
 *
 * Auth: requires valid JWT (any role). Falls back gracefully — frontend
 * continues with simulated data if these endpoints are unavailable.
 */

import { Router, type IRouter, type Response } from "express";
import { requireAuth, type AuthRequest }        from "../middleware/auth";

const router: IRouter = Router();
const guard = [requireAuth] as const;

// ── Contextual seed data (deterministic but with micro-noise on each call) ────
const ZONE_NAMES = [
  "Cigar Lounge", "Whiskey Bar", "VIP Suite", "Main Floor",
  "Private Alcove", "Patio Terrace", "Bar Seating", "Event Hall",
];

function noise(base: number, range: number): number {
  return Math.max(5, Math.min(100, base + (Math.random() - 0.48) * range));
}

function pressure(score: number): "chill" | "active" | "peak" {
  return score < 31 ? "chill" : score < 71 ? "active" : "peak";
}

// ── GET /api/novee/pulse/mood ─────────────────────────────────────────────────
router.get("/mood", ...guard, (_req: AuthRequest, res: Response) => {
  const bases = [52, 74, 88, 40, 22, 36, 62, 18];

  const zones = ZONE_NAMES.map((name, i) => {
    const score = noise(bases[i], 10);
    const occ   = noise(score + 10, 8);
    return {
      id:        `z${i + 1}`,
      name,
      score:     Math.round(score),
      pressure:  pressure(score),
      trend:     Math.random() > 0.55 ? "up" : Math.random() > 0.5 ? "down" : "stable",
      occupancy: Math.round(occ),
    };
  });

  res.json({ zones, ts: Date.now() });
});

// ── GET /api/novee/pulse/hardware ─────────────────────────────────────────────
router.get("/hardware", ...guard, (_req: AuthRequest, res: Response) => {
  const devices = [
    { id: "TTX-001", name: "Titan Kiosk 1",  battery: Math.round(noise(87, 3)), status: "guest_active", health: 98, pingMs: Math.round(noise(12, 6)),  sessionGuest: "M. Carter"  },
    { id: "TTX-004", name: "Titan Kiosk 2",  battery: Math.round(noise(61, 4)), status: "idle",         health: 94, pingMs: Math.round(noise(8,  4))  },
    { id: "TTX-007", name: "Titan Kiosk 3",  battery: Math.round(noise(11, 2)), status: "idle",         health: 91, pingMs: Math.round(noise(22, 6))  },
    { id: "TTX-009", name: "Titan Kiosk 4",  battery: Math.round(noise(44, 4)), status: "guest_active", health: 96, pingMs: Math.round(noise(9,  4)),  sessionGuest: "R. Vasquez" },
    { id: "TTX-012", name: "Titan Kiosk 5",  battery: Math.round(noise(78, 5)), status: "guest_active", health: 99, pingMs: Math.round(noise(6,  3)),  sessionGuest: "D. Park"    },
    { id: "TTX-015", name: "Staff Terminal", battery: Math.round(noise(93, 2)), status: "idle",         health: 100, pingMs: Math.round(noise(4, 2))  },
    { id: "TTX-018", name: "Bar Display",    battery: Math.round(noise(8,  2)), status: "offline",      health: 72,  pingMs: 0                         },
    { id: "TTX-021", name: "Host Stand",     battery: Math.round(noise(55, 4)), status: "guest_active", health: 97,  pingMs: Math.round(noise(11, 5)), sessionGuest: "T. Monroe"  },
  ];

  res.json({ hardware: devices, ts: Date.now() });
});

// ── GET /api/novee/pulse/predictions ─────────────────────────────────────────
router.get("/predictions", ...guard, (_req: AuthRequest, res: Response) => {
  const predictions = [
    {
      id: "p1", product: "Padrón 1964 Anniversary Natural", brand: "Padrón",
      confidence: Math.round(noise(91, 4)),
      reason: "Table 4 — 55min session, warm amber mood, vanilla finish preference on profile",
      zone: "Cigar Lounge", category: "Cigar",
    },
    {
      id: "p2", product: "Macallan 12 Year Double Cask", brand: "Macallan",
      confidence: Math.round(noise(85, 5)),
      reason: "VIP Suite guests matched Sherry-oak affinity vector (3 prior sessions)",
      zone: "VIP Suite", category: "Whiskey",
    },
    {
      id: "p3", product: "Clase Azul Reposado", brand: "Clase Azul",
      confidence: Math.round(noise(78, 6)),
      reason: "Whiskey Bar peak pressure — premium upsell window open (avg. dwell 42min)",
      zone: "Whiskey Bar", category: "Spirits",
    },
    {
      id: "p4", product: "Arturo Fuente Hemingway Classic", brand: "Arturo Fuente",
      confidence: Math.round(noise(73, 6)),
      reason: "Medium-bodied request queue up 2× — pairing window with Macallan active",
      zone: "Main Floor", category: "Cigar",
    },
    {
      id: "p5", product: "Buffalo Trace Bourbon", brand: "Buffalo Trace",
      confidence: Math.round(noise(66, 7)),
      reason: "Bar Seating chill-to-active transition — aperitif moment window open",
      zone: "Bar Seating", category: "Bourbon",
    },
  ];

  res.json({ predictions, ts: Date.now() });
});

export default router;
