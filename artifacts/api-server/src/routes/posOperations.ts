/**
 * posOperations — enterprise POS operational routes.
 *
 * Payments:
 *   POST   /api/pos/payments/:id/transition     — state machine transition
 *   GET    /api/pos/payments/:id/state          — current state
 *   GET    /api/pos/payments/:id/history        — full event log
 *   POST   /api/pos/payments/:id/refund         — process refund
 *   GET    /api/pos/payments/:id/refunds        — refund history
 *   POST   /api/pos/disputes/:id/open           — open dispute
 *   POST   /api/pos/disputes/:id/evidence       — submit evidence
 *   POST   /api/pos/disputes/:id/resolve        — resolve dispute
 *   GET    /api/pos/disputes                    — list open disputes
 *
 * Inventory:
 *   GET    /api/pos/inventory/drift             — drift report
 *   GET    /api/pos/inventory/confidence        — confidence score
 *   POST   /api/pos/inventory/reconcile         — run reconciliation
 *   POST   /api/pos/inventory/reserve           — reserve stock
 *   POST   /api/pos/inventory/reservations/:id/confirm  — confirm
 *   POST   /api/pos/inventory/reservations/:id/release  — release
 *
 * Correlation:
 *   POST   /api/pos/correlation/session         — create session correlation
 *   GET    /api/pos/correlation/session/:eeisSessionId  — get correlation
 *   GET    /api/pos/correlation/sessions/active — all active
 *   POST   /api/pos/correlation/order           — correlate order
 *   GET    /api/pos/correlation/order/:eeisOrderId      — get order correlation
 *
 * Tables:
 *   GET    /api/pos/tables                      — all table states
 *   GET    /api/pos/tables/:tableId             — single table state
 *   PATCH  /api/pos/tables/:tableId             — update table state
 *   POST   /api/pos/tables/:tableId/lock        — acquire lock
 *   DELETE /api/pos/tables/:tableId/lock        — release lock
 *   POST   /api/pos/tables/handoff              — staff handoff
 *
 * Orders:
 *   POST   /api/pos/orders/:id/mutate           — apply mutation
 *   GET    /api/pos/orders/:id/mutations        — mutation history
 *   POST   /api/pos/orders/:id/split            — create split session
 *   POST   /api/pos/orders/splits/:splitId/pay  — record split payment
 *   POST   /api/pos/orders/:id/transfer-table   — transfer to table
 *   POST   /api/pos/orders/merge                — merge two checks
 *   POST   /api/pos/orders/:id/reassign-staff   — reassign staff
 *
 * Replay:
 *   GET    /api/pos/replay/order/:id            — replay order events
 *   GET    /api/pos/replay/payment/:id          — replay payment timeline
 *   GET    /api/pos/replay/inventory            — replay inventory audit
 *
 * Resilience:
 *   GET    /api/pos/resilience/latency          — latency stats
 *   GET    /api/pos/resilience/provider/:provider/status — provider health
 *   GET    /api/pos/resilience/degraded         — degraded mode state
 *   GET    /api/pos/resilience/offline-queue    — offline queue status
 */

import { Router, type Response } from "express";
import { z }                     from "zod/v4";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole }           from "../middleware/roles";

// Payments
import { transitionPayment, getPaymentState, getPaymentHistory } from "../integrations/payments/paymentStateMachine";
import { openDispute, submitEvidence, resolveDispute, getOpenDisputes } from "../integrations/payments/disputeProcessor";
import { processRefund, getRefundHistory }                from "../integrations/payments/refundOrchestrator";

// Inventory
import { detectDrift }            from "../integrations/inventory/driftDetection";
import { computeInventoryConfidence } from "../integrations/inventory/inventoryConfidence";
import { reconcileStock }         from "../integrations/inventory/stockReconciliation";
import { reserveStock, confirmReservation, releaseReservation } from "../integrations/inventory/reservationEngine";

