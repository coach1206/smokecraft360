/**
 * supply360 — Sovereign Supply Chain & Verification Ledger routes.
 *
 * GET  /api/supply/inventory/:venueId   — current stock entries for a venue
 * POST /api/supply/mutation             — log a stock mutation + broadcast
 * GET  /api/supply/ledger/:venueId      — recent ledger entries (last 50)
 *
 * Every mutation:
 *   1. Upserts supply_chain_entries (current quantity + status).
 *   2. Appends to supply_verification_ledger (immutable audit row).
 *   3. Publishes SUPPLY_LEDGER_MUTATION on the "supply" pgPubSub channel
 *      → Socket.IO bridge relays it to ops:<venueId> rooms
 *      → Command Center Supply Chain tab renders with 0ms visual latency.
 */

import { Router, type Request, type Response } from "express";
import { z }                                   from "zod";
import { db }                                  from "@workspace/db";
import {
  supplyChainEntriesTable,
  supplyVerificationLedgerTable,
} from "@workspace/db/schema";
import { pgPubSub }  from "../realtime/pgPubSub";
import { logger }    from "../lib/logger";
import { eq, desc }  from "drizzle-orm";

const router = Router();

// ── Schemas ───────────────────────────────────────────────────────────────────

const MutationSchema = z.object({
  venueId:      z.string().uuid(),
  sku:          z.string().min(1).max(80),
  productName:  z.string().min(1).max(200),
  category:     z.string().min(1).max(80),
  mutationType: z.enum([
    "restock", "depletion", "back_order", "allocation",
    "deallocation", "verification", "adjustment", "transfer",
  ]),
  quantityDelta: z.number().int(),
  unit:          z.string().max(40).default("units"),
  supplierRef:   z.string().max(120).optional(),
  orderRef:      z.string().max(120).optional(),
  operatorId:    z.string().max(200).optional(),
  operatorRole:  z.string().max(80).optional(),
  metadata:      z.record(z.unknown()).optional(),
});

// ── GET /api/supply/inventory/:venueId ────────────────────────────────────────

router.get("/inventory/:venueId", async (req: Request, res: Response) => {
  const venueId = String(req.params["venueId"] ?? "");
  if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }

  try {
    const entries = await db
      .select()
      .from(supplyChainEntriesTable)
      .where(eq(supplyChainEntriesTable.venueId, venueId))
      .orderBy(desc(supplyChainEntriesTable.lastMutatedAt))
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

  const {
    venueId, sku, productName, category, mutationType,
    quantityDelta, unit, supplierRef, orderRef, operatorId, operatorRole, metadata,
  } = parse.data;

  try {
    // 1. Fetch existing entry (or default to 0)
    const [existing] = await db
      .select()
      .from(supplyChainEntriesTable)
      .where(eq(supplyChainEntriesTable.venueId, venueId))
      .limit(1);

    const previousQuantity = existing?.quantityOnHand ?? 0;
    const newQuantity      = Math.max(0, previousQuantity + quantityDelta);

    const status = newQuantity === 0
      ? "back_ordered" as const
      : newQuantity <= (existing?.reorderThreshold ?? 5)
        ? "low_stock" as const
        : mutationType === "back_order"
          ? "back_ordered" as const
          : mutationType === "allocation"
            ? "allocated" as const
            : "in_stock" as const;

    // 2. Upsert supply_chain_entries
    const [entry] = await db
      .insert(supplyChainEntriesTable)
      .values({
        venueId, sku, productName, category, unit,
        quantityOnHand: newQuantity,
        status,
        supplierRef, orderRef,
        lastMutatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [supplyChainEntriesTable.venueId, supplyChainEntriesTable.sku],
        set: {
          quantityOnHand: newQuantity,
          status,
          supplierRef,
          orderRef,
          lastMutatedAt: new Date(),
        },
      })
      .returning();

    // 3. Append to verification ledger
    const [ledgerRow] = await db
      .insert(supplyVerificationLedgerTable)
      .values({
        entryId:          entry.id,
        venueId,
        mutationType,
        quantityDelta,
        previousQuantity,
        newQuantity,
        operatorId,
        operatorRole,
        supplierRef,
        orderRef,
        metadata:         metadata ?? {},
        broadcastedAt:    new Date(),
      })
      .returning();

    // 4. Broadcast SUPPLY_LEDGER_MUTATION → ops:<venueId> Command Center tab
    await pgPubSub.publish("supply", {
      event:            "SUPPLY_LEDGER_MUTATION",
      venueId,
      ledgerId:         ledgerRow.id,
      entryId:          entry.id,
      sku,
      productName,
      category,
      mutationType,
      quantityDelta,
      previousQuantity,
      newQuantity,
      status,
      operatorId:       operatorId ?? null,
      broadcastedAt:    ledgerRow.broadcastedAt?.toISOString() ?? new Date().toISOString(),
    }).catch(() => {}); // non-fatal — rows already persisted

    req.log.info({ entryId: entry.id, sku, mutationType, newQuantity, venueId }, "supply360: mutation applied");

    res.status(201).json({
      entryId:   entry.id,
      ledgerId:  ledgerRow.id,
      sku,
      newQuantity,
      status,
      broadcastedAt: ledgerRow.broadcastedAt?.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "supply360: mutation failed");
    res.status(500).json({ error: "Mutation failed" });
  }
});

// ── GET /api/supply/ledger/:venueId ──────────────────────────────────────────

router.get("/ledger/:venueId", async (req: Request, res: Response) => {
  const venueId = String(req.params["venueId"] ?? "");
  const limit = Math.min(Number(req.query["limit"] ?? 50), 200);

  if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }

  try {
    const entries = await db
      .select()
      .from(supplyVerificationLedgerTable)
      .where(eq(supplyVerificationLedgerTable.venueId, venueId))
      .orderBy(desc(supplyVerificationLedgerTable.createdAt))
      .limit(limit);

    res.json({ entries, count: entries.length });
  } catch (err) {
    logger.error({ err, venueId }, "supply360: ledger fetch failed");
    res.status(500).json({ error: "Ledger fetch failed" });
  }
});

export default router;
