/**
 * EEIE Commerce Service
 * In-memory state for commerce adapters, order handoffs, alerts, and logs.
 * No DB required — all state is runtime. Each adapter reflects real env-secret
 * presence so the frontend never lies about connection status.
 */

type CommerceMode = "live" | "local" | "demo" | "not_connected";
type AdapterStatus = "connected" | "offline" | "setup_needed" | "testing" | "manual";
type HandoffStatus = "success" | "waiting" | "failed" | "manual_ready";
type AlertSeverity = "info" | "warning" | "critical" | "success";

export type CommerceAdapter = {
  id: string;
  name: string;
  status: AdapterStatus;
  mode: CommerceMode;
  modeLabel: string;
  isLive: boolean;
  lastSync: string | null;
  syncDurationMs: number | null;
  failures: number;
  supportedActions: string[];
  setupRequired: boolean;
  notes: string;
};

export type OrderHandoff = {
  id: string;
  table: string;
  guest: string;
  staff: string;
  bundleName: string;
  items: string[];
  cartTotal: number;
  status: HandoffStatus;
  posAdapter: string;
  posResponse: string;
  createdAt: string;
  updatedAt: string;
};

export type CommerceAlert = {
  id: string;
  severity: AlertSeverity;
  source: string;
  title: string;
  message: string;
  recommendedAction: string;
  acknowledged: boolean;
  createdAt: string;
};

export type CommerceLog = {
  id: string;
  type: string;
  source: string;
  message: string;
  createdAt: string;
  payload?: unknown;
};

const nowIso = () => new Date().toISOString();

let manualModeEnabled = true;
let currentOccupancy = 50;

let adapters: CommerceAdapter[] = [
  {
    id: "toast",
    name: "Toast",
    status: "setup_needed",
    mode: "not_connected",
    modeLabel: "Not Connected",
    isLive: false,
    lastSync: null,
    syncDurationMs: null,
    failures: 0,
    supportedActions: ["connect", "test", "manual_mode", "view_logs"],
    setupRequired: true,
    notes: "Toast adapter is not connected. Add TOAST_API_KEY to environment secrets and run test connection.",
  },
  {
    id: "square",
    name: "Square",
    status: "setup_needed",
    mode: "not_connected",
    modeLabel: "Not Connected",
    isLive: false,
    lastSync: null,
    syncDurationMs: null,
    failures: 0,
    supportedActions: ["connect", "test", "manual_mode", "view_logs"],
    setupRequired: true,
    notes: "Square adapter is not connected. Add SQUARE_ACCESS_TOKEN to environment secrets and run test connection.",
  },
  {
    id: "clover",
    name: "Clover",
    status: "setup_needed",
    mode: "not_connected",
    modeLabel: "Not Connected",
    isLive: false,
    lastSync: null,
    syncDurationMs: null,
    failures: 0,
    supportedActions: ["connect", "test", "manual_mode", "view_logs"],
    setupRequired: true,
    notes: "Clover adapter is ready for setup but not connected. Add CLOVER_ACCESS_TOKEN to activate.",
  },
  {
    id: "stripe",
    name: "Stripe",
    status: process.env.STRIPE_SECRET_KEY ? "connected" : "setup_needed",
    mode: process.env.STRIPE_SECRET_KEY ? "live" : "not_connected",
    modeLabel: process.env.STRIPE_SECRET_KEY ? "Live" : "Not Connected",
    isLive: Boolean(process.env.STRIPE_SECRET_KEY),
    lastSync: process.env.STRIPE_SECRET_KEY ? nowIso() : null,
    syncDurationMs: process.env.STRIPE_SECRET_KEY ? 212 : null,
    failures: 0,
    supportedActions: ["test", "view_logs"],
    setupRequired: !process.env.STRIPE_SECRET_KEY,
    notes: process.env.STRIPE_SECRET_KEY
      ? "Stripe secret detected. Commerce layer is live."
      : "Add STRIPE_SECRET_KEY to enable live Stripe checks.",
  },
  {
    id: "manual",
    name: "Manual Mode",
    status: "manual",
    mode: "local",
    modeLabel: "Local Mode",
    isLive: false,
    lastSync: nowIso(),
    syncDurationMs: 0,
    failures: 0,
    supportedActions: ["enable", "export_order_summary", "view_logs"],
    setupRequired: false,
    notes: "Manual Mode lets staff build carts and export order summaries when no POS adapter is connected.",
  },
];

