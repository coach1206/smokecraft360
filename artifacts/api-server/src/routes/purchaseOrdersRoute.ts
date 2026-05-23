/**
 * purchaseOrdersRoute — purchase order creation and listing.
 *
 * POST /api/purchase-orders  — create a purchase order (kiosk-open)
 * GET  /api/purchase-orders  — list recent purchase orders
 */

import { Router } from "express";
import { db }     from "@workspace/db";
import { purchaseOrdersTable } from "@workspace/db/schema";
import { desc }   from "drizzle-orm";

const router = Router();

router.post("/purchase-orders", async (req, res) => {
  try {
    const { vendorId, productId, quantity, sku, notes } = req.body as {
      vendorId: string; productId: string; quantity: number;
      sku?: string; notes?: string;
    };

    if (!productId?.trim()) {
      res.status(400).json({ error: "productId required" }); return;
    }
    const qty = Math.max(1, Math.round(Number(quantity) || 1));

    const [row] = await db.insert(purchaseOrdersTable).values({
      vendorId:  vendorId?.trim()  || "auto",
      productId: productId.trim(),
      quantity:  qty,
      status:    "pending",
    }).returning();

    res.status(201).json({ order: row });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.get("/purchase-orders", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(purchaseOrdersTable)
      .orderBy(desc(purchaseOrdersTable.createdAt))
      .limit(50);
    res.json({ orders: rows });
  } catch {
    res.json({ orders: [] });
  }
});

export default router;
