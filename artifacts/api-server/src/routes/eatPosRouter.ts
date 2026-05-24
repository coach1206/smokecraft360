/**
 * /api/eat/pos-router — E.A.T. (Environment · Asset · Transaction) POS Engine
 *
 * POST /api/eat/pos-router/verify         — PIN auth + EAT telemetry + ritual cue
 * GET  /api/eat/pos-router/status         — live humidor status
 * GET  /api/eat/pos-router/kds            — Kitchen Display System queue
 * POST /api/eat/pos-router/kds/:id/advance — advance ticket state
 * POST /api/eat/pos-router/kds/:id/hold   — hold ticket (ritual pacing)
 * GET  /api/eat/pos-router/assets         — asset countdown ledger
 * POST /api/eat/pos-router/assets/:id/deduct — decrement asset by 1
 * POST /api/eat/pos-router/shadow-queue   — queue offline payment token
 * GET  /api/eat/pos-router/shift/:staffId — shift performance metrics
 */

import { Router } from "express";
import { z }      from "zod";
import { logger } from "../lib/logger";

const router = Router();

// ── In-memory state (stateless-safe — resets on restart, extend to DB as needed)
const STAFF_PIN = "3600";
const MGMT_PIN  = "7200";

let humidorCount = 145;

type KDSStatus = "PENDING" | "PREPARING" | "READY" | "HELD" | "DELIVERED";

interface KDSTicket {
  id: string; ticketNum: number; tableId: string;
  items: string[]; status: KDSStatus;
  etaMin: number; holdReason?: "ritual"; startedAt: number;
}

const KDS_ORDER: KDSStatus[] = ["PENDING", "PREPARING", "READY", "DELIVERED"];
function nextStatus(s: KDSStatus): KDSStatus {
  if (s === "HELD") return "PREPARING";
  const i = KDS_ORDER.indexOf(s);
  return KDS_ORDER[Math.min(i + 1, KDS_ORDER.length - 1)];
}

const kdsQueue: KDSTicket[] = [
  { id: "k1", ticketNum: 1, tableId: "A2", items: ["Cohiba Robusto", "Charcuterie Board"],     status: "PREPARING", etaMin: 8,  startedAt: Date.now() - 7 * 60000 },
  { id: "k2", ticketNum: 2, tableId: "A1", items: ["Cedar Ritual Setup", "Savor Pairing"],      status: "HELD",      etaMin: 0,  startedAt: Date.now() - 3 * 60000, holdReason: "ritual" },
  { id: "k3", ticketNum: 3, tableId: "B5", items: ["Whisky Flight", "Truffle Chips"],            status: "READY",     etaMin: 2,  startedAt: Date.now() - 14 * 60000 },
  { id: "k4", ticketNum: 4, tableId: "A4", items: ["Davidoff Reserve Set", "Tasting Menu"],     status: "PENDING",   etaMin: 15, startedAt: Date.now() - 60000 },
];

interface EATAsset {
  id: string; name: string; category: string;
  qty: number; par: number; zone: "humidor" | "bar" | "kitchen";
}

const assetLedger: EATAsset[] = [
  { id: "a1",  name: "Cohiba Behike 52",       category: "Premium Cigar",  qty: 2,  par: 12, zone: "humidor" },
  { id: "a2",  name: "Arturo Fuente OpusX",    category: "Premium Cigar",  qty: 3,  par: 12, zone: "humidor" },
  { id: "a3",  name: "Davidoff Winston Ch.",   category: "Premium Cigar",  qty: 8,  par: 20, zone: "humidor" },
  { id: "a4",  name: "Padron 1964 Anni.",      category: "Limited Cigar",  qty: 1,  par: 6,  zone: "humidor" },
  { id: "a5",  name: "Partagas Serie D No.4",  category: "Cigar",          qty: 14, par: 24, zone: "humidor" },
  { id: "a6",  name: "Macallan 18 Year",       category: "Spirit",         qty: 5,  par: 6,  zone: "bar"     },
  { id: "a7",  name: "Hennessy Paradis",       category: "Spirit",         qty: 2,  par: 4,  zone: "bar"     },
  { id: "a8",  name: "Cuban Cedar Spills",     category: "Ritual Tool",    qty: 0,  par: 50, zone: "kitchen" },
  { id: "a9",  name: "Xikar Guillotine Cut.",  category: "Ritual Tool",    qty: 3,  par: 8,  zone: "kitchen" },
  { id: "a10", name: "Montecristo No. 2",      category: "Cigar",          qty: 11, par: 20, zone: "humidor" },
];

