/**
 * NoveeEngine Routes
 *
 * GET  /api/novee/status          — tier + full capability matrix for the venue
 * POST /api/novee/demand          — Pillar 1: demand velocity (all tiers)
 * POST /api/novee/friction        — Pillar 2: interface friction (mid/premium)
 * POST /api/novee/sniper          — Pillar 3: competitor sniper (mid/premium)
 */

import { Router, type IRouter, type Response } from "express";
import { eq }                                   from "drizzle-orm";
import { z }                                    from "zod";
import { db, venuesTable }                      from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { logger }                               from "../lib/logger";
import {
  processDemandVelocity,
  evaluateUserFriction,
  executeSniperDaemon,
  resolveCapabilityMatrix,
  type NoveeTier,
} from "../services/noveeEngine";

const router: IRouter = Router();

// ── Tier resolution ───────────────────────────────────────────────────────────

async function getVenueTier(req: AuthRequest): Promise<NoveeTier> {
  if (req.user?.role === "super_admin") return "premium";

  const venueId = req.user?.venueId;
  if (!venueId) return "basic";

  const [venue] = await db
    .select({ plan: venuesTable.plan })
    .from(venuesTable)
    .where(eq(venuesTable.id, venueId))
    .limit(1);

  return (venue?.plan ?? "basic") as NoveeTier;
}

// ── GET /api/novee/status ─────────────────────────────────────────────────────

router.get("/novee/status", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tier   = await getVenueTier(req);
    const matrix = resolveCapabilityMatrix(tier);
    return res.json({ success: true, ...matrix });
  } catch (err) {
    logger.error({ err }, "novee/status failed");
    return res.status(500).json({ error: "Status check failed" });
  }
});

// ── POST /api/novee/demand ────────────────────────────────────────────────────

const demandSchema = z.object({
  productId: z.string().min(1),
});

router.post("/novee/demand", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = demandSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const venueId = req.user?.venueId;
  if (!venueId && req.user?.role !== "super_admin") {
    return res.status(400).json({ error: "No venueId associated with this account" });
  }

  try {
    const tier   = await getVenueTier(req);
    const result = await processDemandVelocity(venueId ?? "demo", parsed.data.productId, tier);
    return res.json({ success: true, result });
  } catch (err) {
    logger.error({ err }, "novee/demand failed");
    return res.status(500).json({ error: "Demand velocity check failed" });
  }
});

// ── POST /api/novee/friction ──────────────────────────────────────────────────

const frictionSchema = z.object({
  dwellTimeSeconds:      z.number().min(0),
  interactionLoopsCount: z.number().int().min(0),
  biometricStream:       z.object({
    energyState: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
    heartRateBpm: z.number().optional(),
  }).optional(),
});

router.post("/novee/friction", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = frictionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  try {
    const tier   = await getVenueTier(req);
    const result = evaluateUserFriction(
      tier,
      parsed.data.dwellTimeSeconds,
      parsed.data.interactionLoopsCount,
      parsed.data.biometricStream,
    );
    return res.json({ success: true, result });
  } catch (err) {
    logger.error({ err }, "novee/friction failed");
    return res.status(500).json({ error: "Friction evaluation failed" });
  }
});

// ── POST /api/novee/sniper ────────────────────────────────────────────────────

const sniperSchema = z.object({
  internalAssetPrice:     z.number().positive(),
  competitorAveragePrice: z.number().positive(),
});

router.post("/novee/sniper", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = sniperSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  try {
    const tier   = await getVenueTier(req);
    const result = executeSniperDaemon(
      tier,
      parsed.data.internalAssetPrice,
      parsed.data.competitorAveragePrice,
    );
    return res.json({ success: true, result });
  } catch (err) {
    logger.error({ err }, "novee/sniper failed");
    return res.status(500).json({ error: "Sniper daemon failed" });
  }
});

export default router;
