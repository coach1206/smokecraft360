/**
 * posOrders.ts — Live POS order ingestion endpoint.
 *
 * POST /api/pos/order
 *   Body: { orderType: "cigar"|"whiskey"|"beer"|"vape", items?: unknown[] }
 *
 * Broadcasts a `pos_order` Socket.io event to all connected kiosk clients so
 * the Dynamic Visual Card Engine can re-rank scenes in real-time based on
 * what was just ordered at the POS terminal.
 *
 * In production this is called by the venue's POS integration (Toast, Square,
 * Lightspeed, etc.). During development the kiosk's LiveEngineController also
 * calls it directly via a simulated interval so the engine works without a
 * live POS.
 */

import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { getIO } from "../lib/socketServer";

const router = Router();

const ORDER_TYPES = ["cigar", "whiskey", "beer", "vape"] as const;

const PosOrderSchema = z.object({
  orderType: z.enum(ORDER_TYPES),
  items:     z.array(z.unknown()).optional(),
  venueId:   z.string().uuid().optional(),
  tableId:   z.string().optional(),
});

router.post("/pos/order", (req: Request, res: Response) => {
  const parsed = PosOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid order payload", details: parsed.error.flatten() });
    return;
  }

  const { orderType, items, venueId, tableId } = parsed.data;

  try {
    const io = getIO();
    const payload = { orderType, items, venueId, tableId, ts: Date.now() };
    io.emit("pos_order", payload);
    req.log.info({ orderType, venueId }, "POS order broadcast");
    res.json({ success: true, broadcast: io.engine.clientsCount });
  } catch (err) {
    // Socket.io not yet ready (unlikely but safe to handle)
    req.log.warn({ err }, "Socket.io not ready for POS broadcast");
    res.status(503).json({ error: "Real-time engine not ready" });
  }
});

export default router;
