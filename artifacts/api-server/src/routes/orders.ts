/**
 * Orders routes
 *
 * POST   /api/orders           — place an order (auth optional — guest orders supported)
 * GET    /api/orders           — list orders for dashboard (auth required, manager+)
 * PATCH  /api/orders/:id/status — update order status    (auth required, manager+ or staff)
 * GET    /api/orders/mine       — get own orders          (auth required)
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc, inArray, and, sql }                        from "drizzle-orm";
import { db, ordersTable, auditLogTable, venueInventoryTable } from "@workspace/db";
import { updateStockCache }                                   from "../services/venueInventoryStore";
import { verifyToken }                                        from "../lib/jwt";
import { requireAuth, type AuthRequest }                      from "../middleware/auth";
import { requireRole }                                        from "../middleware/roles";
import { allowOnly }                                          from "../middleware/sanitize";
import { checkLicenseForVenue }                               from "../middleware/license";
import { requireDeviceBinding }                                from "../middleware/deviceTouch";
import { deriveOrderAttribution }                             from "../services/campaignAttribution";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function safeUuid(v: string | undefined | null): string | undefined {
  return v && UUID_RE.test(v) ? v : undefined;
}

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
      cigarId?:      string;
      cigarName?:    string;
      drinkId?:      string;
      drinkName?:    string;
      foodId?:       string;
      foodName?:     string;
      orderType?:    string;
      tableNumber?:  string;
      venueId?:      string;
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

    const productIds = [cigarId, drinkId, foodId].filter((p): p is string => !!p);
    const attribution = deriveOrderAttribution(productIds);

    const [order] = await db.insert(ordersTable).values({
      userId:               safeUuid(userId),
      venueId:              safeUuid(venueId),
      cigarId:              cigarId   ?? undefined,
      cigarName:            cigarName ?? undefined,
      drinkId:              drinkId   ?? undefined,
      drinkName:            drinkName ?? undefined,
      foodId:               foodId    ?? undefined,
      foodName:             foodName  ?? undefined,
      orderType:            orderType as OrderType,
      status:               "pending",
      tableNumber:          tableNumber ?? undefined,
      brandId:              safeUuid(attribution.brandId),
      brandName:            attribution.brandName ?? undefined,
      campaignId:           safeUuid(attribution.campaignId),
      sponsored:            attribution.sponsored,
      campaignType:         attribution.campaignType ?? undefined,
      attributionSource:    attribution.attributionSource ?? undefined,
      campaignDiscountCents:attribution.campaignDiscountCents ?? undefined,
      campaignXpMultiplier: attribution.campaignXpMultiplier ?? undefined,
    }).returning();

    req.log.info({ orderId: order.id, orderType, userId }, "order created");

    /* Decrement inventory for every product on the order that the venue
     * actually tracks. We never fail the order on a missed decrement —
     * unconfigured / legacy venues simply have no inventory row, and a
     * blocked order on a DB hiccup would be a worse customer outcome
     * than a stock count drifting by one. */
    if (venueId) {
      const productIds = [cigarId, drinkId, foodId].filter((p): p is string => !!p);
      for (const productId of productIds) {
        try {
          const [updated] = await db
            .update(venueInventoryTable)
            .set({
              quantity:  sql`GREATEST(0, ${venueInventoryTable.quantity} - 1)`,
              updatedAt: new Date(),
            })
            .where(and(
              eq(venueInventoryTable.venueId,   venueId),
              eq(venueInventoryTable.productId, productId),
            ))
            .returning();
          if (updated) {
            updateStockCache(venueId, productId, {
              quantity:  updated.quantity,
              available: updated.available && updated.quantity > 0,
            });
          }
        } catch (err) {
          req.log.warn({ err, venueId, productId }, "inventory decrement failed (non-fatal)");
        }
      }
    }

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
    const venueId = req.user!.venueId;

    const conditions = [];

    if (req.user!.role !== "super_admin") {
      if (!venueId) {
        res.status(403).json({ error: "No venue context" });
        return;
      }
      conditions.push(eq(ordersTable.venueId, venueId));
    }

    if (status && (VALID_STATUSES as readonly string[]).includes(status)) {
      conditions.push(eq(ordersTable.status, status as OrderStatus));
    }

    let query = db.select().from(ordersTable).$dynamic();
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
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

      if (req.user!.role !== "super_admin" && current.venueId && req.user!.venueId !== current.venueId) {
        return { error: "forbidden" as const };
      }

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
        forbidden:          [403, "Order belongs to a different venue"],
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

