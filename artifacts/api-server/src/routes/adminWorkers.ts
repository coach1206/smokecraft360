import { Router, type IRouter, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { getCleanupStatus, runSessionCleanup } from "../lib/sessionCleanupWorker";
import { logAudit } from "../lib/audit";
import rateLimit from "express-rate-limit";

const router: IRouter = Router();

const workerRunLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7" as const,
  legacyHeaders: false,
  message: { error: "Too many manual worker runs — please wait" },
});

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
  workerRunLimiter,
  async (req: AuthRequest, res: Response) => {
    req.log.info({ triggeredBy: req.user!.id }, "manual session cleanup triggered");

    await logAudit(req, {
      action: "worker.session_cleanup.run_now",
      entityType: "worker",
      entityId: "session-cleanup",
      after: { triggeredBy: req.user!.id, manual: true } as unknown as Record<string, unknown>,
    });

    const result = await runSessionCleanup();
    res.json(result);
  },
);

export default router;
