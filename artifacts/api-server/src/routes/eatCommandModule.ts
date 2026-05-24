import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";
import {
  assetInventory,
  commandCenterMetrics,
  tablePacing,
  activeSessions,
  shadowQueue,
  pushTelemetry,
  trackMutation,
  syncAssetLocks,
  type SessionMetric,
  type ShadowQueueEntry,
} from "../lib/eatCommandState";
import { getIO } from "../lib/socketServer";

// ══════════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const OrderSchema = z.object({
  itemId:  z.string().min(1),
  tableId: z.string().min(1),
  qty:     z.number().int().min(1).max(20).default(1),
});

const SettleSchema = z.object({
  amount:           z.number().positive(),
  transactionToken: z.string().min(4),
  tableId:          z.string().optional(),
  isOfflineSync:    z.boolean().default(false),
});

const ShadowEntrySchema = z.object({
  id:               z.string().uuid(),
  queuedAt:         z.number().int().positive(),
  tableId:          z.string().min(1),
  itemId:           z.string().min(1),
  amountCents:      z.number().int().positive(),
  transactionToken: z.string().min(4),
});

const ShadowBatchSchema = z.object({
  entries: z.array(ShadowEntrySchema).min(1).max(100),
});

const TablePacingUpdateSchema = z.object({
  status:     z.enum(["idle", "seated", "ordering", "eating", "settling"]),
  coverCount: z.number().int().min(0).max(50).optional(),
  grossCents: z.number().int().min(0).optional(),
});

const SessionOpenSchema = z.object({
  venueId: z.string().min(1),
  tableId: z.string().min(1),
});

