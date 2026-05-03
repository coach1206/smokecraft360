/**
 * Orders routes
 *
 * POST   /api/orders           — place an order (auth optional — guest orders supported)
 * GET    /api/orders           — list orders for dashboard (auth required, manager+)
 * PATCH  /api/orders/:id/status — update order status    (auth required, manager+ or staff)
 * GET    /api/orders/mine       — get own orders          (auth required)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, inArray }                                  from "drizzle-orm";
import { db, ordersTable, auditLogTable }                     from "@workspace/db";
import { verifyToken }                                        from "../lib/jwt";
import { requireAuth, type AuthRequest }                      from "../middleware/auth";
import { requireRole }                                        from "../middleware/roles";
import { allowOnly }                                          from "../middleware/sanitize";
import { checkLicenseForVenue }                               from "../middleware/license";
import { requireDeviceBinding }                                from "../middleware/deviceTouch";

const router: IRouter = Router();

const VALID_TYPES   = ["table", "pickup", "delivery"] as const;
const VALID_STATUSES = [
  "initiated", "pending", "in_progress", "completed", "cancelled",
  "paid", "fulfilled", "refunded",
] as const;

type OrderType   = (typeof VALID_TYPES)[number];
type OrderStatus = (typeof VALID_STATUSES)[number];

// ── Strict order state machine (production hardening) ──────────────────────
// Webhook is the only authority for `paid` and `refunded`; this map is what
// staff/manager are allowed to do via PATCH /:id/status.
const STAFF_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  initiated:   ["pending", "cancelled"],
  pending:     ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  paid:        ["fulfilled"],            // refund must come from Stripe webhook
  fulfilled:   [],                        // terminal for staff
  completed:   [],                        // legacy terminal
  cancelled:   [],                        // terminal
  refunded:    [],                        // terminal — webhook authority only
};

/** Try to extract userId from an optional Bearer token — never throws. */
async function tryGetUserId(req: Request): Promise<string | null> {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = await verifyToken(header.slice(7));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

// ── POST /api/orders ──────────────────────────────────────────────────────────
router.post(
  "/",
  allowOnly("cigarId", "cigarName", "drinkId", "drinkName", "foodId", "foodName",
            "orderType", "tableNumber", "venueId"),
  // Device-binding gate — when the kiosk sends X-Device-Id, the device row
  // must exist, be active, and belong to the same venue. Dashboard manual
  // orders that omit the header still pass through (legacy compatibility).
  requireDeviceBinding,
  async (req: Request, res: Response) => {
    // License gate (kiosk endpoint — no auth, so we check the venueId in the body).
    const bodyVenueId = typeof req.body?.venueId === "string" ? req.body.venueId : null;
    if (bodyVenueId) {
      try {
        const lic = await checkLicenseForVenue(bodyVenueId);
        if (!lic.allowed) {
          res.status(402).json({
            error:  "Subscription required",
            status: lic.status,
            plan:   lic.plan,
            hint:   "Renew the venue subscription to restore ordering",
          });
          return;
        }
        if (lic.warning === "past_due") res.setHeader("X-License-Warning", "past_due");
      } catch (err) {
        req.log.error({ err, venueId: bodyVenueId }, "License check failed for order");
        // Fail open on internal error — never block kiosk ordering on a DB blip.
      }
    }

    const { cigarId, cigarName, drinkId, drinkName, foodId, foodName,
            orderType, tableNumber, venueId } = req.body as {
      cigarId?:    string;
      cigarName?:  string;
      drinkId?:    string;
      drinkName?:  string;
      foodId?:     string;
      foodName?:   string;
      orderType?:  string;
      tableNumber?: string;
      venueId?:    string;
    };

    if (!orderType || !(VALID_TYPES as readonly string[]).includes(orderType)) {
      res.status(400).json({ error: `"orderType" must be one of: ${VALID_TYPES.join(", ")}` });
      return;
    }
    if (!cigarId && !drinkId && !foodId) {
      res.status(400).json({ error: "At least one of cigarId, drinkId, or foodId is required" });
      return;
    }

    const userId = await tryGetUserId(req);

    const [order] = await db.insert(ordersTable).values({
      userId:      userId     ?? undefined,
      venueId:     venueId   ?? undefined,
      cigarId:     cigarId   ?? undefined,
      cigarName:   cigarName ?? undefined,
      drinkId:     drinkId   ?? undefined,
      drinkName:   drinkName ?? undefined,
      foodId:      foodId    ?? undefined,
      foodName:    foodName  ?? undefined,
      orderType:   orderType as OrderType,
      status:      "pending",
      tableNumber: tableNumber ?? undefined,
    }).returning();

    req.log.info({ orderId: order.id, orderType, userId }, "order created");
    res.status(201).json(order);
  },
);

// ── GET /api/orders/mine ──────────────────────────────────────────────────────
router.get(
  "/mine",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const orders = await db
      .select()
      .from(ordersTable)
      .where(eq(ordersTable.userId, req.user!.id))
      .orderBy(desc(ordersTable.createdAt))
      .limit(20);

    res.json(orders);
  },
);

