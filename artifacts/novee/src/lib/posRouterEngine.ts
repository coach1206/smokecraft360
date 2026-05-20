/**
 * posRouterEngine.ts — Frontend POS State-Binding Layer (NOVEE OS)
 *
 * CANONICAL CHANNEL: pos:ORDER_PLACED — the ONLY trigger for XP + inventory.
 * All other channels are analytics-only (no side effects).
 *
 * Legacy pos_order is analytics-only to prevent double-processing:
 * posOrders.ts emits both pos_order + pos:ORDER_PLACED for the same request.
 * Processing side effects only in pos:ORDER_PLACED eliminates duplicate awards.
 *
 * Contract fields: vendor?, venueId?, lineItems[], totalCents, guestSessionId?, timestamp
 */

import { socket } from "./socket";

// ── Item classification ───────────────────────────────────────────────────────

const CIGAR_KW  = ["cigar","padron","cohiba","arturo","fuente","opus","liga","romeo","davidoff","montecristo","plasencia","behike"];
const SPIRIT_KW = ["bourbon","whiskey","whisky","scotch","cognac","hennessy","macallan","rum","vodka","gin","tequila","mezcal","brandy","armagnac"];
const FOOD_KW   = ["plate","slider","truffle","wagyu","lobster","deviled","salad","cheese","chocolate","charcuterie","nuts","pairing","appetizer","soup"];

type ItemCategory = "cigar" | "spirit" | "food" | "other";

function classify(name: string): ItemCategory {
  const n = name.toLowerCase();
  if (CIGAR_KW.some(k  => n.includes(k))) return "cigar";
  if (SPIRIT_KW.some(k => n.includes(k))) return "spirit";
  if (FOOD_KW.some(k   => n.includes(k))) return "food";
  return "other";
}

export interface SynergyResult {
  xpAwarded:  number;
  multiplier: number;
  breakdown:  string;
}

function getMultiplier(): number {
  try {
    const flag = localStorage.getItem("pos_multiplier_active");
    if (flag === "5x") return 5;
    if (flag === "3x") return 3;
    if (flag === "2x") return 2;
  } catch { /* SSR */ }
  return 1;
}

function calcSynergyXP(itemNames: string[], multiplier: number): SynergyResult {
  const cats = new Set(itemNames.map(classify));
  let base = 0, breakdown = "";
  if (cats.has("cigar") && cats.has("spirit") && cats.has("food")) { base = 22; breakdown = "Cigar + Spirit + Food"; }
  else if (cats.has("cigar") && cats.has("spirit"))                { base = 12; breakdown = "Cigar + Spirit"; }
  else if (cats.has("cigar"))                                      { base = 5;  breakdown = "Cigar"; }
  return { xpAwarded: Math.round(base * multiplier), multiplier, breakdown };
}

export interface ActiveSession {
  sessionId:    string;
  totalSpent:   number;
  lastActivity: number;
}

export interface PosLineItem {
  name:       string;
  productId:  string;
  qty:        number;
  priceCents: number;
}

// Contract fields match backend: guestSessionId, timestamp
export interface PosLiveEvent {
  eventType:       "ORDER_PLACED" | "ITEM_ADDED" | "TAB_CLOSED" | "PAYMENT_COMPLETE";
  vendor?:         string;
  venueId?:        string;
  lineItems:       PosLineItem[];
  totalCents:      number;
  guestSessionId?: string;
  timestamp:       string;
}

export interface NoveePOSCallbacks {
  onSynergyXP:          (result: SynergyResult) => void;
  /** qty-accurate — fires only on ORDER_PLACED */
  onInventoryDecrement: (items: { name: string; qty: number }[]) => void;
  /** Analytics-only — all event types */
  onLiveEvent?:         (event: PosLiveEvent) => void;
}

class NoveePOSRouterEngineClass {
  private cbs:       NoveePOSCallbacks | null = null;
  private venueId:   string | null           = null;
  private sessions   = new Map<string, ActiveSession>();
  private processed  = new Map<string, number>();