// Correlation
import { createSessionCorrelation, getCorrelation, getActiveCorrelations, closeCorrelation } from "../integrations/correlation/posSessionCorrelation";
import { correlateOrder, getOrderCorrelation, getPendingCorrelations } from "../integrations/correlation/posOrderCorrelation";

// Tables
import { getAllTableStates, getTableState, updateTableState, clearTable } from "../integrations/tables/tableStateEngine";
import { acquireTableLock, releaseTableLock, getTableLockHolder }        from "../integrations/tables/tableLocks";
import { executeHandoff }          from "../integrations/tables/staffHandoff";

// Orders
import { mutateOrder, getMutationHistory }    from "../integrations/orders/orderMutationEngine";
import { createSplitSession, recordSplitPayment } from "../integrations/orders/splitPayments";
import { transferOrderToTable, mergeChecks, reassignStaff } from "../integrations/orders/transferFlow";

// Replay
import { replayOrder }             from "../integrations/replay/orderReplay";
import { replayPaymentTimeline }   from "../integrations/replay/paymentReplay";
import { replayInventory }         from "../integrations/replay/inventoryReplay";

// Resilience
import { getAllStats }              from "../integrations/resilience/latencyMonitor";
import { getProviderStatus, evaluateProvider } from "../integrations/resilience/providerFailover";
import { getDegradedModeState, getOfflineQueueStatus } from "../integrations/resilience/degradedMode";

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function venueId(req: AuthRequest): string | null {
  return req.user?.venueId ?? null;
}

function userId(req: AuthRequest): string {
  return req.user?.id ?? "system";
}

// ─── PAYMENTS ─────────────────────────────────────────────────────────────────

router.post("/pos/payments/:paymentId/transition",
  requireAuth, requireRole("venue_owner", "super_admin", "manager", "staff"),
  async (req: AuthRequest, res: Response) => {
    const vid = venueId(req);
    if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
    const schema = z.object({
      event:          z.enum(["authorize","capture","partial_refund","full_refund","void","dispute_opened","dispute_resolved","fail"]),
      amountCents:    z.number().int().optional(),
      staffId:        z.string().optional(),
      externalRef:    z.string().optional(),
      idempotencyKey: z.string().min(1),
      notes:          z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "validation_failed", details: parsed.error.issues }); return; }
    const result = await transitionPayment(req.params["paymentId"] as string, parsed.data.event, { venueId: vid, ...parsed.data });
    res.json(result);
  });

router.get("/pos/payments/:paymentId/state", requireAuth, async (req: AuthRequest, res: Response) => {
  const state = await getPaymentState(req.params["paymentId"] as string);
  res.json({ state });
});

router.get("/pos/payments/:paymentId/history", requireAuth, async (req: AuthRequest, res: Response) => {
  const history = await getPaymentHistory(req.params["paymentId"] as string);
  res.json({ history });
});

router.post("/pos/payments/:paymentId/refund",
  requireAuth, requireRole("venue_owner", "super_admin", "manager"),
  async (req: AuthRequest, res: Response) => {
    const vid = venueId(req);
    if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
    const schema = z.object({
      orderId:        z.string().uuid(),
      provider:       z.string().min(1),
      amountCents:    z.number().int().positive(),
      reason:         z.string().min(1),
      idempotencyKey: z.string().min(1),
      lineItems:      z.array(z.object({ posProductId:z.string(), name:z.string(), quantity:z.number().int(), amountCents:z.number().int() })).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "validation_failed", details: parsed.error.issues }); return; }
    const result = await processRefund({ paymentId: req.params["paymentId"] as string, venueId: vid, requestedBy: userId(req), ...parsed.data });
    res.json(result);
  });

router.get("/pos/payments/:paymentId/refunds", requireAuth, async (req: AuthRequest, res: Response) => {
  const history = await getRefundHistory(req.params["paymentId"] as string);
  res.json({ refunds: history });
});

