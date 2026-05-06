/**
 * swipeOrders — Add-to-Order pipeline for the Universal Swipe Experience Engine.
 *
 * POST /api/swipe-orders                     — create/add to order
 * GET  /api/swipe-orders/session/:sessionId  — get order for session
 * POST /api/swipe-orders/:orderId/confirm    — confirm order
 * POST /api/swipe-orders/:orderId/cancel     — cancel + release reservations
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, lt } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  swipeOrdersTable,
  swipeOrderItemsTable,
  inventoryReservationsTable,
  analyticsEventsTable,
  productsTable,
  venueInventoryTable,
} from "@workspace/db";
import { type AuthRequest } from "../middleware/auth";

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

async function getOrCreateOrder(sessionId: string, userId: string | null, venueId: string | null) {
  const [existing] = await db
    .select()
    .from(swipeOrdersTable)
    .where(
      and(
        eq(swipeOrdersTable.sessionId, sessionId),
        eq(swipeOrdersTable.status, "pending"),
      )
    );
  if (existing) return existing;

  const [created] = await db
    .insert(swipeOrdersTable)
    .values({
      userId:   userId ?? undefined,
      sessionId,
      venueId:  venueId ?? undefined,
      status:   "pending",
      subtotal: 0,
    })
    .returning();
  return created!;
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

  // Release any expired reservations first
  await releaseExpiredReservations().catch(() => {});

  // Validate stock — check venue_inventory first, fallback to products table
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
  } catch { /* no venue inventory — proceed */ }

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
  const reservedQty = activeReservations.reduce((s, r) => s + r.qty, 0);
  const effectiveQty = availableQty - reservedQty;

  if (effectiveQty < quantity) {
    res.status(409).json({
      error:    "Insufficient stock",
      available: effectiveQty,
      requested: quantity,
    });
    return;
  }

  // Get or create the order
  const order = await getOrCreateOrder(sessionId, userId, venueId ?? null);

  // Check if item already in order — if so, update quantity
  const [existingItem] = await db
    .select()
    .from(swipeOrderItemsTable)
    .where(
      and(
        eq(swipeOrderItemsTable.orderId, order.id),
        eq(swipeOrderItemsTable.inventoryId, inventoryId),
      )
    );

  let orderItem;
  if (existingItem) {
    const newQty   = existingItem.quantity + quantity;
    const newTotal = priceCents * newQty;
    [orderItem] = await db
      .update(swipeOrderItemsTable)
      .set({ quantity: newQty, totalCents: newTotal })
      .where(eq(swipeOrderItemsTable.id, existingItem.id))
      .returning();
  } else {
    [orderItem] = await db
      .insert(swipeOrderItemsTable)
      .values({
        orderId:       order.id,
        inventoryId,
        inventoryName,
        quantity,
        priceCents,
        totalCents:    priceCents * quantity,
        tags,
        craftType,
      })
      .returning();
  }

  // Recalculate order subtotal
  const allItems = await db
    .select({ total: swipeOrderItemsTable.totalCents })
    .from(swipeOrderItemsTable)
    .where(eq(swipeOrderItemsTable.orderId, order.id));
  const newSubtotal = allItems.reduce((s, i) => s + i.total, 0);

  const [updatedOrder] = await db
    .update(swipeOrdersTable)
    .set({ subtotal: newSubtotal, updatedAt: new Date() })
    .where(eq(swipeOrdersTable.id, order.id))
    .returning();

  // Create inventory reservation
  const expiresAt = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);
  const [reservation] = await db
    .insert(inventoryReservationsTable)
    .values({
      inventoryId,
      sessionId,
      orderId:  order.id,
      quantity,
      expiresAt,
    })
    .returning();

  // Analytics event
  if (userId) {
    await db.insert(analyticsEventsTable).values({
      userId,
      eventType: "order_created",
      metadata:  { orderId: order.id, inventoryId, craftType, priceCents, sessionId },
    }).catch(() => {});
  }

  req.log?.info({ orderId: order.id, inventoryId, quantity }, "swipe order item added");

  res.status(201).json({
    order:       updatedOrder,
    item:        orderItem,
    reservation,
    feedback:    `${inventoryName} added to your order`,
  });
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
    .where(
      and(
        eq(swipeOrdersTable.id, orderId),
        eq(swipeOrdersTable.status, "pending"),
      )
    )
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
    .where(
      and(
        eq(swipeOrdersTable.id, orderId),
        eq(swipeOrdersTable.status, "pending"),
      )
    )
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found or already processed" });
    return;
  }

  // Release all reservations for this order
  await db
    .update(inventoryReservationsTable)
    .set({ releasedAt: new Date() })
    .where(eq(inventoryReservationsTable.orderId, orderId));

  res.json({ order, message: "Order cancelled and stock released" });
});

export default router;
