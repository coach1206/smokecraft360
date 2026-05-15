/**
 * Investor Demo API — NOVEE OS Expansion & Valuation Engine
 *
 * GET /api/investor-demo/snapshot
 *   Live DB counts → full valuation + revenue streams + scale projections
 *   (500 / 1 000 / 5 000 venues). Cached 5 min via Cache-Control.
 *   Roles: super_admin
 *
 * GET /api/investor-demo/projection?venueCount=&guestCount=
 *   Hypothetical inputs → valuation + revenue. Useful for slide-deck
 *   what-if scenarios during a live investor presentation.
 *   venueCount: 1–100 000   guestCount: 0–50 000 000
 *   Roles: super_admin
 *
 * GET /api/investor-demo/revenue?venueCount=
 *   Revenue-streams-only projection for a given venue count.
 *   Roles: super_admin
 */

import { Router, type IRouter, type Response } from "express";
import { z }                                   from "zod";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";
import {
  buildSnapshot,
  calculateNetworkValuation,
  calculateRevenueStreams,
}                                              from "../services/investorDemoService";

const router: IRouter = Router();
const guard = [requireAuth, requireRole("super_admin")];

// ── GET /snapshot ─────────────────────────────────────────────────────────────

router.get("/snapshot", ...guard, async (_req: AuthRequest, res: Response) => {
  const snapshot = await buildSnapshot();
  // 5-minute cache — numbers don't change faster than that in a demo context
  res.setHeader("Cache-Control", "private, max-age=300");
  res.json(snapshot);
});

// ── GET /projection ───────────────────────────────────────────────────────────

const projectionSchema = z.object({
  venueCount: z.coerce.number().int().min(1).max(100_000),
  guestCount: z.coerce.number().int().min(0).max(50_000_000),
});

router.get("/projection", ...guard, (req: AuthRequest, res: Response) => {
  const parsed = projectionSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
    return;
  }

  const { venueCount, guestCount } = parsed.data;

  res.json({
    inputs:           { venueCount, guestCount },
    networkValuation: calculateNetworkValuation(venueCount, guestCount),
    revenueStreams:   calculateRevenueStreams(venueCount),
  });
});

// ── GET /revenue ──────────────────────────────────────────────────────────────

const revenueSchema = z.object({
  venueCount: z.coerce.number().int().min(1).max(100_000),
});

router.get("/revenue", ...guard, (req: AuthRequest, res: Response) => {
  const parsed = revenueSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid query", details: parsed.error.flatten() });
    return;
  }

  res.json(calculateRevenueStreams(parsed.data.venueCount));
});

export default router;