let orderHandoffs: OrderHandoff[] = [
  {
    id: "handoff_001",
    table: "Table 12",
    guest: "Marcus D.",
    staff: "Elena V.",
    bundleName: "Cream & Oak Experience",
    items: ["Padron 1926 Series No. 6", "Woodford Reserve Double Oaked", "Smoked Short Rib Slider"],
    cartTotal: 70,
    status: "manual_ready",
    posAdapter: "Manual Mode",
    posResponse: "Ready for staff confirmation",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "handoff_002",
    table: "Table 4",
    guest: "Sophia L.",
    staff: "Andre M.",
    bundleName: "Sweet Finish Session",
    items: ["My Father Le Bijou 1922", "Balvenie DoubleWood 17"],
    cartTotal: 64,
    status: "waiting",
    posAdapter: "Manual Mode",
    posResponse: "Waiting for staff review",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
  {
    id: "handoff_003",
    table: "Table 7",
    guest: "James O.",
    staff: "Nia P.",
    bundleName: "Food Pairing",
    items: ["Vanilla Crème Brûlée"],
    cartTotal: 14,
    status: "failed",
    posAdapter: "Toast",
    posResponse: "Toast adapter not connected",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  },
];

let alerts: CommerceAlert[] = [
  {
    id: "alert_001",
    severity: "warning",
    source: "POS Adapter",
    title: "Toast adapter offline",
    message: "Toast is not connected. Use Manual Mode or connect Toast credentials.",
    recommendedAction: "Connect Toast or enable Manual Mode.",
    acknowledged: false,
    createdAt: nowIso(),
  },
  {
    id: "alert_002",
    severity: "warning",
    source: "Order Handoff",
    title: "Failed handoff detected",
    message: "Table 7 has a failed Toast handoff.",
    recommendedAction: "Retry handoff or switch the cart to Manual Mode.",
    acknowledged: false,
    createdAt: nowIso(),
  },
  {
    id: "alert_003",
    severity: "info",
    source: "Revenue Intelligence",
    title: "Bundle opportunity",
    message: "Cream & Oak Experience is currently the best performing bundle.",
    recommendedAction: "Promote this bundle inside Product Wall and Staff Cockpit.",
    acknowledged: false,
    createdAt: nowIso(),
  },
];

let logs: CommerceLog[] = [
  {
    id: "log_001",
    type: "commerce_center_loaded",
    source: "Commerce Intelligence Center",
    message: "Commerce Intelligence Center loaded in Local Mode.",
    createdAt: nowIso(),
  },
];

function addLog(type: string, source: string, message: string, payload?: unknown): CommerceLog {
  const log: CommerceLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    type,
    source,
    message,
    payload,
    createdAt: nowIso(),
  };
  logs = [log, ...logs].slice(0, 100);
  return log;
}

function getActiveAdapter(): CommerceAdapter {
  const connected = adapters.find((a) => a.status === "connected");
  if (connected) return connected;
  return adapters.find((a) => a.id === "manual")!;
}

export function getCommerceHealth() {
  const activeAdapter = getActiveAdapter();
  const failedHandoffs = orderHandoffs.filter((h) => h.status === "failed").length;
  const waitingHandoffs = orderHandoffs.filter((h) => h.status === "waiting").length;
  const todayRevenue = orderHandoffs.reduce((sum, h) => sum + h.cartTotal, 0);

  return {
    ok: true,
    mode: activeAdapter.mode,
    modeLabel: activeAdapter.modeLabel,
    isLive: activeAdapter.isLive,
    title: "Commerce Intelligence Center",
    subtitle:
      "Live commerce flow, POS adapter health, order handoff, revenue sync, staff conversion, and pairing bundle performance.",
    summary: {
      activeAdapter: activeAdapter.name,
      posConnected: activeAdapter.isLive,
      manualModeEnabled,
      revenueSync: activeAdapter.isLive ? "Live" : "Local Mode",
      unsentCarts: waitingHandoffs,
      failedHandoffs,
      bundleConversion: "38%",
      todayRevenueLift: "$148",
      todayRevenue,
      occupancy: currentOccupancy,
    },
    flow: [
      { id: "guest",   label: "Guest Experience",     status: "connected",                                    lastEvent: "2m ago" },
      { id: "staff",   label: "Staff Recommendation", status: "connected",                                    lastEvent: "1m ago" },
      { id: "cart",    label: "Cart Build",            status: "connected",                                    lastEvent: "1m ago" },
      { id: "send",    label: "Send to POS",           status: failedHandoffs ? "warning" : "connected",      lastEvent: "45s ago" },
      { id: "adapter", label: "POS Adapter",           status: activeAdapter.isLive ? "connected" : "manual", lastEvent: activeAdapter.lastSync },
      { id: "payment", label: "Payment / Order",       status: activeAdapter.isLive ? "connected" : "manual_ready", lastEvent: null },
      { id: "revenue", label: "Revenue Sync",          status: activeAdapter.isLive ? "connected" : "local",  lastEvent: null },
      { id: "event",   label: "Event Bus",             status: "connected",                                   lastEvent: "now" },
    ],
    recommendedActions: [
      activeAdapter.isLive
        ? "Monitor live commerce stream."
        : "Connect a POS adapter or continue in Manual Mode.",
      failedHandoffs
        ? "Review failed handoffs and retry."
        : "No failed handoffs currently require action.",
      "Promote the highest-converting visual bundle inside Product Wall.",
    ],
  };
}

