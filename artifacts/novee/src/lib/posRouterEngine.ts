/**
 * posRouterEngine.ts — Frontend POS State-Binding Layer (NOVEE OS)
 *
 * subscribe(venueId, callbacks) joins `venue:<venueId>` and listens for:
 *   pos:ORDER_PLACED    — the ONLY event that triggers XP + inventory decrement
 *   pos:ITEM_ADDED / pos:TAB_CLOSED / pos:PAYMENT_COMPLETE — analytics only
 *   pos_order           — legacy webhook/direct-trigger compat
 *
 * Deduplication: short-lived Set of processed sessionIds prevents double-firing.
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

export interface PosLiveEvent {
  eventType:  "ORDER_PLACED" | "ITEM_ADDED" | "TAB_CLOSED" | "PAYMENT_COMPLETE";
  vendor?:    string;
  venueId?:   string;
  lineItems:  PosLineItem[];
  totalCents: number;
  sessionId?: string;
  ts:         number;
}

export interface NoveePOSCallbacks {
  onSynergyXP:          (result: SynergyResult) => void;
  onInventoryDecrement: (items: { name: string; qty: number }[]) => void;
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
    socket.on("pos_order",           this._onOrder);
  }

  private _onLive = (ev: PosLiveEvent): void => {
    if (!this.cbs) return;
    if (ev.venueId && this.venueId && ev.venueId !== this.venueId) return;

    this.cbs.onLiveEvent?.(ev);
    window.dispatchEvent(new CustomEvent("novee:pos_live_event", { detail: ev }));

    // XP + inventory only for ORDER_PLACED
    if (ev.eventType !== "ORDER_PLACED") return;

    if (ev.sessionId) {
      this._pruneProcessed();
      if (this.processed.has(ev.sessionId)) return;
      this.processed.set(ev.sessionId, Date.now());
    }

    const itemNames = ev.lineItems.map(i => i.name);
    const m = getMultiplier();
    const s = calcSynergyXP(itemNames, m);

    if (s.xpAwarded > 0) this.cbs.onSynergyXP(s);

    const decrementItems = ev.lineItems
      .filter(i => i.name && i.qty > 0)
      .map(i => ({ name: i.name, qty: i.qty }));
    if (decrementItems.length) this.cbs.onInventoryDecrement(decrementItems);

    if (ev.sessionId) this._trackSpend(ev.sessionId, ev.totalCents);
  };

  private _onOrder = (ev: { orderType: string | null; items: string[]; venueId?: string; ts: number }): void => {
    if (!this.cbs) return;
    if (ev.venueId && this.venueId && ev.venueId !== this.venueId) return;

    const items = ev.items ?? [];
    const m = getMultiplier();
    const s = calcSynergyXP(items, m);

    if (s.xpAwarded > 0) this.cbs.onSynergyXP(s);
    if (items.length) {
      this.cbs.onInventoryDecrement(items.map(n => ({ name: n, qty: 1 })));
    }

    const liveEv: PosLiveEvent = {
      eventType: "ORDER_PLACED",
      venueId:   ev.venueId,
      lineItems: items.map(n => ({ name: n, productId: "", qty: 1, priceCents: 0 })),
      totalCents: 0,
      ts: ev.ts,
    };
    this.cbs.onLiveEvent?.(liveEv);
    window.dispatchEvent(new CustomEvent("novee:pos_live_event", { detail: liveEv }));
  };

  private _trackSpend(sessionId: string, totalCents: number): void {
    const existing = this.sessions.get(sessionId);
    this.sessions.set(sessionId, {
      sessionId,
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
    socket.off("pos_order",           this._onOrder);
    this.cbs     = null;
    this.venueId = null;
    this.processed.clear();
  }
}

export const noveePosRouterEngine = new NoveePOSRouterEngineClass();
