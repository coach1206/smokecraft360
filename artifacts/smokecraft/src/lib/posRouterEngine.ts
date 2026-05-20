/**
 * posRouterEngine.ts — Frontend POS State-Binding Layer (SmokeCraft)
 *
 * subscribe(venueId, callbacks) opens a venue-scoped socket channel to the
 * existing Socket.IO infra at /api/socket.io.  The engine joins the
 * `venue:<venueId>` room and listens for four normalized event types:
 *
 *   pos:ORDER_PLACED    — new order confirmed at the POS terminal
 *   pos:ITEM_ADDED      — line item added to an open tab
 *   pos:TAB_CLOSED      — tab settled / guest checked out
 *   pos:PAYMENT_COMPLETE — payment fully captured
 *
 * Legacy events (`pos_order`, `pos_order_complete`) are also handled for
 * backwards compatibility with direct-trigger and webhook paths.
 *
 * Per event the engine:
 *  1. Filters out any event whose venueId does not match the subscribed venue
 *  2. Classifies line items into cigar / spirit / food / other
 *  3. Computes flavor synergy XP with optional spend multiplier
 *  4. Dispatches qty-accurate inventory decrements to PosContext
 *  5. Maintains a per-session spend ledger for E.A.T Terminal display
 */

import { socket } from "@/lib/socket";

// ── Item category classification ──────────────────────────────────────────────

const CIGAR_KW  = ["cigar","padron","cohiba","arturo","fuente","opus","liga","romeo","davidoff","montecristo","plasencia","behike"];
const SPIRIT_KW = ["bourbon","whiskey","whisky","scotch","cognac","hennessy","macallan","rum","vodka","gin","tequila","mezcal","brandy","armagnac"];
const FOOD_KW   = ["plate","slider","truffle","wagyu","lobster","deviled","salad","cheese","chocolate","charcuterie","nuts","pairing","appetizer","soup"];

export type ItemCategory = "cigar" | "spirit" | "food" | "other";

function classify(name: string): ItemCategory {
  const n = name.toLowerCase();
  if (CIGAR_KW.some(k  => n.includes(k))) return "cigar";
  if (SPIRIT_KW.some(k => n.includes(k))) return "spirit";
  if (FOOD_KW.some(k   => n.includes(k))) return "food";
  return "other";
}

// ── Synergy XP table ──────────────────────────────────────────────────────────
//   Cigar only:              +5 XP
//   Cigar + Spirit:         +12 XP
//   Cigar + Spirit + Food:  +22 XP

export interface SynergyResult {
  xpAwarded:  number;
  multiplier: number;
  breakdown:  string;
  categories: ItemCategory[];
}

function calcSynergyXP(itemNames: string[], multiplier: number): SynergyResult {
  const categories = Array.from(new Set(itemNames.map(classify)));
  const has = (c: ItemCategory) => categories.includes(c);

  let base = 0;
  let breakdown = "";

  if (has("cigar") && has("spirit") && has("food")) {
    base = 22; breakdown = "Cigar + Spirit + Food";
  } else if (has("cigar") && has("spirit")) {
    base = 12; breakdown = "Cigar + Spirit";
  } else if (has("cigar")) {
    base = 5;  breakdown = "Cigar";
  }

  return { xpAwarded: Math.round(base * multiplier), multiplier, breakdown, categories };
}

// ── Active multiplier from localStorage ──────────────────────────────────────

function getMultiplier(): number {
  try {
    const flag = localStorage.getItem("pos_multiplier_active");
    if (flag === "5x") return 5;
    if (flag === "3x") return 3;
    if (flag === "2x") return 2;
  } catch { /* SSR */ }
  return 1;
}

// ── Active session tracking ───────────────────────────────────────────────────

export interface ActiveSession {
  sessionId:    string;
  guestName?:   string;
  totalSpent:   number;
  lastActivity: number;
}

// ── Normalized POS line item (shared across event types) ─────────────────────

export interface PosLineItem {
  name:       string;
  productId:  string;
  qty:        number;
  priceCents: number;
}

// ── Normalized event shape emitted to frontend ────────────────────────────────
// All four event types share this contract.  `eventType` is the discriminant.

export interface PosLiveEvent {
  eventType:      "ORDER_PLACED" | "ITEM_ADDED" | "TAB_CLOSED" | "PAYMENT_COMPLETE";
  vendor?:        string;
  venueId?:       string;
  lineItems:      PosLineItem[];
  totalCents:     number;
  sessionId?:     string;   // POS-side order / tab correlation ID
  ts:             number;
}

// ── Legacy socket event shapes (backwards compat) ────────────────────────────

interface PosOrderSocketEvent {
  orderType:  string | null;
  items:      string[];
  venueId?:   string;
  tableId?:   string;
  ts:         number;
}

interface PosOrderCompleteEvent {
  vendor:         string;
  venueId?:       string;
  lineItems:      PosLineItem[];
  totalCents:     number;
  guestSessionId?: string;
  timestamp:      string;
}

// ── Callbacks injected by PosContext ──────────────────────────────────────────

export interface POSRouterCallbacks {
  /** Called when synergy XP should be awarded (cigar/spirit/food combo) */
  onSynergyXP: (result: SynergyResult) => void;
  /** Called with qty-accurate line items that should have stock decremented */
  onInventoryDecrement: (items: { name: string; qty: number }[]) => void;
  /** Called on any live event — for analytics / display */
  onLiveEvent?: (event: PosLiveEvent) => void;
}

// ── Engine class ──────────────────────────────────────────────────────────────

class POSRouterEngineClass {
  private callbacks: POSRouterCallbacks | null = null;
  private venueId:   string | null             = null;
  private sessions   = new Map<string, ActiveSession>();

