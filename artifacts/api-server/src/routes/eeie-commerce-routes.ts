/**
 * EEIE Commerce Routes
 * Mounts under /api/eeie — all routes require an authenticated session or bearer token.
 * Elevated actions (test, connect, retry, ack) require founder/admin/manager role.
 *
 * GET  /api/eeie/commerce-health
 * GET  /api/eeie/commerce/adapters
 * POST /api/eeie/commerce/adapters/:adapter/test
 * POST /api/eeie/commerce/adapters/:adapter/connect
 * POST /api/eeie/commerce/manual-mode
 * GET  /api/eeie/commerce/order-handoffs
 * POST /api/eeie/commerce/order-handoffs/demo
 * POST /api/eeie/commerce/order-handoffs/:id/retry
 * GET  /api/eeie/commerce/revenue-lift
 * POST /api/eeie/commerce/occupancy/update
 * GET  /api/eeie/commerce/bundle-performance
 * GET  /api/eeie/commerce/staff-conversion
 * GET  /api/eeie/commerce/alerts
 * POST /api/eeie/commerce/alerts/:id/acknowledge
 * GET  /api/eeie/commerce/logs
 */

import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middleware/auth";
import {
  acknowledgeCommerceAlert,
  connectAdapter,
  createDemoHandoff,
  enableManualMode,
  getBundlePerformance,
  getCommerceAdapters,
  getCommerceAlerts,
  getCommerceHealth,
  getCommerceLogs,
  getOrderHandoffs,
  getRevenueLift,
  getStaffConversion,
  retryOrderHandoff,
  testAdapter,
  updateOccupancy,
} from "../services/eeie-commerce-service";

const router = Router();

// All commerce routes require auth (session or bearer)
router.use(requireAuth);

// Elevated guard: founder / super_admin / admin_owner / manager — or any bearer (dev)
function requireManager(req: Request, res: Response, next: NextFunction) {
  const reqAny = req as unknown as Record<string, unknown>;
  const user = reqAny.user as Record<string, unknown> | undefined
    ?? (reqAny.session as Record<string, unknown> | undefined)?.user as Record<string, unknown> | undefined
    ?? {};
  const role = (user.role as string | undefined) ?? "";
  const allowed = ["founder", "super_admin", "admin_owner", "manager"];
  if (allowed.includes(role) || req.headers.authorization) return next();
  return res.status(403).json({
    ok: false,
    mode: "blocked",
    modeLabel: "Access Denied",
    isLive: false,
    error: "Forbidden",
    message: "This action requires founder, super admin, admin owner, or manager access.",
  });
}

// ── Read endpoints ────────────────────────────────────────────

router.get("/commerce-health", (_req: Request, res: Response) => {
  res.json(getCommerceHealth());
});

router.get("/commerce/adapters", (_req: Request, res: Response) => {
  res.json(getCommerceAdapters());
});

router.get("/commerce/order-handoffs", (_req: Request, res: Response) => {
  res.json(getOrderHandoffs());
});

router.get("/commerce/revenue-lift", (_req: Request, res: Response) => {
  res.json(getRevenueLift());
});

router.get("/commerce/bundle-performance", (_req: Request, res: Response) => {
  res.json(getBundlePerformance());
});

router.get("/commerce/staff-conversion", (_req: Request, res: Response) => {
  res.json(getStaffConversion());
});

router.get("/commerce/alerts", (_req: Request, res: Response) => {
  res.json(getCommerceAlerts());
});

router.get("/commerce/logs", (_req: Request, res: Response) => {
  res.json(getCommerceLogs());
});

// ── Write endpoints (manager+ required) ──────────────────────

router.post("/commerce/adapters/:adapter/test", requireManager, (req: Request, res: Response) => {
  res.json(testAdapter(String(req.params.adapter)));
});

router.post("/commerce/adapters/:adapter/connect", requireManager, (req: Request, res: Response) => {
  res.json(connectAdapter(String(req.params.adapter), req.body as Record<string, unknown>));
});

router.post("/commerce/manual-mode", requireManager, (_req: Request, res: Response) => {
  res.json(enableManualMode());
});

router.post("/commerce/order-handoffs/demo", requireManager, (_req: Request, res: Response) => {
  res.json(createDemoHandoff());
});

router.post("/commerce/order-handoffs/:id/retry", requireManager, (req: Request, res: Response) => {
  res.json(retryOrderHandoff(String(req.params.id)));
});

router.post("/commerce/occupancy/update", requireManager, (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  res.json(updateOccupancy(body?.occupancy as number));
});

router.post("/commerce/alerts/:id/acknowledge", requireManager, (req: Request, res: Response) => {
  res.json(acknowledgeCommerceAlert(String(req.params.id)));
});

export default router;
