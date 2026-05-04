import { Router, type IRouter, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { getEngineStatus } from "../services/experienceDecisionEngine";
import { runExperienceOptimization } from "../services/experienceAutomation";

const router: IRouter = Router();

router.get(
  "/status",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  (_req: AuthRequest, res: Response) => {
    res.json(getEngineStatus());
  },
);

router.post(
  "/optimize",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const result = await runExperienceOptimization();
    req.log.info({ triggeredBy: req.user!.id }, "manual optimization triggered");
    res.json(result);
  },
);

export default router;