  /**
   * Open the venue-scoped live-events channel.
   *
   * Joins `venue:<venueId>` room so the server routes events only to this
   * venue's clients.  Listens for all four normalised event types plus legacy
   * fallbacks.  Call destroy() before calling subscribe() again.
   */
  subscribe(venueId: string, callbacks: POSRouterCallbacks): void {
    this.destroy();
    this.venueId   = venueId;
    this.callbacks = callbacks;

    // Join venue room — server routes pos:* events to this room
    socket.emit("join_venue", { venueId });

    // ── Normalized live-event channel (/api/pos/live-events semantics)
    socket.on("pos:ORDER_PLACED",    this._handleLiveEvent);
    socket.on("pos:ITEM_ADDED",      this._handleLiveEvent);
    socket.on("pos:TAB_CLOSED",      this._handleLiveEvent);
    socket.on("pos:PAYMENT_COMPLETE",this._handleLiveEvent);

    // ── Legacy fallbacks (direct-trigger + webhook paths)
    socket.on("pos_order",           this._handleOrder);
    socket.on("pos_order_complete",  this._handleOrderComplete);
  }

  // ── Normalized event handler (all four types) ─────────────────────────────

  private _handleLiveEvent = (ev: PosLiveEvent): void => {
    if (!this.callbacks) return;
    // Venue-scope guard — ignore cross-venue events that slip through
    if (ev.venueId && this.venueId && ev.venueId !== this.venueId) return;

    const itemNames  = ev.lineItems.map(i => i.name);
    const multiplier = getMultiplier();
    const synergy    = calcSynergyXP(itemNames, multiplier);

    if (synergy.xpAwarded > 0) {
      this.callbacks.onSynergyXP(synergy);
    }

    // Qty-accurate decrement
    const decrementItems = ev.lineItems
      .filter(i => i.name && i.qty > 0)
      .map(i => ({ name: i.name, qty: i.qty }));
    if (decrementItems.length) {
      this.callbacks.onInventoryDecrement(decrementItems);
    }

    // Session spend tracking
    if (ev.sessionId) {
      this._trackSpend(ev.sessionId, ev.totalCents);
    }

    this.callbacks.onLiveEvent?.(ev);
  };

  // ── Legacy: pos_order (direct trigger / webhook)  ────────────────────────

  private _handleOrder = (ev: PosOrderSocketEvent): void => {
    if (!this.callbacks) return;
    if (ev.venueId && this.venueId && ev.venueId !== this.venueId) return;

    const items      = ev.items ?? [];
    const multiplier = getMultiplier();
    const synergy    = calcSynergyXP(items, multiplier);

    if (synergy.xpAwarded > 0) this.callbacks.onSynergyXP(synergy);
    if (items.length) {
      // Legacy path has no qty — assume 1 per item
      this.callbacks.onInventoryDecrement(items.map(n => ({ name: n, qty: 1 })));
    }

    this.callbacks.onLiveEvent?.({
      eventType: "ORDER_PLACED",
      venueId:   ev.venueId,
      lineItems: items.map(n => ({ name: n, productId: "", qty: 1, priceCents: 0 })),
      totalCents: 0,
      ts: ev.ts,
    });
  };

  // ── Legacy: pos_order_complete (from unifiedPosBridge.pushOrder) ──────────

  private _handleOrderComplete = (ev: PosOrderCompleteEvent): void => {
    if (!this.callbacks) return;
    if (ev.venueId && this.venueId && ev.venueId !== this.venueId) return;

    const lineItems  = ev.lineItems ?? [];
    const itemNames  = lineItems.map(i => i.name).filter(n => n.length > 0);
    const multiplier = getMultiplier();
    const synergy    = calcSynergyXP(itemNames, multiplier);

    if (synergy.xpAwarded > 0) this.callbacks.onSynergyXP(synergy);

    // Qty-accurate from enriched payload
    const decrementItems = lineItems
      .filter(i => i.name && i.qty > 0)
      .map(i => ({ name: i.name, qty: i.qty }));
    if (decrementItems.length) {
      this.callbacks.onInventoryDecrement(decrementItems);
    }

    const sessionId = ev.guestSessionId;
    if (sessionId) this._trackSpend(sessionId, ev.totalCents);

    this.callbacks.onLiveEvent?.({
      eventType: "PAYMENT_COMPLETE",
      vendor:    ev.vendor,
      venueId:   ev.venueId,
      lineItems,
      totalCents: ev.totalCents,
      sessionId,
      ts: Date.now(),
    });
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

  /** Returns all tracked active sessions (for display in E.A.T Terminal) */
  getActiveSessions(): ActiveSession[] {
    const cutoff = Date.now() - 4 * 60 * 60 * 1000; // 4-hour idle prune
    for (const [id, s] of this.sessions) {
      if (s.lastActivity < cutoff) this.sessions.delete(id);
    }
    return Array.from(this.sessions.values()).sort((a, b) => b.lastActivity - a.lastActivity);
  }

  /** Unsubscribe all socket listeners and clear state */
  destroy(): void {
    socket.off("pos:ORDER_PLACED",    this._handleLiveEvent);
    socket.off("pos:ITEM_ADDED",      this._handleLiveEvent);
    socket.off("pos:TAB_CLOSED",      this._handleLiveEvent);
    socket.off("pos:PAYMENT_COMPLETE",this._handleLiveEvent);
    socket.off("pos_order",           this._handleOrder);
    socket.off("pos_order_complete",  this._handleOrderComplete);
    this.callbacks = null;
    this.venueId   = null;
  }
}

/** Singleton — import this anywhere to subscribe/unsubscribe */
export const posRouterEngine = new POSRouterEngineClass();