interface ShadowPayment {
  id: string; tabId: string; amountCents: number;
  token: string; queuedAt: string; synced: boolean;
}
const shadowQueue: ShadowPayment[] = [];

// ── Schemas ───────────────────────────────────────────────────────────────────

const PosVerifySchema = z.object({
  pin:            z.string().min(4).max(8),
  action:         z.enum(["VERIFY", "DEDUCT_PURO", "RESET_CACHE", "RITUAL_CUE"]).optional(),
  tableId:        z.string().optional(),
  multiplierData: z.object({
    venueVelocity: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
    isExecutive:   z.boolean().optional(),
  }).optional(),
});

const ShadowSchema = z.object({
  tabId:       z.string(),
  amountCents: z.number().int().positive(),
  token:       z.string().min(8),
});

// ── POST /verify ──────────────────────────────────────────────────────────────

router.post("/verify", (req, res) => {
  const parsed = PosVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ authenticated: false, error: "MALFORMED_REQUEST_PAYLOAD" });
    return;
  }

  const { pin, action, multiplierData, tableId } = parsed.data;

  if (pin !== STAFF_PIN && pin !== MGMT_PIN) {
    logger.warn({ ip: req.ip }, "EAT POS: invalid PIN attempt");
    res.status(401).json({ authenticated: false, error: "ACCESS DENIED: INVALID CREDENTIALS" });
    return;
  }

  if (action === "DEDUCT_PURO") humidorCount = Math.max(0, humidorCount - 1);
  if (action === "RESET_CACHE") humidorCount = 145;
  if (action === "RITUAL_CUE" && tableId) {
    kdsQueue.filter(t => t.tableId === tableId && t.status === "PREPARING")
      .forEach(t => { t.status = "HELD"; t.holdReason = "ritual"; });
    logger.info({ tableId }, "EAT POS: ritual cue dispatched, KDS held");
  }

  let systemMultiplier = 1;
  if (multiplierData?.venueVelocity === "HIGH") systemMultiplier = multiplierData?.isExecutive ? 5 : 3;
  else if (multiplierData?.venueVelocity === "MEDIUM") systemMultiplier = 2;

  res.json({
    authenticated: true,
    clearance:     pin === MGMT_PIN ? "MANAGEMENT" : "STAFF",
    action:        action ?? "VERIFY",
    tableId:       tableId ?? null,
    telemetry: {
      humidorCount,
      kitchenQueueLength: kdsQueue.filter(t => t.status !== "DELIVERED").length,
      barPourStatus:      "OPTIMAL_94_PERCENT",
      activeMultiplier:   systemMultiplier,
      seatingGridMap: [
        { tableId: "A1", status: "RITUAL",    tabTotal: 780  },
        { tableId: "A2", status: "OCCUPIED",  tabTotal: 340  },
        { tableId: "A4", status: "VIP",       tabTotal: 1640 },
      ],
    },
  });
});

// ── GET /status ───────────────────────────────────────────────────────────────

router.get("/status", (_req, res) => {
  res.json({
    humidorCount,
    activeKDSTickets: kdsQueue.filter(t => t.status !== "DELIVERED").length,
    lowStockAssets:   assetLedger.filter(a => a.qty <= 3).map(a => ({ id: a.id, name: a.name, qty: a.qty })),
    shadowQueueDepth: shadowQueue.filter(p => !p.synced).length,
    status: "ONLINE",
  });
});

