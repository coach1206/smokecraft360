/**
 * swipeOrders — Add-to-Order pipeline for the Universal Swipe Experience Engine.
 *
 * POST /api/swipe-orders                     — create/add to order
 * GET  /api/swipe-orders/session/:sessionId  — get order for session
 * POST /api/swipe-orders/:orderId/confirm    — confirm order
 * POST /api/swipe-orders/:orderId/cancel     — cancel + release reservations
 *
 * ATOMICITY: the critical write path (getOrCreateOrder → upsert item →
 * recalculate subtotal → create reservation) runs inside a single
 * db.transaction(). All four writes succeed or all roll back together,
 * preventing partial-reservation ghost state.
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, lt, count } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  swipeOrdersTable,
  swipeOrderItemsTable,
  inventoryReservationsTable,
  analyticsEventsTable,
  venueInventoryTable,
} from "@workspace/db";
import { type AuthRequest }     from "../middleware/auth";
import { dispatchNeuralBridge } from "../lib/neuralBridge";

const router: IRouter = Router();

const RESERVATION_TTL_MINUTES = 15;

// ── helpers ───────────────────────────────────────────────────────────────────

async function releaseExpiredReservations(): Promise<void> {
  await db
    .update(inventoryReservationsTable)
    .set({ releasedAt: new Date() })
    .where(
      and(
        lt(inventoryReservationsTable.expiresAt, new Date()),
        eq(inventoryReservationsTable.releasedAt, null as unknown as Date),
      )
    );
}

// ── POST /api/swipe-orders ────────────────────────────────────────────────────

const addItemSchema = z.object({
  sessionId:     z.string().uuid(),
  inventoryId:   z.string(),
  inventoryName: z.string().min(1).max(200),
  quantity:      z.number().int().min(1).max(20).default(1),
  priceCents:    z.number().int().min(0).default(0),
  tags:          z.array(z.string()).default([]),
  craftType:     z.enum(["smoke", "pour", "brew", "vape"]).optional(),
  venueId:       z.string().uuid().optional(),
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const parsed = addItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid payload" });
    return;
  }

  const { sessionId, inventoryId, inventoryName, quantity, priceCents, tags, craftType, venueId } = parsed.data;
  const userId = req.user?.id ?? null;

  // Release expired reservations — fire-and-forget, non-blocking
  releaseExpiredReservations().catch(() => {});

  // ── Stock check (pre-transaction read) ─────────────────────────────────────
  let availableQty = 999;
  try {
    const [inv] = await db
      .select({ quantity: venueInventoryTable.quantity, available: venueInventoryTable.available })
      .from(venueInventoryTable)
      .where(eq(venueInventoryTable.productId, inventoryId))
      .limit(1);

    if (inv) {
      if (!inv.available) {
        res.status(409).json({ error: "Item is not available" });
        return;
      }
      availableQty = inv.quantity;
    }
  } catch { /* no venue inventory record — open item, proceed */ }

  // Count active reservations for this item
  const activeReservations = await db
    .select({ qty: inventoryReservationsTable.quantity })
    .from(inventoryReservationsTable)
    .where(
      and(
        eq(inventoryReservationsTable.inventoryId, inventoryId),
        eq(inventoryReservationsTable.releasedAt, null as unknown as Date),
      )
    );
  const reservedQty  = activeReservations.reduce((s, r) => s + r.qty, 0);
  const effectiveQty = availableQty - reservedQty;

  if (effectiveQty < quantity) {
    res.status(409).json({ error: "Insufficient stock", available: effectiveQty, requested: quantity });
    return;
  }

  // ── Atomic write: order + item + subtotal + reservation ────────────────────
  let updatedOrder!: typeof swipeOrdersTable.$inferSelect;
  let orderItem!:    typeof swipeOrderItemsTable.$inferSelect;
  let reservation!:  typeof inventoryReservationsTable.$inferSelect;

  try {
    await db.transaction(async (tx) => {
      // 1. Get or create pending order for this session
      const [existing] = await tx
        .select()
        .from(swipeOrdersTable)
        .where(and(
          eq(swipeOrdersTable.sessionId, sessionId),
          eq(swipeOrdersTable.status, "pending"),
        ));

      let order: typeof swipeOrdersTable.$inferSelect;
      if (existing) {
        order = existing;
      } else {
        const [created] = await tx
          .insert(swipeOrdersTable)
          .values({
            userId:   userId ?? undefined,
            sessionId,
            venueId:  venueId ?? undefined,
            status:   "pending",
            subtotal: 0,
          })
          .returning();
        order = created!;
      }

      // 2. Upsert order item
      const [existingItem] = await tx
        .select()
        .from(swipeOrderItemsTable)
        .where(and(
          eq(swipeOrderItemsTable.orderId, order.id),
          eq(swipeOrderItemsTable.inventoryId, inventoryId),
        ));

      if (existingItem) {
        const newQty = existingItem.quantity + quantity;
        const [updated] = await tx
          .update(swipeOrderItemsTable)
          .set({ quantity: newQty, totalCents: priceCents * newQty })
          .where(eq(swipeOrderItemsTable.id, existingItem.id))
          .returning();
        orderItem = updated!;
      } else {
        const [inserted] = await tx
          .insert(swipeOrderItemsTable)
          .values({
            orderId:    order.id,
            inventoryId,
            inventoryName,
            quantity,
            priceCents,
            totalCents: priceCents * quantity,
            tags,
            craftType,
          })
          .returning();
        orderItem = inserted!;
      }

      // 3. Recalculate order subtotal from all items
      const allItems = await tx
        .select({ total: swipeOrderItemsTable.totalCents })
        .from(swipeOrderItemsTable)
        .where(eq(swipeOrderItemsTable.orderId, order.id));
      const newSubtotal = allItems.reduce((s, i) => s + i.total, 0);

      const [uo] = await tx
        .update(swipeOrdersTable)
        .set({ subtotal: newSubtotal, updatedAt: new Date() })
        .where(eq(swipeOrdersTable.id, order.id))
        .returning();
      updatedOrder = uo!;

      // 4. Create inventory reservation (expires in TTL minutes)
      const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);
      const [res] = await tx
        .insert(inventoryReservationsTable)
        .values({ inventoryId, sessionId, orderId: order.id, quantity, expiresAt })
        .returning();
      reservation = res!;
    });
  } catch (err) {
    req.log?.error({ err, sessionId, inventoryId }, "swipe order transaction failed");
    res.status(500).json({ error: "Order processing failed — please try again" });
    return;
  }

  // ── Post-commit side effects (fire-and-forget) ────────────────────────────
  if (userId) {
    db.insert(analyticsEventsTable).values({
      userId,
      eventType: "order_created",
      metadata:  { orderId: updatedOrder.id, inventoryId, craftType, priceCents, sessionId },
    }).catch(() => {});
  }

  req.log?.info({ orderId: updatedOrder.id, inventoryId, quantity }, "swipe order item added");

  dispatchNeuralBridge({
    type:      "swipe_order",
    userId:    userId ?? undefined,
    venueId:   venueId ?? undefined,
    sessionId,
    craftType,
    meta:      { inventoryId, inventoryName, priceCents, quantity },
  }).catch(() => {});

  res.status(201).json({
    order:    updatedOrder,
    item:     orderItem,
    reservation,
    feedback: `${inventoryName} added to your order`,
  });
});

