/* ══════════════════════════════════════════════════════════
   POSRouterEngine — Universal POS Translation Layer
   Normalizes Clover · Toast · Lightspeed · Square payloads
══════════════════════════════════════════════════════════ */

export type POSVendor = "clover" | "toast" | "lightspeed" | "square";

export interface RawCloverPayload {
  orderId: string;
  total: number;       // cents
  lineItems: { name: string; unitQty: number; price: number }[];
  employeeId: string;
  tableId?: string;
  createdAt: string;
}

export interface RawToastPayload {
  guid: string;
  checks: { selections: { displayName: string; quantity: number; price: number }[] }[];
  totalAmount: number;
  server: { guid: string };
  table?: { name: string };
  openedDate: string;
}

export interface RawLightspeedPayload {
  sale_id: string;
  totals: { totalTax: string; totalPayment: string };
  saleLines: { product: { description: string }; unitPrice: string; quantity: string }[];
  cashierId: string;
  completedAt: string;
}

export interface RawSquarePayload {
  payment: { id: string; amount_money: { amount: number }; created_at: string };
  order: {
    line_items: { name: string; quantity: string; base_price_money: { amount: number } }[];
    fulfillments?: { pickup_details?: { recipient?: { display_name?: string } } }[];
  };
  employee_id?: string;
}

export interface NormalizedTransaction {
  id: string;
  vendor: POSVendor;
  totalCents: number;
  items: { name: string; qty: number; priceCents: number; category: ItemCategory }[];
  staffId: string;
  tableLabel: string;
  timestamp: Date;
  multiplier: number;
  loyaltyPoints: number;
}

export type ItemCategory = "cigar" | "spirit" | "wine" | "beer" | "food" | "other";

const CIGAR_KEYWORDS   = ["cigar","padron","cohiba","arturo","fuente","opus","liga","romeo","davidoff","montecristo","plasencia","behike"];
const SPIRIT_KEYWORDS  = ["bourbon","whiskey","whisky","scotch","cognac","hennessy","macallan","pappy","forester","blanton","woodford","tequila","mezcal","rum","vodka","gin"];
const WINE_KEYWORDS    = ["wine","champagne","prosecco","malbec","cabernet","chardonnay","pinot","merlot","bordeaux","opus one","dom","pérignon"];
const BEER_KEYWORDS    = ["beer","lager","ale","stout","porter","ipa","craft","draft","pint"];
const FOOD_KEYWORDS    = ["plate","slider","bisque","truffle","wagyu","lobster","deviled","salad","appetizer","soup","sea bass","kitchen","pairing board"];

function categorize(name: string): ItemCategory {
  const n = name.toLowerCase();
  if (CIGAR_KEYWORDS.some(k => n.includes(k)))  return "cigar";
  if (SPIRIT_KEYWORDS.some(k => n.includes(k))) return "spirit";
  if (WINE_KEYWORDS.some(k => n.includes(k)))   return "wine";
  if (BEER_KEYWORDS.some(k => n.includes(k)))   return "beer";
  if (FOOD_KEYWORDS.some(k => n.includes(k)))   return "food";
  return "other";
}

/* ── Spend multiplier cheat codes ── */
export type MultiplierCode = "2x" | "3x" | "5x";

const SPEND_THRESHOLDS: [number, MultiplierCode][] = [
  [50000, "5x"],   // $500+
  [25000, "3x"],   // $250+
  [10000, "2x"],   // $100+
];

function resolveMultiplier(totalCents: number, override?: MultiplierCode): number {
  if (override === "5x") return 5;
  if (override === "3x") return 3;
  if (override === "2x") return 2;
  for (const [threshold, code] of SPEND_THRESHOLDS) {
    if (totalCents >= threshold) {
      const mp = code === "5x" ? 5 : code === "3x" ? 3 : 2;
      return mp;
    }
  }
  return 1;
}

const BASE_POINTS_PER_DOLLAR = 10;

function calcPoints(totalCents: number, multiplier: number): number {
  return Math.round((totalCents / 100) * BASE_POINTS_PER_DOLLAR * multiplier);
}

/* ════════════════════════════ NORMALIZERS ════════════════════════════ */