// Disputes
router.post("/pos/disputes/:paymentId/open",
  requireAuth, requireRole("venue_owner", "super_admin", "manager"),
  async (req: AuthRequest, res: Response) => {
    const vid = venueId(req);
    if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
    const result = await openDispute(req.params["paymentId"] as string, vid, req.body as Parameters<typeof openDispute>[2]);
    res.json({ dispute: result });
  });

router.post("/pos/disputes/:disputeId/evidence", requireAuth, async (req: AuthRequest, res: Response) => {
  const ok = await submitEvidence(req.params["disputeId"] as string, req.body);
  res.json({ ok });
});

router.post("/pos/disputes/:disputeId/resolve",
  requireAuth, requireRole("venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const vid = venueId(req);
    if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
    const { outcome, paymentId } = req.body as { outcome: "won"|"lost"|"charge_refunded"; paymentId: string };
    await resolveDispute(req.params["disputeId"] as string, outcome, paymentId, vid);
    res.json({ ok: true });
  });

router.get("/pos/disputes", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const disputes = await getOpenDisputes(vid);
  res.json({ disputes });
});

// ─── INVENTORY ────────────────────────────────────────────────────────────────

router.get("/pos/inventory/drift", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid      = venueId(req);
  const provider = req.query["provider"] as string ?? "manual";
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  // Drift detection needs POS items — returns cached snapshot or empty
  const report = await detectDrift(vid, provider, []);
  res.json({ report });
});

router.get("/pos/inventory/confidence", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid      = venueId(req);
  const provider = req.query["provider"] as string ?? "manual";
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const score = await computeInventoryConfidence(vid, provider);
  res.json({ score });
});

router.post("/pos/inventory/reconcile",
  requireAuth, requireRole("venue_owner", "super_admin", "manager"),
  async (req: AuthRequest, res: Response) => {
    const vid = venueId(req);
    if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
    const { provider = "manual", dryRun = false } = req.body as { provider?: string; dryRun?: boolean };
    const result = await reconcileStock(vid, provider, [], { dryRun });
    res.json({ result });
  });

router.post("/pos/inventory/reserve", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const schema = z.object({
    orderId:        z.string().uuid(),
    productId:      z.string().uuid(),
    quantity:       z.number().int().positive(),
    idempotencyKey: z.string().min(1),
    ttlMs:          z.number().int().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "validation_failed", details: parsed.error.issues }); return; }
  const result = await reserveStock({ venueId: vid, reservedBy: userId(req), ...parsed.data });
  res.json(result);
});

router.post("/pos/inventory/reservations/:id/confirm",
  requireAuth, requireRole("venue_owner","super_admin","manager","staff"),
  async (req: AuthRequest, res: Response) => {
    const vid = venueId(req);
    if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
    const ok = await confirmReservation(req.params["id"] as string, vid);
    res.json({ ok });
  });

router.post("/pos/inventory/reservations/:id/release", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const ok = await releaseReservation(req.params["id"] as string, vid, (req.body as { reason?: string }).reason);
  res.json({ ok });
});

// ─── CORRELATION ──────────────────────────────────────────────────────────────

router.post("/pos/correlation/session", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const correlation = await createSessionCorrelation({ venueId: vid, ...(req.body as object) } as Parameters<typeof createSessionCorrelation>[0]);
  res.json({ correlation });
});

router.get("/pos/correlation/session/:eeisSessionId", requireAuth, async (req: AuthRequest, res: Response) => {
  const provider = req.query["provider"] as string ?? "toast";
  const correlation = await getCorrelation(req.params["eeisSessionId"] as string, provider);
  res.json({ correlation });
});

router.get("/pos/correlation/sessions/active", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const sessions = await getActiveCorrelations(vid);
  res.json({ sessions });
});