  subscribe(venueId: string, callbacks: NoveePOSCallbacks): void {
    this.destroy();
    this.venueId = venueId;
    this.cbs     = callbacks;
    socket.emit("join_venue", { venueId });

    socket.on("pos:ORDER_PLACED",    this._onLive);
    socket.on("pos:ITEM_ADDED",      this._onLive);
    socket.on("pos:TAB_CLOSED",      this._onLive);
    socket.on("pos:PAYMENT_COMPLETE",this._onLive);

    // Legacy — analytics-only, no side effects
    socket.on("pos_order",           this._onOrderAnalyticsOnly);
  }

  private _onLive = (ev: PosLiveEvent): void => {
    if (!this.cbs) return;
    if (ev.venueId && this.venueId && ev.venueId !== this.venueId) return;

    this.cbs.onLiveEvent?.(ev);
    window.dispatchEvent(new CustomEvent("novee:pos_live_event", { detail: ev }));

    if (ev.eventType !== "ORDER_PLACED") return;

    // Dedup by composite key (sessionId + timestamp) — prevents double-firing when
    // the EXACT same event arrives twice (network retry), while allowing multiple
    // distinct orders from the same session within the 30s window.
    const dedupKey = `${ev.guestSessionId ?? "anon"}:${ev.timestamp}`;
    this._pruneProcessed();
    if (this.processed.has(dedupKey)) return;
    this.processed.set(dedupKey, Date.now());

    const itemNames = ev.lineItems.map(i => i.name);
    const m = getMultiplier();
    const s = calcSynergyXP(itemNames, m);

    if (s.xpAwarded > 0) this.cbs.onSynergyXP(s);

    const decrements = ev.lineItems
      .filter(i => i.name && i.qty > 0)
      .map(i => ({ name: i.name, qty: i.qty }));
    if (decrements.length) this.cbs.onInventoryDecrement(decrements);

    // Spend tracking is always keyed by sessionId — independent of dedup gate
    if (ev.guestSessionId) this._trackSpend(ev.guestSessionId, ev.totalCents);
  };

  // Legacy: analytics-only — no XP, no inventory decrement
  private _onOrderAnalyticsOnly = (ev: {
    orderType: string | null; items: string[]; venueId?: string; ts: number;
  }): void => {
    if (!this.cbs) return;
    if (ev.venueId && this.venueId && ev.venueId !== this.venueId) return;

    const liveEv: PosLiveEvent = {
      eventType:  "ORDER_PLACED",
      venueId:    ev.venueId,
      lineItems:  (ev.items ?? []).map(n => ({ name: n, productId: "", qty: 1, priceCents: 0 })),
      totalCents: 0,
      timestamp:  new Date(ev.ts).toISOString(),
    };
    this.cbs.onLiveEvent?.(liveEv);
  };

  private _trackSpend(guestSessionId: string, totalCents: number): void {
    const existing = this.sessions.get(guestSessionId);
    this.sessions.set(guestSessionId, {
      sessionId:    guestSessionId,
      totalSpent:   (existing?.totalSpent ?? 0) + totalCents,
      lastActivity: Date.now(),
    });
  }

  private _pruneProcessed(): void {
    const cutoff = Date.now() - 30_000;
    for (const [id, ts] of this.processed) {
      if (ts < cutoff) this.processed.delete(id);
    }
  }

  getActiveSessions(): ActiveSession[] {
    const cutoff = Date.now() - 4 * 60 * 60 * 1000;
    for (const [id, s] of this.sessions) {
      if (s.lastActivity < cutoff) this.sessions.delete(id);
    }
    return Array.from(this.sessions.values()).sort((a, b) => b.lastActivity - a.lastActivity);
  }

  destroy(): void {
    socket.off("pos:ORDER_PLACED",    this._onLive);
    socket.off("pos:ITEM_ADDED",      this._onLive);
    socket.off("pos:TAB_CLOSED",      this._onLive);
    socket.off("pos:PAYMENT_COMPLETE",this._onLive);
    socket.off("pos_order",           this._onOrderAnalyticsOnly);
    this.cbs     = null;
    this.venueId = null;
    this.processed.clear();
  }
}

export const noveePosRouterEngine = new NoveePOSRouterEngineClass();
