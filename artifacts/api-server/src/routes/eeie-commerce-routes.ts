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
import { requireAuth, optionalAuth } from "../middleware/auth";
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

// GET routes use optionalAuth — attaches req.user when a valid JWT is present,
// but never blocks. The EEIE frontend route guard already controls page access.
// POST (write) routes require a valid session + elevated role.

function requireManager(req: Request, res: Response, next: NextFunction) {
  const reqAny = req as unknown as Record<string, unknown>;
  const user = reqAny.user as Record<string, unknown> | undefined
    ?? (reqAny.session as Record<string, unknown> | undefined)?.user as Record<string, unknown> | undefined
    ?? {};
  const role = (user.role as string | undefined) ?? "";
  const allowed = ["founder", "super_admin", "admin_owner", "manager"];
  if (allowed.includes(role)) return next();
  return res.status(403).json({
    ok: false,
    mode: "blocked",
    modeLabel: "Access Denied",
    isLive: false,
    error: "Forbidden",
    message: "This action requires founder, super admin, admin owner, or manager access.",
  });
}

// ── Read endpoints (open — optionalAuth enriches req.user) ───

router.get("/commerce-health",         optionalAuth, (_req: Request, res: Response) => { res.json(getCommerceHealth());    });
router.get("/commerce/adapters",       optionalAuth, (_req: Request, res: Response) => { res.json(getCommerceAdapters());  });
router.get("/commerce/order-handoffs", optionalAuth, (_req: Request, res: Response) => { res.json(getOrderHandoffs());     });
router.get("/commerce/revenue-lift",   optionalAuth, (_req: Request, res: Response) => { res.json(getRevenueLift());       });
router.get("/commerce/bundle-performance", optionalAuth, (_req: Request, res: Response) => { res.json(getBundlePerformance()); });
router.get("/commerce/staff-conversion",   optionalAuth, (_req: Request, res: Response) => { res.json(getStaffConversion());    });
router.get("/commerce/alerts",         optionalAuth, (_req: Request, res: Response) => { res.json(getCommerceAlerts());    });
router.get("/commerce/logs",           optionalAuth, (_req: Request, res: Response) => { res.json(getCommerceLogs());      });

// ── Write endpoints (valid JWT + manager role required) ───────

router.post("/commerce/adapters/:adapter/test",    requireAuth, requireManager, (req: Request, res: Response) => { res.json(testAdapter(String(req.params.adapter)));                                              });
router.post("/commerce/adapters/:adapter/connect", requireAuth, requireManager, (req: Request, res: Response) => { res.json(connectAdapter(String(req.params.adapter), req.body as Record<string, unknown>));      });
router.post("/commerce/manual-mode",               requireAuth, requireManager, (_req: Request, res: Response) => { res.json(enableManualMode());                                                                   });
router.post("/commerce/order-handoffs/demo",       requireAuth, requireManager, (_req: Request, res: Response) => { res.json(createDemoHandoff());                                                                 });
router.post("/commerce/order-handoffs/:id/retry",  requireAuth, requireManager, (req: Request, res: Response) => { res.json(retryOrderHandoff(String(req.params.id)));                                            });
router.post("/commerce/occupancy/update",          requireAuth, requireManager, (req: Request, res: Response) => { res.json(updateOccupancy((req.body as Record<string, unknown>)?.occupancy as number));          });
router.post("/commerce/alerts/:id/acknowledge",    requireAuth, requireManager, (req: Request, res: Response) => { res.json(acknowledgeCommerceAlert(String(req.params.id)));                                      });

export default router;