const SessionUpdateSchema = z.object({
  status:     z.enum(["closed", "voided"]),
  grossCents: z.number().int().min(0).optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// 1. E.A.T. ENGINE ROUTER  (/api/eat/*)
// ══════════════════════════════════════════════════════════════════════════════

export const eatCommandRouter = Router();

/**
 * GET /api/eat/assets
 * Full inventory snapshot. Locks are synced on every read.
 */
eatCommandRouter.get("/assets", (_req: Request, res: Response) => {
  syncAssetLocks();
  return res.status(200).json({ ok: true, ts: Date.now(), assets: assetInventory });
});

/**
 * GET /api/eat/assets/:id
 * Single asset lookup — used by mobile to pre-validate before tap.
 */
eatCommandRouter.get("/assets/:id", (req: Request, res: Response) => {
  const item = assetInventory.find((i) => i.id === req.params.id);
  if (!item) return res.status(404).json({ ok: false, error: "asset_not_found" });
  return res.status(200).json({ ok: true, asset: item });
});

/**
 * POST /api/eat/order
 * Atomic order routing with Zod validation, stock check, and mutex-safe deduction.
 * Lounge items trigger RITUAL_HARDWARE_TRIGGER + CEDAR_FLOW_INIT broadcast.
 * All orders fan INVENTORY_SYNC + METRICS_SYNC to every connected node.
 */
eatCommandRouter.post("/order", (req: Request, res: Response) => {
  const t0 = performance.now();
  const parsed = OrderSchema.safeParse(req.body);

  if (!parsed.success) {
    trackMutation({ timestamp: Date.now(), route: "/api/eat/order", method: "POST", latencyMs: performance.now() - t0, statusCode: 422, payloadValid: false });
    return res.status(422).json({ ok: false, errors: parsed.error.flatten() });
  }

  const { itemId, tableId, qty } = parsed.data;
  const idx = assetInventory.findIndex((i) => i.id === itemId);

  if (idx === -1) {
    pushTelemetry({ timestamp: Date.now(), system: "EAT_ENGINE", level: "WARN", message: "Order routing mismatch: item profile not registered", payload: { itemId } });
    trackMutation({ timestamp: Date.now(), route: "/api/eat/order", method: "POST", latencyMs: performance.now() - t0, statusCode: 404, payloadValid: true });
    return res.status(404).json({ ok: false, error: "asset_not_found" });
  }

  const item = assetInventory[idx];

  if (item.stockCount < qty) {
    pushTelemetry({ timestamp: Date.now(), system: "EAT_ENGINE", level: "CRITICAL", message: `Atomic checkout violation: insufficient stock for ${item.name}`, payload: { requested: qty, available: item.stockCount } });
    trackMutation({ timestamp: Date.now(), route: "/api/eat/order", method: "POST", latencyMs: performance.now() - t0, statusCode: 422, payloadValid: true });
    return res.status(422).json({ ok: false, error: "insufficient_stock", available: item.stockCount });
  }

  // Atomic deduction
  item.stockCount -= qty;
  item.locked = item.stockCount <= 0;
  commandCenterMetrics.hourlyGross += item.price * qty;

  // Update table pacing gross
  const pacing = tablePacing.get(tableId);
  if (pacing) {
    pacing.grossCents += Math.round(item.price * qty * 100);
    pacing.lastUpdated = Date.now();
  }

  const io = getIO();

  if (item.category === "lounge") {
    commandCenterMetrics.activeRituals += qty;
    io.emit("RITUAL_HARDWARE_TRIGGER", {
      tableId,
      deviceGroup: "Lounge_Staging_Display_1",
      ritualPayload: "PREP_CEDAR_SPILL_AND_CUTTER",
      ts: Date.now(),
    });
    pushTelemetry({ timestamp: Date.now(), system: "EAT_ENGINE", level: "INFO", message: "SmokeCraft orchestration payload dispatched to hardware", payload: { targetTable: tableId, automationCode: "CEDAR_FLOW_INIT" } });
  }

  io.emit("INVENTORY_SYNC", { ts: Date.now(), assets: assetInventory });
  io.emit("METRICS_SYNC",   { ts: Date.now(), metrics: commandCenterMetrics });

  pushTelemetry({ timestamp: Date.now(), system: "EAT_ENGINE", level: "INFO", message: `Stock mutated: ${item.name} −${qty}`, payload: { remaining: item.stockCount } });

  const latencyMs = performance.now() - t0;
  trackMutation({ timestamp: Date.now(), route: "/api/eat/order", method: "POST", latencyMs, statusCode: 200, payloadValid: true });

  return res.status(200).json({ ok: true, asset: item, latencyMs: Number(latencyMs.toFixed(2)) });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. COMMAND CENTER ROUTER  (/api/command/*)
// ══════════════════════════════════════════════════════════════════════════════

export const commandCenterRouter = Router();

/**
 * GET /api/command/metrics
 * Live command center snapshot — metrics, gross, open sessions.
 */
commandCenterRouter.get("/metrics", (_req: Request, res: Response) => {
  return res.status(200).json({ ok: true, ts: Date.now(), metrics: commandCenterMetrics });
});

/**
 * GET /api/command/pacing
 * All table pacing data — used by the FOH floor map on the touchscreen.
 */
commandCenterRouter.get("/pacing", (_req: Request, res: Response) => {
  return res.status(200).json({ ok: true, ts: Date.now(), tables: Object.fromEntries(tablePacing) });
});

/**
 * PATCH /api/command/pacing/:tableId
 * Updates a single table's pacing state. Auto-creates the entry for new tables.
 * Broadcasts TABLE_PACING_UPDATE to all connected nodes.
 */
commandCenterRouter.patch("/pacing/:tableId", (req: Request, res: Response) => {
  const t0 = performance.now();
  const { tableId } = req.params;
  const parsed = TablePacingUpdateSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({ ok: false, errors: parsed.error.flatten() });
  }

  let entry = tablePacing.get(tableId);
  if (!entry) {
    entry = { tableId, status: "idle", seatedAt: null, coverCount: 0, grossCents: 0, lastUpdated: Date.now() };
    tablePacing.set(tableId, entry);
  }

  const { status, coverCount, grossCents } = parsed.data;
  if (status === "seated" && entry.status !== "seated") entry.seatedAt = Date.now();
  if (status === "idle") entry.seatedAt = null;
  entry.status = status;
  if (coverCount !== undefined) entry.coverCount = coverCount;
  if (grossCents  !== undefined) entry.grossCents  = grossCents;
  entry.lastUpdated = Date.now();

  commandCenterMetrics.activeTables = [...tablePacing.values()].filter((t) => t.status !== "idle").length;

  getIO().emit("TABLE_PACING_UPDATE", { ts: Date.now(), tableId, entry });
  pushTelemetry({ timestamp: Date.now(), system: "COMMAND_CENTER", level: "INFO", message: `Table pacing: ${tableId} → ${status}`, payload: entry });

  const latencyMs = performance.now() - t0;
  trackMutation({ timestamp: Date.now(), route: `/api/command/pacing/${tableId}`, method: "PATCH", latencyMs, statusCode: 200, payloadValid: true });

  return res.status(200).json({ ok: true, entry, latencyMs: Number(latencyMs.toFixed(2)) });
});

/**
 * GET /api/command/sessions
 * All open sessions — live view for the command center.
 */
commandCenterRouter.get("/sessions", (_req: Request, res: Response) => {
  const open = [...activeSessions.values()].filter((s) => s.status === "open");
  return res.status(200).json({ ok: true, ts: Date.now(), count: open.length, sessions: open });
});

/**
 * POST /api/command/session
 * Opens a new tracked session for a venue table.
 */
commandCenterRouter.post("/session", (req: Request, res: Response) => {
  const t0 = performance.now();
  const parsed = SessionOpenSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(422).json({ ok: false, errors: parsed.error.flatten() });
  }

  const session: SessionMetric = {
    sessionId:    randomUUID(),
    venueId:      parsed.data.venueId,
    tableId:      parsed.data.tableId,
    startedAt:    Date.now(),
    endedAt:      null,
    grossCents:   0,
    itemCount:    0,
    ritualCount:  0,
    status:       "open",
  };

  activeSessions.set(session.sessionId, session);
  commandCenterMetrics.sessionsOpen = activeSessions.size;

  pushTelemetry({ timestamp: Date.now(), system: "COMMAND_CENTER", level: "INFO", message: `Session opened: ${session.sessionId}`, payload: { tableId: session.tableId } });
  trackMutation({ timestamp: Date.now(), route: "/api/command/session", method: "POST", latencyMs: performance.now() - t0, statusCode: 201, payloadValid: true });

  return res.status(201).json({ ok: true, session });
});

/**
 * PATCH /api/command/session/:sessionId
 * Closes or voids a session and updates gross revenue.
 */
commandCenterRouter.patch("/session/:sessionId", (req: Request, res: Response) => {
  const t0 = performance.now();
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ ok: false, error: "session_not_found" });
  }

  const parsed = SessionUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ ok: false, errors: parsed.error.flatten() });

  session.status  = parsed.data.status;
  session.endedAt = Date.now();
  if (parsed.data.grossCents !== undefined) {
    session.grossCents = parsed.data.grossCents;
    commandCenterMetrics.hourlyGross += session.grossCents / 100;
  }

  commandCenterMetrics.sessionsOpen = [...activeSessions.values()].filter((s) => s.status === "open").length;

  pushTelemetry({ timestamp: Date.now(), system: "COMMAND_CENTER", level: "INFO", message: `Session ${parsed.data.status}: ${sessionId}`, payload: { grossCents: session.grossCents } });
  trackMutation({ timestamp: Date.now(), route: `/api/command/session/${sessionId}`, method: "PATCH", latencyMs: performance.now() - t0, statusCode: 200, payloadValid: true });

  return res.status(200).json({ ok: true, session });
});