router.post("/pos/correlation/session/:eeisSessionId/close", requireAuth, async (req: AuthRequest, res: Response) => {
  const provider = req.query["provider"] as string ?? "toast";
  const status   = ((req.body as { status?: string }).status ?? "completed") as "completed"|"abandoned"|"transferred";
  await closeCorrelation(req.params["eeisSessionId"] as string, provider, status);
  res.json({ ok: true });
});

router.post("/pos/correlation/order", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const body = req.body as { eeisOrderId: string; posOrderId: string; provider: string; posTicketId?: string; posCheckNumber?: string; eeisSessionId?: string; posSessionId?: string; metadata?: Record<string,unknown> };
  const correlation = await correlateOrder(body.eeisOrderId, body.posOrderId, vid, body.provider, {
    posTicketId: body.posTicketId, posCheckNumber: body.posCheckNumber,
    eeisSessionId: body.eeisSessionId, posSessionId: body.posSessionId, metadata: body.metadata,
  });
  res.json({ correlation });
});

router.get("/pos/correlation/order/:eeisOrderId", requireAuth, async (req: AuthRequest, res: Response) => {
  const provider = req.query["provider"] as string ?? "toast";
  const correlation = await getOrderCorrelation(req.params["eeisOrderId"] as string, provider);
  res.json({ correlation });
});

router.get("/pos/correlation/orders/pending", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid      = venueId(req);
  const provider = req.query["provider"] as string ?? "toast";
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const pending = await getPendingCorrelations(vid, provider);
  res.json({ pending });
});

// ─── TABLES ───────────────────────────────────────────────────────────────────

router.get("/pos/tables", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const tables = await getAllTableStates(vid);
  res.json({ tables });
});

router.get("/pos/tables/:tableId", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const state = await getTableState(vid, req.params["tableId"] as string);
  res.json({ table: state });
});

router.patch("/pos/tables/:tableId",
  requireAuth, requireRole("venue_owner","super_admin","manager","staff"),
  async (req: AuthRequest, res: Response) => {
    const vid = venueId(req);
    if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
    const result = await updateTableState(vid, req.params["tableId"] as string, req.body as Parameters<typeof updateTableState>[2]);
    res.json(result);
  });

router.post("/pos/tables/:tableId/clear",
  requireAuth, requireRole("venue_owner","super_admin","manager","staff"),
  async (req: AuthRequest, res: Response) => {
    const vid = venueId(req);
    if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
    await clearTable(vid, req.params["tableId"] as string);
    res.json({ ok: true });
  });

router.post("/pos/tables/:tableId/lock", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const holderId = (req.body as { holderId?: string }).holderId ?? userId(req);
  const result   = await acquireTableLock(vid, req.params["tableId"] as string, holderId);
  res.json(result);
});

router.delete("/pos/tables/:tableId/lock", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const holderId = req.query["holderId"] as string ?? userId(req);
  const ok = await releaseTableLock(vid, req.params["tableId"] as string, holderId);
  res.json({ ok });
});

router.get("/pos/tables/:tableId/lock", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const holder = getTableLockHolder(vid, req.params["tableId"] as string);
  res.json({ locked: holder !== null, holder });
});

router.post("/pos/tables/handoff",
  requireAuth, requireRole("venue_owner","super_admin","manager"),
  async (req: AuthRequest, res: Response) => {
    const vid = venueId(req);
    if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
    const result = await executeHandoff({ venueId: vid, requestedBy: userId(req), ...(req.body as object) } as Parameters<typeof executeHandoff>[0]);
    res.json(result);
  });

// ─── ORDER MUTATIONS ──────────────────────────────────────────────────────────

router.post("/pos/orders/:orderId/mutate", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const result = await mutateOrder({
    orderId: req.params["orderId"] as string,
    venueId: vid,
    requestedBy: userId(req),
    ...(req.body as object),
  } as Parameters<typeof mutateOrder>[0]);
  res.json(result);
});

router.get("/pos/orders/:orderId/mutations", requireAuth, async (req: AuthRequest, res: Response) => {
  const history = await getMutationHistory(req.params["orderId"] as string);
  res.json({ mutations: history });
});