// ── GET /api/swipe-orders/active-count ───────────────────────────────────────
// Returns the count of pending swipe orders for the caller's venue.
// Used by the Settings UI to warn admins before downgrading kernel mode.
//
// Tenant isolation:
//   - venue_owner: always scoped to their own venueId from the JWT
//   - super_admin: may pass ?venueId= to scope; without it returns global count
//   - unauthenticated / other roles: 401

router.get("/active-count", async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  let scopedVenueId: string | null = null;

  if (user.role === "super_admin") {
    const qv = req.query["venueId"];
    scopedVenueId = typeof qv === "string" && qv.length > 0 ? qv : null;
  } else if (user.role === "venue_owner" || user.role === "admin") {
    if (!user.venueId) {
      res.json({ count: 0 });
      return;
    }
    scopedVenueId = user.venueId;
  } else {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }

  const conditions = [eq(swipeOrdersTable.status, "pending")];
  if (scopedVenueId) {
    conditions.push(eq(swipeOrdersTable.venueId, scopedVenueId));
  }

  const [row] = await db
    .select({ total: count() })
    .from(swipeOrdersTable)
    .where(and(...conditions));

  res.json({ count: row?.total ?? 0 });
});

// ── GET /api/swipe-orders/session/:sessionId ──────────────────────────────────

router.get("/session/:sessionId", async (req: AuthRequest, res: Response) => {
  const sessionId = req.params["sessionId"] as string;

  const [order] = await db
    .select()
    .from(swipeOrdersTable)
    .where(eq(swipeOrdersTable.sessionId, sessionId))
    .orderBy(swipeOrdersTable.createdAt)
    .limit(1);

  if (!order) {
    res.json({ order: null, items: [] });
    return;
  }

  const items = await db
    .select()
    .from(swipeOrderItemsTable)
    .where(eq(swipeOrderItemsTable.orderId, order.id));

  res.json({ order, items });
});

// ── POST /api/swipe-orders/:orderId/confirm ───────────────────────────────────

router.post("/:orderId/confirm", async (req: AuthRequest, res: Response) => {
  const orderId = req.params["orderId"] as string;

  const [order] = await db
    .update(swipeOrdersTable)
    .set({ status: "confirmed", updatedAt: new Date() })
    .where(and(
      eq(swipeOrdersTable.id, orderId),
      eq(swipeOrdersTable.status, "pending"),
    ))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found or already processed" });
    return;
  }

  req.log?.info({ orderId }, "swipe order confirmed");
  res.json({ order });
});

// ── POST /api/swipe-orders/:orderId/cancel ────────────────────────────────────

router.post("/:orderId/cancel", async (req: AuthRequest, res: Response) => {
  const orderId = req.params["orderId"] as string;

  const [order] = await db
    .update(swipeOrdersTable)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(and(
      eq(swipeOrdersTable.id, orderId),
      eq(swipeOrdersTable.status, "pending"),
    ))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found or already processed" });
    return;
  }

  await db
    .update(inventoryReservationsTable)
    .set({ releasedAt: new Date() })
    .where(eq(inventoryReservationsTable.orderId, orderId));

  res.json({ order, message: "Order cancelled and stock released" });
});

export default router;
