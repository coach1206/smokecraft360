/**
 * eeisOrders — EEIS order lifecycle API.
 *
 * POST /api/eeis/orders             — create + push order to POS
 * GET  /api/eeis/orders/:orderId/events — full event timeline for order
 * GET  /api/eeis/orders/venue/:venueId  — recent orders for venue (admin)
 */

import { Router, type Response } from "express";
import { z } from "zod/v4";
import { db, eeisOrderEventsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole }                   from "../middleware/roles";
import { routeOrder }                    from "../integrations/services/posRouter";
import { buildUniversalOrder }           from "../integrations/schemas/universalOrder";
import { bufferOrder }                   from "../integrations/services/edgeSync";

const router = Router();

const createOrderSchema = z.object({
  venueId:          z.string().uuid(),
  sessionId:        z.string().uuid().optional(),
  guestProfileId:   z.string().uuid().optional(),
  craftType:        z.enum(["smoke", "pour", "brew", "vape"]).optional(),
  tableNumber:      z.string().max(20).optional(),
  notes:            z.string().max(500).optional(),
  idempotencyKey:   z.string().max(200).optional(),
  useOfflineBuffer: z.boolean().optional().default(false),
  items: z.array(z.object({
    posProductId:  z.string().min(1),
    eeisProductId: z.string().optional(),
    name:          z.string().min(1),
    quantity:      z.number().int().positive(),
    unitCents:     z.number().int().nonnegative(),
    sku:           z.string().optional(),
    category:      z.string().optional(),
  })).min(1),
  tipCents:      z.number().int().nonnegative().default(0),
  discountCents: z.number().int().nonnegative().default(0),
});

router.post("/eeis/orders", requireAuth, async (req: AuthRequest, res: Response) => {
  const parsed = createOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation_failed", details: parsed.error.issues });
    return;
  }

  const { items, tipCents, discountCents, useOfflineBuffer, ...rest } = parsed.data;

  const orderItems = items.map(i => ({
    ...i,
    totalCents: i.unitCents * i.quantity,
    modifiers:  [] as { name: string; priceCents: number }[],
    meta:       {} as Record<string, unknown>,
  }));

  const order = buildUniversalOrder({
    id:             crypto.randomUUID(),
    provider:       "eeis",
    userId:         req.user?.id,
    items:          orderItems,
    tipCents,
    discountCents,
    taxCents:       0,
    pairingContext: {},
    ...rest,
  });

  if (useOfflineBuffer) {
    await bufferOrder(order.venueId, order);
    res.json({ success: true, buffered: true, orderId: order.id, totalCents: order.totalCents });
    return;
  }

  const result = await routeOrder(order.venueId, order);

  res.status(result.success ? 200 : 202).json({
    success:         result.success,
    orderId:         order.id,
    externalOrderId: result.externalOrderId,
    provider:        result.provider,
    totalCents:      order.totalCents,
    error:           result.error,
  });
});

router.get("/eeis/orders/:orderId/events", requireAuth, async (req: AuthRequest, res: Response) => {
  const orderId = req.params["orderId"] as string;
  const events = await db.select()
    .from(eeisOrderEventsTable)
    .where(eq(eeisOrderEventsTable.orderId, orderId))
    .orderBy(eeisOrderEventsTable.createdAt);
  res.json({ events, orderId });
});

router.get("/eeis/orders/venue/:venueId", requireAuth, requireRole("venue_owner", "super_admin", "manager"), async (req: AuthRequest, res: Response) => {
  const venueId = req.params["venueId"] as string;
  const limit   = Math.min(parseInt(req.query["limit"] as string || "50", 10), 200);
  const events  = await db.select()
    .from(eeisOrderEventsTable)
    .where(eq(eeisOrderEventsTable.venueId, venueId))
    .orderBy(desc(eeisOrderEventsTable.createdAt))
    .limit(limit);
  res.json({ events, venueId });
});

export default router;