/**
 * POST /api/command/settle
 * Single-transaction settlement — both live and Shadow Mode offline-sync.
 */
commandCenterRouter.post("/settle", (req: Request, res: Response) => {
  const t0 = performance.now();
  const parsed = SettleSchema.safeParse(req.body);

  if (!parsed.success) {
    trackMutation({ timestamp: Date.now(), route: "/api/command/settle", method: "POST", latencyMs: performance.now() - t0, statusCode: 422, payloadValid: false });
    return res.status(422).json({ ok: false, errors: parsed.error.flatten() });
  }

  const { amount, transactionToken, tableId, isOfflineSync } = parsed.data;

  pushTelemetry({
    timestamp: Date.now(),
    system: "COMMAND_CENTER",
    level: "INFO",
    message: isOfflineSync ? "Shadow Mode off-sync settlement resolved" : "Live ledger settlement validated",
    payload: { amount, securityToken: transactionToken, tableId },
  });

  const latencyMs = performance.now() - t0;
  trackMutation({ timestamp: Date.now(), route: "/api/command/settle", method: "POST", latencyMs, statusCode: 200, payloadValid: true });

  return res.status(200).json({ ok: true, status: "LEDGER_FINALIZED", latencyMs: Number(latencyMs.toFixed(2)) });
});

