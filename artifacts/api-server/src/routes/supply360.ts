/**
 * supply360 — Sovereign Supply Chain & Verification Ledger routes.
 *
 * GET  /api/supply/inventory/:venueId   — current stock entries for a venue
 * POST /api/supply/mutation             — transactional mutation + pgPubSub broadcast
 * GET  /api/supply/ledger/:venueId      — recent ledger entries (last 50)
 *
 * Mutation flow (single db.transaction):
 *   1. SELECT existing entry by (venueId, sku)
 *   2. UPDATE onHand in supply_chain_entries
 *   3. INSERT append-only row in supply_verification_ledger
 *   4. pgPubSub.publish("supply", SUPPLY_LEDGER_MUTATION) → ops:<venueId> Command Center
 */

import { Router, type Request, type Response } from "express";
import { z }                                   from "zod";
import { db }                                  from "@workspace/db";
import {
  supplyChainEntries,
  supplyVerificationLedger,
} from "@workspace/db/schema";
import { pgPubSub }  from "../realtime/pgPubSub";
import { logger }    from "../lib/logger";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

// ── Mutation schema ───────────────────────────────────────────────────────────

const MutationSchema = z.object({
  venueId:      z.string().min(1).max(64),
  sku:          z.string().min(1).max(128),
  mutationType: z.string().min(1).max(32),
  delta:        z.number().int(),
});

// ── GET /api/supply/inventory/:venueId ────────────────────────────────────────

router.get("/inventory/:venueId", async (req: Request, res: Response) => {
  const venueId = String(req.params["venueId"] ?? "");
  if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }

  try {
    const entries = await db
      .select()
      .from(supplyChainEntries)
      .where(eq(supplyChainEntries.venueId, venueId))
      .orderBy(desc(supplyChainEntries.updatedAt))
      .limit(200);

    res.json({ entries, count: entries.length });
  } catch (err) {
    logger.error({ err, venueId }, "supply360: inventory fetch failed");
    res.status(500).json({ error: "Inventory fetch failed" });
  }
});

// ── POST /api/supply/mutation ─────────────────────────────────────────────────

router.post("/mutation", async (req: Request, res: Response) => {
  const parse = MutationSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid payload", details: parse.error.flatten() });
    return;
  }

  const { venueId, sku, mutationType, delta } = parse.data;

  try {
    const targetLedgerFrame = await db.transaction(async (tx) => {
      // Fetch matching track allocation row
      const [existing] = await tx
        .select()
        .from(supplyChainEntries)
        .where(and(
          eq(supplyChainEntries.venueId, venueId),
          eq(supplyChainEntries.sku, sku),
        ));

      if (!existing) throw new Error("Target tracking element not found");

      const prevQty = existing.onHand;
      const newQty  = prevQty + delta;

      // Update the current structural stock matrix cache block
      await tx
        .update(supplyChainEntries)
        .set({ onHand: newQty, updatedAt: new Date() })
        .where(eq(supplyChainEntries.id, existing.id));

      // Build append-only verification log tracking card footprint
      const [ledgerRow] = await tx
        .insert(supplyVerificationLedger)
        .values({
          entryId:          existing.id,
          venueId,
          mutationType,
          quantityDelta:    delta,
          previousQuantity: prevQty,
          newQuantity:      newQty,
        })
        .returning();

      return { existing, ledgerRow };
    });

    // Fire the backend pgPubSub ledger sync signal instantly over channel 7 ("supply")
    await pgPubSub.publish("supply", {
      event:    "SUPPLY_LEDGER_MUTATION",
      venueId,
      sku,
      ledger:   targetLedgerFrame.ledgerRow as Record<string, unknown>,
    }).catch(() => {}); // non-fatal — transaction already committed

    req.log.info(
      { venueId, sku, mutationType, delta },
      "supply360: mutation committed + broadcast",
    );

    res.status(200).json({ success: true, data: targetLedgerFrame });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Mutation failed";
    logger.error({ err, venueId, sku }, "supply360: mutation failed");
    res.status(500).json({ success: false, error: message });
  }
});

// ── GET /api/supply/ledger/:venueId ──────────────────────────────────────────

router.get("/ledger/:venueId", async (req: Request, res: Response) => {
  const venueId = String(req.params["venueId"] ?? "");
  const limit   = Math.min(Number(req.query["limit"] ?? 50), 200);

  if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }

  try {
    const entries = await db
      .select()
      .from(supplyVerificationLedger)
      .where(eq(supplyVerificationLedger.venueId, venueId))
      .orderBy(desc(supplyVerificationLedger.broadcastedAt))
      .limit(limit);

    res.json({ entries, count: entries.length });
  } catch (err) {
    logger.error({ err, venueId }, "supply360: ledger fetch failed");
    res.status(500).json({ error: "Ledger fetch failed" });
  }
});

export default router;