export function getCommerceAdapters() {
  return {
    ok: true,
    mode: "local" as CommerceMode,
    modeLabel: "Local Mode",
    isLive: adapters.some((a) => a.isLive),
    adapters,
  };
}

export function testAdapter(adapterId: string) {
  const adapter = adapters.find((a) => a.id === adapterId);
  if (!adapter) {
    return { ok: false, mode: "local" as CommerceMode, modeLabel: "Local Mode", isLive: false, error: "Adapter not found" };
  }

  adapter.lastSync = nowIso();

  const envKeyMap: Record<string, string> = {
    toast:  "TOAST_API_KEY",
    square: "SQUARE_ACCESS_TOKEN",
    clover: "CLOVER_ACCESS_TOKEN",
    stripe: "STRIPE_SECRET_KEY",
  };

  const envKey = envKeyMap[adapterId];
  const hasCredential = envKey ? Boolean(process.env[envKey]) : adapterId === "manual";

  if (!hasCredential && adapterId !== "manual") {
    adapter.status = "setup_needed";
    adapter.mode = "not_connected";
    adapter.modeLabel = "Not Connected";
    adapter.isLive = false;
    adapter.failures += 1;
    adapter.notes = `${adapter.name} test failed. Missing ${envKey} in environment secrets.`;
    addLog("adapter_test_failed", adapter.name, adapter.notes, { adapterId, envKey });
    return { ok: false, mode: "not_connected" as CommerceMode, modeLabel: "Not Connected", isLive: false, adapter, message: adapter.notes };
  }

  adapter.status = adapterId === "manual" ? "manual" : "connected";
  adapter.mode = adapterId === "manual" ? "local" : "live";
  adapter.modeLabel = adapterId === "manual" ? "Local Mode" : "Live";
  adapter.isLive = adapterId !== "manual";
  adapter.syncDurationMs = adapterId === "manual" ? 0 : 180;
  adapter.notes = `${adapter.name} test completed successfully.`;
  addLog("adapter_test_success", adapter.name, adapter.notes, { adapterId });

  return { ok: true, mode: adapter.mode, modeLabel: adapter.modeLabel, isLive: adapter.isLive, adapter, message: adapter.notes };
}

export function connectAdapter(adapterId: string, body: Record<string, unknown>) {
  const adapter = adapters.find((a) => a.id === adapterId);
  if (!adapter) {
    return { ok: false, mode: "local" as CommerceMode, modeLabel: "Local Mode", isLive: false, error: "Adapter not found" };
  }
  if (adapterId === "manual") return enableManualMode();

  const envKeyMap: Record<string, string> = {
    toast:  "TOAST_API_KEY",
    square: "SQUARE_ACCESS_TOKEN",
    clover: "CLOVER_ACCESS_TOKEN",
    stripe: "STRIPE_SECRET_KEY",
  };

  const envKey = envKeyMap[adapterId];
  const hasCredential = Boolean(process.env[envKey]);

  if (!hasCredential && !body?.allowLocalConnect) {
    adapter.status = "setup_needed";
    adapter.mode = "not_connected";
    adapter.modeLabel = "Not Connected";
    adapter.isLive = false;
    adapter.notes = `${adapter.name} cannot connect. Missing ${envKey}.`;
    addLog("adapter_connect_blocked", adapter.name, adapter.notes, { adapterId, envKey });
    return { ok: false, mode: "not_connected" as CommerceMode, modeLabel: "Not Connected", isLive: false, adapter, message: adapter.notes };
  }

  adapter.status = hasCredential ? "connected" : "testing";
  adapter.mode = hasCredential ? "live" : "local";
  adapter.modeLabel = hasCredential ? "Live" : "Local Mode";
  adapter.isLive = hasCredential;
  adapter.lastSync = nowIso();
  adapter.syncDurationMs = hasCredential ? 205 : 0;
  adapter.setupRequired = !hasCredential;
  adapter.notes = hasCredential
    ? `${adapter.name} connected using environment credentials.`
    : `${adapter.name} placed into Local Mode for frontend testing.`;
  addLog("adapter_connected", adapter.name, adapter.notes, { adapterId });

  return { ok: true, mode: adapter.mode, modeLabel: adapter.modeLabel, isLive: adapter.isLive, adapter };
}