// ── In-memory idempotency store (10-minute TTL) ──────────────────────────────
// Prevents duplicate charges from rapid taps or network retries.
// Each idempotencyKey is a UUID generated client-side per checkout attempt.
const idemStore = new Map<string, number>();
const IDEM_TTL_MS = 10 * 60 * 1000;

function isDuplicateRequest(key: string): boolean {
  const now = Date.now();
  // Evict expired entries on each check (bounded by order rate)
  for (const [k, ts] of idemStore) {
    if (now - ts > IDEM_TTL_MS) idemStore.delete(k);
  }
  if (idemStore.has(key)) return true;
  idemStore.set(key, now);
  return false;
}

// ── POST /api/orders/basket ───────────────────────────────────────────────────
/**
 * Multi-item basket checkout.
 *
 * Accepts an items array from the POS cart, maps the first item per category
 * to the existing ordersTable columns (cigarId/drinkId/foodId), decrements
 * venue inventory for every item, and enforces idempotency to prevent
 * duplicate charges from rapid taps or network retries.
 */
router.post(
  "/basket",
  async (req: Request, res: Response) => {
    const { items, venueId, idempotencyKey, orderType, rewardApplied } = req.body as {
      items?: Array<{
        productId: string;
        name:      string;
        category:  string;
        quantity:  number;
        unitPrice: number;
      }>;
      venueId?:        string;
      idempotencyKey?: string;
      orderType?:      string;
      rewardApplied?:  boolean;
    };

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items array is required and must not be empty" });
      return;
    }

    // Idempotency gate — reject duplicate checkout requests
    if (idempotencyKey) {
      if (isDuplicateRequest(idempotencyKey)) {
        res.status(409).json({ error: "Duplicate request — this checkout has already been processed" });
        return;
      }
    }

    const userId = await tryGetUserId(req);

    // Map basket to existing table columns (first match per category)
    const cigar = items.find(i => i.category === "cigar");
    const drink = items.find(i =>
      i.category === "spirit" || i.category === "alcohol" ||
      i.category === "beer"   || i.category === "wine"
    );
    const food  = items.find(i => i.category === "food");

    const type = orderType && (VALID_TYPES as readonly string[]).includes(orderType)
      ? orderType as OrderType
      : "table";

    const rawCents   = items.reduce((s, i) => s + Math.round(i.unitPrice * i.quantity * 100), 0);
    const finalCents = rewardApplied ? Math.round(rawCents * 0.9) : rawCents;

    const productIds = [cigar?.productId, drink?.productId, food?.productId]
      .filter((p): p is string => !!p);
    const attribution = deriveOrderAttribution(productIds);

    const [order] = await db.insert(ordersTable).values({
      userId:               safeUuid(userId),
      venueId:              safeUuid(venueId),
      cigarId:              cigar?.productId ?? undefined,
      cigarName:            cigar?.name ?? undefined,
      drinkId:              drink?.productId ?? undefined,
      drinkName:            drink?.name ?? undefined,
      foodId:               food?.productId ?? undefined,
      foodName:             food?.name ?? undefined,
      orderType:            type,
      status:               "paid",
      brandId:              safeUuid(attribution.brandId),
      brandName:            attribution.brandName ?? undefined,
      campaignId:           safeUuid(attribution.campaignId),
      sponsored:            attribution.sponsored,
      campaignType:         attribution.campaignType ?? undefined,
      attributionSource:    attribution.attributionSource ?? undefined,
      campaignDiscountCents:attribution.campaignDiscountCents ?? undefined,
      campaignXpMultiplier: attribution.campaignXpMultiplier ?? undefined,
    }).returning();

    req.log.info({ orderId: order.id, itemCount: items.length, userId, venueId }, "basket order created");

    // Decrement inventory for every item — non-fatal on failure
    if (venueId) {
      for (const item of items) {
        try {
          const [updated] = await db
            .update(venueInventoryTable)
            .set({
              quantity:  sql`GREATEST(0, ${venueInventoryTable.quantity} - ${item.quantity})`,
              updatedAt: new Date(),
            })
            .where(and(
              eq(venueInventoryTable.venueId,   venueId),
              eq(venueInventoryTable.productId, item.productId),
            ))
            .returning();
          if (updated) {
            updateStockCache(venueId, item.productId, {
              quantity:  updated.quantity,
              available: updated.available && updated.quantity > 0,
            });
          }
        } catch (err) {
          req.log.warn({ err, venueId, productId: item.productId }, "basket inventory decrement failed (non-fatal)");
        }
      }
    }

    res.status(201).json({ ...order, totalCents: finalCents });
  },
);

export default router;
