/**
 * noveeTransactions — Novee OS POS handoff ledger endpoint.
 *
 * POST /api/novee/transaction/submit
 *   Validates the payload, writes a row to `orders`, then broadcasts the
 *   event on the "orchestration" pgPubSub channel so every connected
 *   Command Center dashboard receives it in real time via Socket.IO.
 *
 * The route is intentionally public (no auth middleware) because it is
 * invoked from the kiosk guest experience layer.  Venue-level auth can be
 * layered on top once the kiosk identity system is wired.
 */

import { Router, type Request, type Response } from "express";
import { db, ordersTable }                     from "@workspace/db";
import { pgPubSub }                            from "../realtime/pgPubSub";
import { logger }                              from "../lib/logger";
import { z }                                   from "zod";

const router = Router();

const SubmitSchema = z.object({
  blendSelected:    z.string().min(1).max(200),
  vitola:           z.string().min(1).max(100),
  customEngraving:  z.string().max(120).default(""),
  guestId:          z.string().max(200).default(""),
  timestamp:        z.string().optional(),
  status:           z.string().optional(),
});

router.post("/submit", async (req: Request, res: Response) => {
  const parse = SubmitSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid payload", details: parse.error.flatten() });
    return;
  }

  const { blendSelected, vitola, customEngraving, guestId } = parse.data;

  try {
    const [order] = await db
      .insert(ordersTable)
      .values({
        cigarName:  `${blendSelected} — ${vitola}`,
        orderType:  "table",
        status:     "pending",
        brandName:  customEngraving || undefined,
        attributionSource: guestId ? `novee_guest:${guestId}` : "novee_kiosk",
      })
      .returning({ id: ordersTable.id });

    // Broadcast to all Command Center dashboards joined to the ops room
    await pgPubSub.publish("orchestration", {
      event:          "NOVEE_TRANSACTION_SUBMITTED",
      transactionId:  order.id,
      blendSelected,
      vitola,
      customEngraving,
      guestId,
      source:         "novee_pos_handoff",
    }).catch(() => {}); // non-fatal — ledger row already persisted

    req.log.info({ transactionId: order.id, blendSelected, vitola }, "Novee POS handoff submitted");

    res.json({ transactionId: order.id, status: "PENDING_POS_FULFILLMENT" });
  } catch (err) {
    logger.error({ err }, "noveeTransactions: submit failed");
    res.status(500).json({ error: "Transaction submission failed" });
  }
});

export default router;
