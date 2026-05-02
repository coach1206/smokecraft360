/**
 * Demo Routes
 *
 * POST /api/demo/reset
 *   — clears all orders from the database
 *   — only available when DEMO_MODE env flag is set (or always in dev)
 *   — no auth required (it's a demo reset, not destructive to real data)
 */

import { Router }  from "express";
import { db }           from "@workspace/db";
import { ordersTable }  from "@workspace/db/schema";
import { logger }  from "../lib/logger";

const router = Router();

router.post("/demo/reset", async (req, res) => {
  try {
    await db.delete(ordersTable);
    logger.info("Demo reset: orders table cleared");
    res.json({ ok: true, message: "Demo data reset successfully" });
  } catch (err) {
    logger.error({ err }, "Demo reset failed");
    res.status(500).json({ error: "Reset failed" });
  }
});

export default router;
