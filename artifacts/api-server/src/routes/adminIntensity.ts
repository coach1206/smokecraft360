import { Router, type IRouter, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { z } from "zod";
import {
  getVenueIntensityConfig,
  setVenueIntensityConfig,
  getPlatformDefaults,
  getPlatformLimits,
  invalidateCache,
} from "../services/venueIntensityConfig";
import { logAudit } from "../lib/audit";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const intensityUpdateSchema = z.object({
  maxDiscountPercent: z.number().min(0).max(25).optional(),
  maxFixedDiscountCents: z.number().int().min(0).max(5000).optional(),
  freeItemDailyLimit: z.number().int().min(0).max(10).optional(),
  rewardCooldownMinutes: z.number().min(1).max(1440).optional(),
  minimumSpendCentsForHighRewards: z.number().int().min(0).max(100000).optional(),
  xpDifficultyMultiplier: z.number().min(0.1).max(3.0).optional(),
  streakBonusCap: z.number().int().min(0).max(200).optional(),
  explorationBonusCap: z.number().int().min(0).max(100).optional(),
  perfectMatchBonusCap: z.number().int().min(0).max(100).optional(),
  crossCraftBonusCap: z.number().int().min(0).max(100).optional(),
  rewardFrequencyLimit: z.number().int().min(1).max(50).optional(),
  sameDeviceCooldownMinutes: z.number().int().min(1).max(1440).optional(),
  fraudSensitivity: z.number().min(0).max(1).optional(),
  leaderboardIntensity: z.number().min(0).max(2).optional(),
  campaignBoostMultiplier: z.number().min(0).max(3).optional(),
});

router.get(
  "/defaults",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  (_req: AuthRequest, res: Response) => {
    res.json({
      defaults: getPlatformDefaults(),
      limits: getPlatformLimits(),
    });
  },
);

router.get(
  "/:venueId",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = String(req.params.venueId ?? "");
    if (!UUID_RE.test(venueId)) {
      res.status(400).json({ error: "Invalid venue ID" });
      return;
    }

    const role = req.user!.role;
    if (role !== "super_admin" && req.user!.venueId !== venueId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const config = await getVenueIntensityConfig(venueId);
    res.json({ venueId, config });
  },
);

router.patch(
  "/:venueId",
  requireAuth,
  requireRole("venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = String(req.params.venueId ?? "");
    if (!UUID_RE.test(venueId)) {
      res.status(400).json({ error: "Invalid venue ID" });
      return;
    }

    const role = req.user!.role;
    if (role !== "super_admin" && req.user!.venueId !== venueId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const parsed = intensityUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
      return;
    }

    const updates = parsed.data;
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const { before, after } = await setVenueIntensityConfig(venueId, updates);

    await logAudit(req, {
      action: "intensity_config.update",
      entityType: "intensity_config",
      entityId: venueId,
      before: before as unknown as Record<string, unknown>,
      after: after as unknown as Record<string, unknown>,
      venueId,
    });

    req.log.info({ venueId, changes: Object.keys(updates) }, "intensity config updated");

    res.json({ venueId, before, after });
  },
);

router.post(
  "/:venueId/reset",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = String(req.params.venueId ?? "");
    if (!UUID_RE.test(venueId)) {
      res.status(400).json({ error: "Invalid venue ID" });
      return;
    }

    const before = await getVenueIntensityConfig(venueId);
    const defaults = getPlatformDefaults();
    await setVenueIntensityConfig(venueId, defaults);

    await logAudit(req, {
      action: "intensity_config.reset",
      entityType: "intensity_config",
      entityId: venueId,
      before: before as unknown as Record<string, unknown>,
      after: defaults as unknown as Record<string, unknown>,
      venueId,
    });

    invalidateCache(venueId);
    res.json({ venueId, config: defaults, message: "Reset to platform defaults" });
  },
);

export default router;
