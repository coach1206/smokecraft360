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
  // Spec field name is "assetId"; also accept "productId" for compatibility
  assetId:   z.string().min(1).optional(),
  productId: z.string().min(1).optional(),
}).refine(d => d.assetId ?? d.productId, {
  message: "assetId (or productId) is required",
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

  const assetId = (parsed.data.assetId ?? parsed.data.productId)!;

  try {
    const tier   = await getVenueTier(req);
    const result = await processDemandVelocity(venueId ?? "demo", assetId, tier);
    return res.json({ success: true, result });
  } catch (err) {
    logger.error({ err }, "novee/demand failed");
    return res.status(500).json({ error: "Demand velocity check failed" });
  }
});

// ── POST /api/novee/friction ──────────────────────────────────────────────────

const frictionSchema = z.object({
  // Spec field names are dwellTime / interactionLoopCount / biometricEnergyState
  dwellTime:              z.number().min(0).optional(),
  interactionLoopCount:   z.number().int().min(0).optional(),
  biometricEnergyState:   z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
  // Legacy aliases from initial implementation
  dwellTimeSeconds:       z.number().min(0).optional(),
  interactionLoopsCount:  z.number().int().min(0).optional(),
});

router.post("/novee/friction", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = frictionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const dwell  = parsed.data.dwellTime         ?? parsed.data.dwellTimeSeconds         ?? 0;
  const loops  = parsed.data.interactionLoopCount ?? parsed.data.interactionLoopsCount ?? 0;
  const energy = parsed.data.biometricEnergyState;

  try {
    const tier   = await getVenueTier(req);
    const result = evaluateUserFriction(tier, dwell, loops, energy);
    return res.json({ success: true, result });
  } catch (err) {
    logger.error({ err }, "novee/friction failed");
    return res.status(500).json({ error: "Friction evaluation failed" });
  }
});

// ── POST /api/novee/sniper ────────────────────────────────────────────────────

const sniperSchema = z.object({
  // Spec field names
  internalPrice:       z.number().positive().optional(),
  competitorAverage:   z.number().positive().optional(),
  // Legacy aliases
  internalAssetPrice:     z.number().positive().optional(),
  competitorAveragePrice: z.number().positive().optional(),
}).refine(d => (d.internalPrice ?? d.internalAssetPrice) && (d.competitorAverage ?? d.competitorAveragePrice), {
  message: "internalPrice and competitorAverage are required",
});

router.post("/novee/sniper", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = sniperSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", issues: parsed.error.issues });
  }

  const internal    = (parsed.data.internalPrice    ?? parsed.data.internalAssetPrice)!;
  const competitor  = (parsed.data.competitorAverage ?? parsed.data.competitorAveragePrice)!;

  try {
    const tier   = await getVenueTier(req);
    const result = executeSniperDaemon(tier, internal, competitor);
    return res.json({ success: true, result });
  } catch (err) {
    logger.error({ err }, "novee/sniper failed");
    return res.status(500).json({ error: "Sniper daemon failed" });
  }
});

export default router;
