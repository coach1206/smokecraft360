import { Router, type IRouter, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { logAudit } from "../lib/audit";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const APP_VERSION = "1.0.0";
const MIN_SUPPORTED_VERSION = "1.0.0";

let forceRefreshEnabled = false;

router.get(
  "/version",
  (_req, res: Response) => {
    res.json({
      version: APP_VERSION,
      minSupportedVersion: MIN_SUPPORTED_VERSION,
      forceRefresh: forceRefreshEnabled,
    });
  },
);

router.post(
  "/force-refresh",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const { enabled } = req.body as { enabled?: boolean };
    if (typeof enabled !== "boolean") {
      res.status(400).json({ error: "enabled must be a boolean" });
      return;
    }

    const before = forceRefreshEnabled;
    forceRefreshEnabled = enabled;

    await logAudit(req, {
      action: "system.force_refresh",
      entityType: "system",
      entityId: "force-refresh",
      before: { enabled: before } as unknown as Record<string, unknown>,
      after: { enabled } as unknown as Record<string, unknown>,
    });

    logger.info(
      { triggeredBy: req.user!.id, enabled, event: "force_refresh_toggled" },
      `force refresh ${enabled ? "enabled" : "disabled"}`,
    );

    res.json({ enabled: forceRefreshEnabled, message: `Force refresh ${enabled ? "enabled" : "disabled"}` });
  },
);

export default router;