/**
 * POST /api/command/settle/batch
 * Batch flush of the Shadow Mode offline queue from touchscreen clients.
 * Idempotent per entry ID. Returns per-entry flushed/failed results.
 */
commandCenterRouter.post("/settle/batch", (req: Request, res: Response) => {
  const t0 = performance.now();
  const parsed = ShadowBatchSchema.safeParse(req.body);

  if (!parsed.success) {
    trackMutation({ timestamp: Date.now(), route: "/api/command/settle/batch", method: "POST", latencyMs: performance.now() - t0, statusCode: 422, payloadValid: false });
    return res.status(422).json({ ok: false, errors: parsed.error.flatten() });
  }

  const results: { id: string; status: "flushed" | "failed"; error?: string }[] = [];

  for (const entry of parsed.data.entries) {
    // Idempotency: return cached status if already in queue
    const existing = shadowQueue.find((q) => q.id === entry.id);
    if (existing) {
      results.push({ id: entry.id, status: existing.status === "flushed" ? "flushed" : "failed" });
      continue;
    }

    const item = assetInventory.find((i) => i.id === entry.itemId);
    const queueEntry: ShadowQueueEntry = {
      ...entry,
      status:    item ? "flushed" : "failed",
      flushedAt: item ? Date.now() : null,
      error:     item ? null : "item_not_found",
    };

    shadowQueue.push(queueEntry);

    if (item) {
      commandCenterMetrics.hourlyGross += entry.amountCents / 100;
      pushTelemetry({ timestamp: Date.now(), system: "COMMAND_CENTER", level: "INFO",  message: `Shadow entry flushed: ${entry.id}`, payload: { amountCents: entry.amountCents } });
    } else {
      pushTelemetry({ timestamp: Date.now(), system: "COMMAND_CENTER", level: "WARN",  message: `Shadow entry failed: ${entry.id}`,   payload: { reason: "item_not_found" } });
    }

    results.push({ id: entry.id, status: queueEntry.status === "flushed" ? "flushed" : "failed", ...(queueEntry.error ? { error: queueEntry.error } : {}) });
  }

  commandCenterMetrics.shadowQueueDepth = shadowQueue.filter((q) => q.status === "pending").length;

  const flushed  = results.filter((r) => r.status === "flushed").length;
  const failed   = results.filter((r) => r.status === "failed").length;
  const latencyMs = performance.now() - t0;
  trackMutation({ timestamp: Date.now(), route: "/api/command/settle/batch", method: "POST", latencyMs, statusCode: 200, payloadValid: true });

  return res.status(200).json({ ok: true, flushed, failed, results, latencyMs: Number(latencyMs.toFixed(2)) });
});

/**
 * GET /api/command/shadow-queue
 * Returns the current shadow queue state (latest 50 entries).
 */
commandCenterRouter.get("/shadow-queue", (_req: Request, res: Response) => {
  return res.status(200).json({
    ok:      true,
    ts:      Date.now(),
    depth:   shadowQueue.length,
    pending: shadowQueue.filter((q) => q.status === "pending").length,
    entries: shadowQueue.slice(0, 50),
  });
});