function fromClover(raw: RawCloverPayload, override?: MultiplierCode): NormalizedTransaction {
  const items = raw.lineItems.map(i => ({
    name: i.name, qty: i.unitQty, priceCents: i.price, category: categorize(i.name),
  }));
  const multiplier = resolveMultiplier(raw.total, override);
  return {
    id: raw.orderId, vendor: "clover",
    totalCents: raw.total, items,
    staffId: raw.employeeId,
    tableLabel: raw.tableId ?? "—",
    timestamp: new Date(raw.createdAt),
    multiplier, loyaltyPoints: calcPoints(raw.total, multiplier),
  };
}

function fromToast(raw: RawToastPayload, override?: MultiplierCode): NormalizedTransaction {
  const items = raw.checks.flatMap(c => c.selections.map(s => ({
    name: s.displayName, qty: s.quantity, priceCents: s.price, category: categorize(s.displayName),
  })));
  const multiplier = resolveMultiplier(raw.totalAmount, override);
  return {
    id: raw.guid, vendor: "toast",
    totalCents: raw.totalAmount, items,
    staffId: raw.server.guid,
    tableLabel: raw.table?.name ?? "—",
    timestamp: new Date(raw.openedDate),
    multiplier, loyaltyPoints: calcPoints(raw.totalAmount, multiplier),
  };
}

function fromLightspeed(raw: RawLightspeedPayload, override?: MultiplierCode): NormalizedTransaction {
  const totalCents = Math.round(parseFloat(raw.totals.totalPayment) * 100);
  const items = raw.saleLines.map(l => ({
    name: l.product.description,
    qty: parseInt(l.quantity, 10),
    priceCents: Math.round(parseFloat(l.unitPrice) * 100),
    category: categorize(l.product.description),
  }));
  const multiplier = resolveMultiplier(totalCents, override);
  return {
    id: raw.sale_id, vendor: "lightspeed",
    totalCents, items,
    staffId: raw.cashierId,
    tableLabel: "—",
    timestamp: new Date(raw.completedAt),
    multiplier, loyaltyPoints: calcPoints(totalCents, multiplier),
  };
}

function fromSquare(raw: RawSquarePayload, override?: MultiplierCode): NormalizedTransaction {
  const totalCents = raw.payment.amount_money.amount;
  const items = (raw.order?.line_items ?? []).map(i => ({
    name: i.name,
    qty: parseInt(i.quantity, 10),
    priceCents: i.base_price_money.amount,
    category: categorize(i.name),
  }));
  const multiplier = resolveMultiplier(totalCents, override);
  return {
    id: raw.payment.id, vendor: "square",
    totalCents, items,
    staffId: raw.employee_id ?? "—",
    tableLabel: "—",
    timestamp: new Date(raw.payment.created_at),
    multiplier, loyaltyPoints: calcPoints(totalCents, multiplier),
  };
}

/* ════════════════════════════ ENGINE CLASS ════════════════════════════ */

export class POSRouterEngine {
  private history: NormalizedTransaction[] = [];
  private vendorStatus: Record<POSVendor, "connected" | "degraded" | "offline"> = {
    clover:     "connected",
    toast:      "connected",
    lightspeed: "degraded",
    square:     "offline",
  };

  normalize(
    vendor: POSVendor,
    raw: RawCloverPayload | RawToastPayload | RawLightspeedPayload | RawSquarePayload,
    multiplierOverride?: MultiplierCode,
  ): NormalizedTransaction {
    let tx: NormalizedTransaction;
    switch (vendor) {
      case "clover":     tx = fromClover(raw as RawCloverPayload, multiplierOverride);     break;
      case "toast":      tx = fromToast(raw as RawToastPayload, multiplierOverride);       break;
      case "lightspeed": tx = fromLightspeed(raw as RawLightspeedPayload, multiplierOverride); break;
      case "square":     tx = fromSquare(raw as RawSquarePayload, multiplierOverride);     break;
    }
    this.history.push(tx);
    return tx;
  }

  getHistory(): NormalizedTransaction[] { return [...this.history]; }

  getVendorStatus(v: POSVendor) { return this.vendorStatus[v]; }

  setVendorStatus(v: POSVendor, s: "connected" | "degraded" | "offline") {
    this.vendorStatus[v] = s;
  }

  getAllVendorStatuses() { return { ...this.vendorStatus }; }

  getTotalRevenue(): number {
    return this.history.reduce((s, t) => s + t.totalCents, 0);
  }

  getTotalLoyaltyPoints(): number {
    return this.history.reduce((s, t) => s + t.loyaltyPoints, 0);
  }
}

export const posRouter = new POSRouterEngine();