// ── GET /api/orders ───────────────────────────────────────────────────────────
router.get(
  "/",
  requireAuth,
  requireRole("venue_owner", "manager", "staff"),
  async (req: AuthRequest, res: Response) => {
    const { status } = req.query as { status?: string };

    let query = db.select().from(ordersTable).$dynamic();

    if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
      query = query.where(
        inArray(ordersTable.status, [status as OrderStatus]),
      );
    }

    const orders = await query.orderBy(desc(ordersTable.createdAt)).limit(100);
    res.json(orders);
  },
);

// ── PATCH /api/orders/:id/status ──────────────────────────────────────────────
router.patch(
  "/:id/status",
  requireAuth,
  requireRole("venue_owner", "manager", "staff"),
  allowOnly("status"),
  async (req: AuthRequest, res: Response) => {
    const id         = String(req.params.id ?? "");
    const { status } = req.body as { status?: string };

    if (!status || !(VALID_STATUSES as readonly string[]).includes(status)) {
      res.status(400).json({ error: `"status" must be one of: ${VALID_STATUSES.join(", ")}` });
      return;
    }

    // Read current state inside a transaction so the transition check is atomic.
    const result = await db.transaction(async (tx) => {
      const [current] = await tx.select().from(ordersTable).where(eq(ordersTable.id, id)).limit(1);
      if (!current) return { error: "not_found" as const };

      const from = current.status as OrderStatus;
      const to   = status as OrderStatus;

      // Staff may not move into webhook-authority states.
      if (to === "paid" || to === "refunded") {
        return { error: "webhook_only" as const, from };
      }
      if (from === to) return { error: "noop" as const, from };
      if (!STAFF_TRANSITIONS[from].includes(to)) {
        return { error: "invalid_transition" as const, from };
      }

      // Release escrow when fulfilled.
      const fundsStatus =
        to === "fulfilled" ? "released" as const :
        to === "cancelled" ? "refunded" as const :
        current.fundsStatus;

      const [updated] = await tx
        .update(ordersTable)
        .set({ status: to, fundsStatus, updatedAt: new Date() })
        .where(eq(ordersTable.id, id))
        .returning();

      // Audit log — full before/after for traceability.
      await tx.insert(auditLogTable).values({
        actorId:     req.user?.id ?? null,
        actorRole:   req.user?.role ?? null,
        action:      "order.status.update",
        entityType:  "order",
        entityId:    id,
        beforeState: { status: from, fundsStatus: current.fundsStatus },
        afterState:  { status: to,   fundsStatus },
        venueId:     current.venueId ?? null,
      });

      return { updated };
    });

    if ("error" in result) {
      const map: Record<string, [number, string]> = {
        not_found:          [404, "Order not found"],
        webhook_only:       [403, `Status "${status}" can only be set by Stripe webhook`],
        noop:               [400, `Order already in status "${status}"`],
        invalid_transition: [422, `Invalid transition from "${(result as { from?: string }).from}" → "${status}"`],
      };
      const [code, msg] = map[String(result.error)]!;
      res.status(code).json({ error: msg, from: (result as { from?: string }).from });
      return;
    }

    req.log.info({ orderId: id, status, userId: req.user?.id }, "order status updated");
    res.json(result.updated);
  },
);

export default router;
