import { Router, type IRouter, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { getCleanupStatus, runSessionCleanup } from "../lib/sessionCleanupWorker";

const router: IRouter = Router();

router.get(
  "/session-cleanup/status",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  (_req: AuthRequest, res: Response) => {
    res.json(getCleanupStatus());
  },
);

router.post(
  "/session-cleanup/run-now",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    req.log.info({ triggeredBy: req.user!.id }, "manual session cleanup triggered");
    const result = await runSessionCleanup();
    res.json(result);
  },
);

export default router;
