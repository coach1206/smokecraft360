/**
 * Identity Evolution Engine API
 *
 * POST /api/identity-evolution/guests/:guestId/evolve
 *   Runs evolveGuestProfile() for a completed session.
 *   Body: SessionData (choices[], dwellOnPremium[], emotionalScore, swipeCount,
 *         avgSwipeMs, groupSize?)
 *   Returns: EvolvedProfile with all computed KPIs + the evolution snapshot.
 *   Roles: staff, manager, venue_owner, super_admin
 *
 * GET  /api/identity-evolution/guests/:guestId
 *   Returns the current guest_identity_evolution row (or 404 if never evolved).
 *   Roles: staff, manager, venue_owner, super_admin
 *
 * GET  /api/identity-evolution/guests/:guestId/history
 *   Returns the last 20 evolution snapshots in reverse-chronological order.
 *   Roles: manager, venue_owner, super_admin
 */

import { Router, type IRouter, type Response } from "express";
import { z }                                   from "zod";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";
import {
  evolveGuestProfile,
  getEvolution,
}                                              from "../services/identityEvolutionService";

const router: IRouter = Router();

const staffGuard   = [requireAuth, requireRole("staff", "manager", "venue_owner", "super_admin")];
const managerGuard = [requireAuth, requireRole("manager", "venue_owner", "super_admin")];

// ── Zod schemas ────────────────────────────────────────────────────────────────

const choiceSchema = z.object({
  productId:    z.string().min(1),
  isBold:       z.boolean(),
  isUnfamiliar: z.boolean(),
  craftType:    z.enum(["smoke", "pour", "brew", "vape"]),
  action:       z.enum(["add", "skip"]),
});

const premiumDwellSchema = z.object({
  productId: z.string().min(1),
  dwellMs:   z.number().nonnegative(),
  selected:  z.boolean(),
  price:     z.number().nonnegative(),
});

const sessionDataSchema = z.object({
  choices:        z.array(choiceSchema).min(0),
  dwellOnPremium: z.array(premiumDwellSchema).default([]),
  emotionalScore: z.number().min(0).max(100),
  swipeCount:     z.number().int().nonnegative(),
  avgSwipeMs:     z.number().nonnegative(),
  groupSize:      z.number().int().min(1).optional(),
});

// ── POST /guests/:guestId/evolve ──────────────────────────────────────────────

router.post(
  "/guests/:guestId/evolve",
  ...staffGuard,
  async (req: AuthRequest, res: Response) => {
    const guestId = String(req.params.guestId ?? "").trim();
    if (!guestId) {
      res.status(400).json({ error: "guestId is required" });
      return;
    }

    const parsed = sessionDataSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid session data", details: parsed.error.flatten() });
      return;
    }

    const evolved = await evolveGuestProfile(guestId, parsed.data);
    res.status(200).json(evolved);
  },
);

// ── GET /guests/:guestId ──────────────────────────────────────────────────────

router.get(
  "/guests/:guestId",
  ...staffGuard,
  async (req: AuthRequest, res: Response) => {
    const guestId = String(req.params.guestId ?? "").trim();
    const row     = await getEvolution(guestId);
    if (!row) {
      res.status(404).json({ error: "No evolution record found for this guest" });
      return;
    }
    res.json(row);
  },
);

// ── GET /guests/:guestId/history ──────────────────────────────────────────────

router.get(
  "/guests/:guestId/history",
  ...managerGuard,
  async (req: AuthRequest, res: Response) => {
    const guestId = String(req.params.guestId ?? "").trim();
    const row     = await getEvolution(guestId);
    if (!row) {
      res.status(404).json({ error: "No evolution record found for this guest" });
      return;
    }

    const history = Array.isArray(row.evolutionHistory)
      ? [...row.evolutionHistory].reverse()
      : [];

    res.json({
      guestId,
      totalSnapshots: history.length,
      history,
    });
  },
);

export default router;