router.post("/pos/orders/:orderId/split", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const session = await createSplitSession({
    orderId: req.params["orderId"] as string,
    venueId: vid,
    requestedBy: userId(req),
    ...(req.body as object),
  } as Parameters<typeof createSplitSession>[0]);
  res.json({ session });
});

router.post("/pos/orders/splits/:splitId/pay", requireAuth, async (req: AuthRequest, res: Response) => {
  const { label, amountCents, paymentId } = req.body as { label: string; amountCents: number; paymentId: string };
  const result = await recordSplitPayment(req.params["splitId"] as string, label, amountCents, paymentId);
  res.json(result);
});

router.post("/pos/orders/:orderId/transfer-table",
  requireAuth, requireRole("venue_owner","super_admin","manager","staff"),
  async (req: AuthRequest, res: Response) => {
    const vid = venueId(req);
    if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
    const { fromTableNumber, toTableNumber } = req.body as { fromTableNumber: string; toTableNumber: string };
    const result = await transferOrderToTable(req.params["orderId"] as string, vid, fromTableNumber, toTableNumber, userId(req));
    res.json(result);
  });

router.post("/pos/orders/merge",
  requireAuth, requireRole("venue_owner","super_admin","manager","staff"),
  async (req: AuthRequest, res: Response) => {
    const vid = venueId(req);
    if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
    const { sourceOrderId, targetOrderId } = req.body as { sourceOrderId: string; targetOrderId: string };
    const result = await mergeChecks(sourceOrderId, targetOrderId, vid, userId(req));
    res.json(result);
  });

router.post("/pos/orders/:orderId/reassign-staff",
  requireAuth, requireRole("venue_owner","super_admin","manager"),
  async (req: AuthRequest, res: Response) => {
    const vid = venueId(req);
    if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
    const { staffId } = req.body as { staffId: string };
    const result = await reassignStaff(req.params["orderId"] as string, vid, staffId, userId(req));
    res.json(result);
  });

// ─── REPLAY ───────────────────────────────────────────────────────────────────

router.get("/pos/replay/order/:orderId", requireAuth, async (req: AuthRequest, res: Response) => {
  const asOf  = req.query["asOf"] ? new Date(req.query["asOf"] as string) : undefined;
  const result = await replayOrder(req.params["orderId"] as string, asOf);
  res.json(result);
});

router.get("/pos/replay/payment/:paymentId", requireAuth, async (req: AuthRequest, res: Response) => {
  const result = await replayPaymentTimeline(req.params["paymentId"] as string);
  res.json(result);
});

router.get("/pos/replay/inventory", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid    = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const fromTs = req.query["from"] ? new Date(req.query["from"] as string) : new Date(Date.now() - 24*60*60*1000);
  const toTs   = req.query["to"]   ? new Date(req.query["to"]   as string) : new Date();
  const posProductId = req.query["productId"] as string | undefined;
  const result = await replayInventory(vid, fromTs, toTs, posProductId);
  res.json(result);
});

// ─── RESILIENCE ───────────────────────────────────────────────────────────────

router.get("/pos/resilience/latency", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const stats = getAllStats(vid);
  res.json({ stats });
});

router.get("/pos/resilience/provider/:provider/status", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const provider = req.params["provider"] as string;
  const evaluate = req.query["evaluate"] === "true";
  const status   = evaluate
    ? await evaluateProvider(provider, vid)
    : getProviderStatus(provider, vid);
  res.json({ status });
});

router.get("/pos/resilience/degraded", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const state = getDegradedModeState(vid);
  res.json({ state });
});

router.get("/pos/resilience/offline-queue", requireAuth, async (req: AuthRequest, res: Response) => {
  const vid = venueId(req);
  if (!vid) { res.status(400).json({ error: "venue_required" }); return; }
  const status = await getOfflineQueueStatus(vid);
  res.json({ status });
});

export default router;
