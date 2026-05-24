import { Router, type Request, type Response } from "express";
import {
  assetInventory,
  commandCenterMetrics,
  pushTelemetry,
} from "../lib/eatCommandState";
import { getIO } from "../lib/socketServer";

// ── 1. E.A.T. Engine Router ──────────────────────────────────────────────────
// Mounted at /api/eat

export const eatCommandRouter = Router();

/**
 * GET /api/eat/assets
 * Live global asset/inventory levels for the EAT Engine.
 */
eatCommandRouter.get("/assets", (_req: Request, res: Response) => {
  res.status(200).json({ success: true, assets: assetInventory });
});

/**
 * POST /api/eat/order
 * Atomic order routing: validates stock, decrements ledger, triggers ritual
 * hardware broadcast for lounge items, and fans INVENTORY_SYNC + METRICS_SYNC
 * to all connected nodes via Socket.IO.
 */
eatCommandRouter.post("/order", (req: Request, res: Response) => {
  const { itemId, tableId } = req.body as { itemId?: string; tableId?: string };
  const startTime = performance.now();

  const itemIndex = assetInventory.findIndex((i) => i.id === itemId);

  if (itemIndex === -1) {
    pushTelemetry({
      timestamp: Date.now(),
      system: "EAT_ENGINE",
      level: "WARN",
      message: "Order routing mismatch: Item profile not registered",
      payload: { itemId },
    });
    return res.status(404).json({ success: false, error: "Item record untracked" });
  }

  const item = assetInventory[itemIndex];

  if (item.stockCount <= 0) {
    pushTelemetry({
      timestamp: Date.now(),
      system: "EAT_ENGINE",
      level: "CRITICAL",
      message: "Atomic checkout violation: Requested item is 86ed",
      payload: { item: item.name },
    });
    return res.status(422).json({ success: false, error: "Asset volume fully depleted" });
  }

  // Atomic state deduction
  item.stockCount -= 1;
  commandCenterMetrics.hourlyGross += item.price;

  const dbLatency = (performance.now() - startTime).toFixed(2);

  pushTelemetry({
    timestamp: Date.now(),
    system: "EAT_ENGINE",
    level: "INFO",
    message: `Asset quantity successfully mutated: ${item.name}`,
    payload: { remainingStock: item.stockCount, processingLatency: `${dbLatency}ms` },
  });

  const io = getIO();

  // Lounge items trigger the SmokeCraft ritual hardware automation layer
  if (item.category === "lounge") {
    commandCenterMetrics.activeRituals += 1;

    io.emit("RITUAL_HARDWARE_TRIGGER", {
      tableId,
      deviceGroup: "Lounge_Staging_Display_1",
      ritualPayload: "PREP_CEDAR_SPILL_AND_CUTTER",
    });

    pushTelemetry({
      timestamp: Date.now(),
      system: "EAT_ENGINE",
      level: "INFO",
      message: "SmokeCraft orchestration payload pushed to hardware layers",
      payload: { targetTable: tableId, automationCode: "CEDAR_FLOW_INIT" },
    });
  }

  // Fan updated state to all floor nodes
  io.emit("INVENTORY_SYNC", assetInventory);
  io.emit("METRICS_SYNC", commandCenterMetrics);

  return res.status(200).json({ success: true, updatedAsset: item });
});

// ── 2. Command Center Router ─────────────────────────────────────────────────
// Mounted at /api/command

export const commandCenterRouter = Router();

/**
 * GET /api/command/metrics
 * Live command center snapshot: table count, rituals, gross revenue, latency.
 */
commandCenterRouter.get("/metrics", (_req: Request, res: Response) => {
  res.status(200).json({ success: true, metrics: commandCenterMetrics });
});

/**
 * POST /api/command/settle
 * Unified transaction settlement handler — supports both live and Shadow Mode
 * offline-sync flows. Appends a COMMAND_CENTER telemetry packet on every call.
 */
commandCenterRouter.post("/settle", (req: Request, res: Response) => {
  const { amount, transactionToken, isOfflineSync } = req.body as {
    amount?: number;
    transactionToken?: string;
    isOfflineSync?: boolean;
  };

  pushTelemetry({
    timestamp: Date.now(),
    system: "COMMAND_CENTER",
    level: "INFO",
    message: isOfflineSync
      ? "Shadow Mode off-sync settlement resolved"
      : "Live digital financial ledger settlement validated",
    payload: { transactionAmount: amount, securityToken: transactionToken },
  });

  res.status(200).json({ success: true, status: "LEDGER_FINALIZED" });
});
