/**
 * posHealth — POS health monitoring dashboard API.
 */

import { Router, type Response } from "express";
import { db, posHealthLogsTable } from "@workspace/db";
import { eq, desc }              from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole }                   from "../middleware/roles";
import { getAllConnectionHealth, checkConnectionHealth } from "../integrations/services/posHealthMonitor";
import { getQueueStats }                 from "../integrations/services/retryQueue";
import { getInventorySnapshot }          from "../integrations/services/inventorySync";

const router = Router();

router.get("/pos/health", requireAuth, requireRole("venue_owner", "super_admin", "manager"), async (req: AuthRequest, res: Response) => {
  const venueId = req.user?.venueId;
  if (!venueId) { res.status(400).json({ error: "venue_required" }); return; }
  const healthResults = await getAllConnectionHealth();
  const forVenue      = healthResults.filter(h => !h.venueId || h.venueId === venueId);
  res.json({ health: forVenue, checkedAt: new Date().toISOString() });
});

router.get("/pos/health/:connectionId", requireAuth, requireRole("venue_owner", "super_admin", "manager"), async (req: AuthRequest, res: Response) => {
  const connectionId = req.params["connectionId"] as string;
  const health = await checkConnectionHealth(connectionId);
  res.json({ health });
});

router.get("/pos/health/logs/:connectionId", requireAuth, requireRole("venue_owner", "super_admin", "manager"), async (req: AuthRequest, res: Response) => {
  const connectionId = req.params["connectionId"] as string;
  const logs = await db.select()
    .from(posHealthLogsTable)
    .where(eq(posHealthLogsTable.connectionId, connectionId))
    .orderBy(desc(posHealthLogsTable.createdAt))
    .limit(100);
  res.json({ logs });
});

router.get("/pos/queue/stats", requireAuth, requireRole("venue_owner", "super_admin", "manager"), async (req: AuthRequest, res: Response) => {
  const venueId = req.user?.venueId;
  const stats   = await getQueueStats(venueId ?? undefined);
  const snap    = venueId ? getInventorySnapshot(venueId) : null;
  res.json({
    queue: stats,
    inventory: snap ? { itemCount: snap.itemCount, outOfStock: snap.outOfStockIds.length, lowStock: snap.lowStockIds.length, syncedAt: snap.syncedAt } : null,
  });
});

export default router;