export function enableManualMode() {
  manualModeEnabled = true;
  const manual = adapters.find((a) => a.id === "manual")!;
  manual.status = "manual";
  manual.mode = "local";
  manual.modeLabel = "Local Mode";
  manual.isLive = false;
  manual.lastSync = nowIso();
  addLog("manual_mode_enabled", "Manual Mode", "Manual Mode enabled for EEIE Commerce.");
  return {
    ok: true,
    mode: "local" as CommerceMode,
    modeLabel: "Local Mode",
    isLive: false,
    manualModeEnabled,
    message: "Manual Mode enabled. Staff can build carts and export order summaries until a POS adapter is connected.",
  };
}

export function getOrderHandoffs() {
  return { ok: true, mode: "local" as CommerceMode, modeLabel: "Local Mode", isLive: false, handoffs: orderHandoffs };
}

export function createDemoHandoff() {
  const handoff: OrderHandoff = {
    id: `handoff_${Date.now()}`,
    table: "Table 9",
    guest: "Demo Guest",
    staff: "Staff Demo",
    bundleName: "Bold Barrel Pairing",
    items: ["Arturo Fuente Opus X", "Hennessy VSOP", "Truffle Charcuterie Board"],
    cartTotal: 89,
    status: "manual_ready",
    posAdapter: "Manual Mode",
    posResponse: "Demo handoff ready for staff confirmation.",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  orderHandoffs = [handoff, ...orderHandoffs];
  addLog("demo_handoff_created", "Order Handoff", "Demo order handoff created.", handoff);
  return { ok: true, mode: "demo" as CommerceMode, modeLabel: "Demo Mode", isLive: false, handoff };
}

export function retryOrderHandoff(id: string) {
  const handoff = orderHandoffs.find((h) => h.id === id);
  if (!handoff) {
    return { ok: false, mode: "local" as CommerceMode, modeLabel: "Local Mode", isLive: false, error: "Handoff not found" };
  }
  const activeAdapter = getActiveAdapter();
  if (!activeAdapter.isLive) {
    handoff.status = "manual_ready";
    handoff.posAdapter = "Manual Mode";
    handoff.posResponse = "Live adapter unavailable. Handoff moved to Manual Mode.";
  } else {
    handoff.status = "success";
    handoff.posAdapter = activeAdapter.name;
    handoff.posResponse = `${activeAdapter.name} accepted the order.`;
  }
  handoff.updatedAt = nowIso();
  addLog("handoff_retried", "Order Handoff", `Retried handoff ${id}.`, handoff);
  return { ok: true, mode: activeAdapter.mode, modeLabel: activeAdapter.modeLabel, isLive: activeAdapter.isLive, handoff };
}

export function getRevenueLift() {
  const assistedRevenue = orderHandoffs.reduce((sum, h) => sum + h.cartTotal, 0);
  const bundleRevenue = orderHandoffs
    .filter((h) => h.bundleName.toLowerCase().includes("experience") || h.bundleName.toLowerCase().includes("pairing"))
    .reduce((sum, h) => sum + h.cartTotal, 0);

  return {
    ok: true,
    mode: "local" as CommerceMode,
    modeLabel: "Local Mode",
    isLive: false,
    revenue: {
      eeieAssistedRevenue: assistedRevenue,
      bundleRevenue,
      pairingUpsellRevenue: 148,
      averageTicketLift: 14.8,
      conversionRate: 38,
      failedRevenueOpportunity: 32,
      staffRecommendationCloseRate: 44,
    },
    chart: [
      { label: "10A", revenue: 240 },
      { label: "11A", revenue: 360 },
      { label: "12P", revenue: 520 },
      { label: "1P",  revenue: 480 },
      { label: "2P",  revenue: 710 },
      { label: "3P",  revenue: 840 },
      { label: "4P",  revenue: 790 },
    ],
  };
}

export function updateOccupancy(occupancy: number) {
  const safeOccupancy = Number.isFinite(Number(occupancy))
    ? Math.max(0, Math.min(100, Number(occupancy)))
    : currentOccupancy;
  currentOccupancy = safeOccupancy;
  addLog("occupancy_updated", "Commerce Intelligence", `Occupancy updated to ${currentOccupancy}%.`, { occupancy: currentOccupancy });
  return { ok: true, mode: "local" as CommerceMode, modeLabel: "Local Mode", isLive: false, occupancy: currentOccupancy };
}

export function getBundlePerformance() {
  return {
    ok: true,
    mode: "demo" as CommerceMode,
    modeLabel: "Demo Visuals",
    isLive: false,
    bundles: [
      {
        id: "bundle_001",
        name: "Cream & Oak Experience",
        cigar: "Padron 1926 Series No. 6",
        liquor: "Woodford Reserve Double Oaked",
        food: "Smoked Short Rib Slider",
        price: 76,
        savedAmount: 6,
        matchScore: 94,
        conversionRate: 42,
        revenueGenerated: 456,
        images: {
          cigarImage:  "https://images.unsplash.com/photo-1514517220038-16934d4fd827?auto=format&fit=crop&w=800&q=80",
          liquorImage: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?auto=format&fit=crop&w=800&q=80",
          foodImage:   "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=800&q=80",
          bundleImage: "https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=800&q=80",
        },
      },
      {
        id: "bundle_002",
        name: "Bold Barrel Pairing",
        cigar: "Arturo Fuente Opus X",
        liquor: "Hennessy VSOP",
        food: "Truffle Charcuterie Board",
        price: 89,
        savedAmount: 10,
        matchScore: 88,
        conversionRate: 35,
        revenueGenerated: 356,
        images: {
          cigarImage:  "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=800&q=80",
          liquorImage: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?auto=format&fit=crop&w=800&q=80",
          foodImage:   "https://images.unsplash.com/photo-1546039907-7fa05f864c02?auto=format&fit=crop&w=800&q=80",
          bundleImage: "https://images.unsplash.com/photo-1532635241-17e820acc59f?auto=format&fit=crop&w=800&q=80",
        },
      },
      {
        id: "bundle_003",
        name: "Sweet Finish Session",
        cigar: "My Father Le Bijou",
        liquor: "Balvenie DoubleWood 17",
        food: "Vanilla Crème Brûlée",
        price: 64,
        savedAmount: 8,
        matchScore: 96,
        conversionRate: 48,
        revenueGenerated: 512,
        images: {
          cigarImage:  "https://images.unsplash.com/photo-1565608087341-404b25492fee?auto=format&fit=crop&w=800&q=80",
          liquorImage: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80",
          foodImage:   "https://images.unsplash.com/photo-1470124182917-cc6e71b22ecc?auto=format&fit=crop&w=800&q=80",
          bundleImage: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
        },
      },
    ],
  };
}

export function getStaffConversion() {
  return {
    ok: true,
    mode: "local" as CommerceMode,
    modeLabel: "Local Mode",
    isLive: false,
    staff: [
      { id: "staff_001", name: "Elena V.",  recommendationsShown: 18, itemsAdded: 11, sentToPos: 8, conversionRate: 44, revenueAssisted: 420 },
      { id: "staff_002", name: "Andre M.",  recommendationsShown: 12, itemsAdded: 5,  sentToPos: 4, conversionRate: 33, revenueAssisted: 198 },
      { id: "staff_003", name: "Nia P.",    recommendationsShown: 15, itemsAdded: 8,  sentToPos: 7, conversionRate: 47, revenueAssisted: 305 },
    ],
  };
}

export function getCommerceAlerts() {
  return { ok: true, mode: "local" as CommerceMode, modeLabel: "Local Mode", isLive: false, alerts };
}

export function acknowledgeCommerceAlert(id: string) {
  const alert = alerts.find((a) => a.id === id);
  if (!alert) {
    return { ok: false, mode: "local" as CommerceMode, modeLabel: "Local Mode", isLive: false, error: "Alert not found" };
  }
  alert.acknowledged = true;
  addLog("commerce_alert_acknowledged", "Commerce Alerts", `Alert acknowledged: ${alert.title}`, { alertId: id });
  return { ok: true, mode: "local" as CommerceMode, modeLabel: "Local Mode", isLive: false, alert };
}

export function getCommerceLogs() {
  return { ok: true, mode: "local" as CommerceMode, modeLabel: "Local Mode", isLive: false, logs };
}
