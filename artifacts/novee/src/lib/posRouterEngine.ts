/**
 * posRouterEngine.ts — Frontend POS State-Binding Layer (NOVEE OS)
 *
 * subscribe(venueId, callbacks) opens a venue-scoped channel using the
 * existing Socket.IO singleton at /api/socket.io.  Joins `venue:<venueId>`
 * and listens for four normalised event types:
 *
 *   pos:ORDER_PLACED    — new order confirmed at the POS terminal
 *   pos:ITEM_ADDED      — line item added to an open tab
 *   pos:TAB_CLOSED      — tab settled / guest checked out
 *   pos:PAYMENT_COMPLETE — payment fully captured
 *
 * Legacy events (`pos_order`, `pos_order_complete`) handled for backwards compat.
 *
 * Synergy XP table:
 *   Cigar only:              +5 XP
 *   Cigar + Spirit:         +12 XP
 *   Cigar + Spirit + Food:  +22 XP
 * Multipliers: 2x / 3x / 5x from localStorage `pos_multiplier_active`
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

// ── Synergy XP ────────────────────────────────────────────────────────────────

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

// ── Active session tracking ───────────────────────────────────────────────────

export interface ActiveSession {
  sessionId:    string;
  totalSpent:   number;
  lastActivity: number;
}

// ── Normalized POS line item ──────────────────────────────────────────────────

export interface PosLineItem {
  name:       string;
  productId:  string;
  qty:        number;
  priceCents: number;
}

// ── Normalized live event ─────────────────────────────────────────────────────

export interface PosLiveEvent {
  eventType:  "ORDER_PLACED" | "ITEM_ADDED" | "TAB_CLOSED" | "PAYMENT_COMPLETE";
  vendor?:    string;
  venueId?:   string;
  lineItems:  PosLineItem[];
  totalCents: number;
  sessionId?: string;
  ts:         number;
}

// ── Legacy shapes ─────────────────────────────────────────────────────────────

interface PosOrderEvent {
  orderType: string | null;
  items:     string[];
  venueId?:  string;
  ts:        number;
}

interface PosOrderCompleteEvent {
  vendor:          string;
  venueId?:        string;
  lineItems:       PosLineItem[];
  totalCents:      number;
  guestSessionId?: string;
  timestamp:       string;
}

// ── Callbacks ─────────────────────────────────────────────────────────────────

export interface NoveePOSCallbacks {
  onSynergyXP:          (result: SynergyResult) => void;
  /** qty-accurate item list for inventory state binding */
  onInventoryDecrement: (items: { name: string; qty: number }[]) => void;
  onLiveEvent?:         (event: PosLiveEvent) => void;
}

// ── Engine ────────────────────────────────────────────────────────────────────

class NoveePOSRouterEngineClass {
  private cbs:     NoveePOSCallbacks | null = null;
  private venueId: string | null           = null;
  private sessions = new Map<string, ActiveSession>();

  /**
   * Join venue room and subscribe to all four normalized POS event types.
   * Call destroy() first if re-subscribing with a new venueId.
   */
  subscribe(venueId: string, callbacks: NoveePOSCallbacks): void {
    this.destroy();
    this.venueId = venueId;
    this.cbs     = callbacks;

    socket.emit("join_venue", { venueId });

    socket.on("pos:ORDER_PLACED",    this._onLive);
    socket.on("pos:ITEM_ADDED",      this._onLive);
    socket.on("pos:TAB_CLOSED",      this._onLive);
    socket.on("pos:PAYMENT_COMPLETE",this._onLive);

    socket.on("pos_order",          this._onOrder);
    socket.on("pos_order_complete", this._onComplete);
  }

  // ── Normalized event handler ──────────────────────────────────────────────

  private _onLive = (ev: PosLiveEvent): void => {
    if (!this.cbs) return;
    if (ev.venueId && this.venueId && ev.venueId !== this.venueId) return;

    const itemNames = ev.lineItems.map(i => i.name);
    const m = getMultiplier();
    const s = calcSynergyXP(itemNames, m);

    if (s.xpAwarded > 0) this.cbs.onSynergyXP(s);

    const decrementItems = ev.lineItems
      .filter(i => i.name && i.qty > 0)
      .map(i => ({ name: i.name, qty: i.qty }));
    if (decrementItems.length) this.cbs.onInventoryDecrement(decrementItems);

    if (ev.sessionId) this._trackSpend(ev.sessionId, ev.totalCents);

    this.cbs.onLiveEvent?.(ev);

    // Dispatch DOM event so inventoryState.ts consumers can react
    window.dispatchEvent(new CustomEvent("novee:pos_live_event", { detail: ev }));
  };

  // ── Legacy: pos_order ─────────────────────────────────────────────────────

  private _onOrder = (ev: PosOrderEvent): void => {
    if (!this.cbs) return;
    if (ev.venueId && this.venueId && ev.venueId !== this.venueId) return;

    const items = ev.items ?? [];
    const m = getMultiplier();
    const s = calcSynergyXP(items, m);

    if (s.xpAwarded > 0) this.cbs.onSynergyXP(s);
    if (items.length) {
      this.cbs.onInventoryDecrement(items.map(n => ({ name: n, qty: 1 })));
    }

    this.cbs.onLiveEvent?.({
      eventType: "ORDER_PLACED",
      venueId:   ev.venueId,
      lineItems: items.map(n => ({ name: n, productId: "", qty: 1, priceCents: 0 })),
      totalCents: 0,
      ts: ev.ts,
    });
  };

  // ── Legacy: pos_order_complete ────────────────────────────────────────────

  private _onComplete = (ev: PosOrderCompleteEvent): void => {
    if (!this.cbs) return;
    if (ev.venueId && this.venueId && ev.venueId !== this.venueId) return;

    const lineItems = ev.lineItems ?? [];
    const names     = lineItems.map(i => i.name).filter(Boolean);
    const m = getMultiplier();
    const s = calcSynergyXP(names, m);

    if (s.xpAwarded > 0) this.cbs.onSynergyXP(s);

    const decrementItems = lineItems
      .filter(i => i.name && i.qty > 0)
      .map(i => ({ name: i.name, qty: i.qty }));
    if (decrementItems.length) this.cbs.onInventoryDecrement(decrementItems);

    const sessionId = ev.guestSessionId;
    if (sessionId) this._trackSpend(sessionId, ev.totalCents);

    this.cbs.onLiveEvent?.({
      eventType: "PAYMENT_COMPLETE",
      vendor:    ev.vendor,
      venueId:   ev.venueId,
      lineItems,
      totalCents: ev.totalCents,
      sessionId,
      ts: Date.now(),
    });

    window.dispatchEvent(new CustomEvent("novee:inventory_decrement", {
      detail: { itemNames: names },
    }));
  };

  // ── Session spend ledger ──────────────────────────────────────────────────

  private _trackSpend(sessionId: string, totalCents: number): void {
    const existing = this.sessions.get(sessionId);
    this.sessions.set(sessionId, {
      sessionId,
      totalSpent:   (existing?.totalSpent ?? 0) + totalCents,
      lastActivity: Date.now(),
    });
  }

  /** All active sessions for E.A.T Terminal display */
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
    socket.off("pos_order_complete",  this._onComplete);
    this.cbs     = null;
    this.venueId = null;
  }
}

export const noveePosRouterEngine = new NoveePOSRouterEngineClass();