// ── GET /kds — full kitchen display queue ─────────────────────────────────────

router.get("/kds", (_req, res) => {
  res.json({ tickets: kdsQueue, count: kdsQueue.length });
});

// ── POST /kds/:id/advance ─────────────────────────────────────────────────────

router.post("/kds/:id/advance", (req, res) => {
  const ticket = kdsQueue.find(t => t.id === req.params.id);
  if (!ticket) { res.status(404).json({ error: "ticket_not_found" }); return; }
  ticket.status = nextStatus(ticket.status);
  if (ticket.status !== "HELD") delete ticket.holdReason;
  logger.info({ ticketId: ticket.id, newStatus: ticket.status }, "EAT KDS: ticket advanced");
  res.json({ ticket });
});

// ── POST /kds/:id/hold — ritual pacing hold ───────────────────────────────────

router.post("/kds/:id/hold", (req, res) => {
  const ticket = kdsQueue.find(t => t.id === req.params.id);
  if (!ticket) { res.status(404).json({ error: "ticket_not_found" }); return; }
  ticket.status = "HELD";
  ticket.holdReason = "ritual";
  logger.info({ ticketId: ticket.id }, "EAT KDS: ritual hold applied");
  res.json({ ticket });
});

// ── GET /assets — asset countdown ledger ─────────────────────────────────────

router.get("/assets", (_req, res) => {
  res.json({
    assets:    assetLedger,
    lowStock:  assetLedger.filter(a => a.qty > 0 && a.qty <= 3).length,
    depleted:  assetLedger.filter(a => a.qty === 0).length,
  });
});

// ── POST /assets/:id/deduct ───────────────────────────────────────────────────

router.post("/assets/:id/deduct", (req, res) => {
  const asset = assetLedger.find(a => a.id === req.params.id);
  if (!asset) { res.status(404).json({ error: "asset_not_found" }); return; }
  if (asset.qty === 0) { res.status(409).json({ error: "asset_depleted", locked: true }); return; }
  asset.qty = Math.max(0, asset.qty - 1);
  logger.info({ assetId: asset.id, newQty: asset.qty }, "EAT asset deducted");
  res.json({ asset, locked: asset.qty === 0 });
});

// ── POST /shadow-queue — offline payment tokenization ─────────────────────────
// Frontend submits tokenized payment data when offline; server queues and
// settles when connectivity is confirmed. Token must be pre-encrypted
// client-side before transmission.

router.post("/shadow-queue", (req, res) => {
  const parsed = ShadowSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "invalid_shadow_payload" }); return; }
  const payment: ShadowPayment = {
    id:          crypto.randomUUID(),
    tabId:       parsed.data.tabId,
    amountCents: parsed.data.amountCents,
    token:       parsed.data.token,
    queuedAt:    new Date().toISOString(),
    synced:      false,
  };
  shadowQueue.push(payment);
  logger.info({ paymentId: payment.id, amountCents: payment.amountCents }, "EAT shadow payment queued");
  res.json({ id: payment.id, queued: true, position: shadowQueue.filter(p => !p.synced).length });
});

// ── GET /shift/:staffId — server shift performance ────────────────────────────

router.get("/shift/:staffId", (req, res) => {
  // In production: query payment_events + orders filtered by staff session.
  // Returns realistic seeded metrics for the current demo build.
  const { staffId } = req.params;
  res.json({
    staffId,
    period: "current_shift",
    metrics: {
      tipsCents:     34700,
      salesCents:    284000,
      tablesServed:  14,
      avgTabCents:   20286,
      tipPoolCents:  8675,
      pacingScore:   91,
    },
    topItems: [
      { name: "Cohiba Behike 52",   count: 4, revenueCents: 34000 },
      { name: "Macallan 18 Year",   count: 6, revenueCents: 39000 },
      { name: "Davidoff Winston",   count: 3, revenueCents: 18900 },
    ],
  });
});

export default router;
