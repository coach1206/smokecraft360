/**
 * posRouterEngine.ts — Frontend POS State-Binding Layer (SmokeCraft)
 *
 * CANONICAL CHANNEL: pos:ORDER_PLACED (via Socket.IO rooms at /api/socket.io)
 * This is the ONLY event that triggers XP awards and inventory decrements.
 *
 * All other channels are analytics-only (no side effects):
 *   pos:ITEM_ADDED | pos:TAB_CLOSED | pos:PAYMENT_COMPLETE
 *   pos_order   — legacy backwards compat: analytics-only, NO XP/decrement
 *                 (posOrders.ts emits both pos_order + pos:ORDER_PLACED for the
 *                 same request; processing side effects only in pos:ORDER_PLACED
 *                 prevents the duplicate-award bug)
 *
 * Contract fields on PosLiveEvent (matches backend emission):
 *   vendor?, venueId?, lineItems[], totalCents, guestSessionId?, timestamp
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

// ── Synergy XP ────────────────────────────────────────────────────────────────

export interface SynergyResult {
  xpAwarded:  number;
  multiplier: number;
  breakdown:  string;
  categories: ItemCategory[];
}

function calcSynergyXP(itemNames: string[], multiplier: number): SynergyResult {
  const categories = Array.from(new Set(itemNames.map(classify)));
  const has = (c: ItemCategory) => categories.includes(c);
  let base = 0, breakdown = "";
  if (has("cigar") && has("spirit") && has("food")) { base = 22; breakdown = "Cigar + Spirit + Food"; }
  else if (has("cigar") && has("spirit"))            { base = 12; breakdown = "Cigar + Spirit"; }
  else if (has("cigar"))                             { base = 5;  breakdown = "Cigar"; }
  return { xpAwarded: Math.round(base * multiplier), multiplier, breakdown, categories };
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

// ── Active session tracking ───────────────────────────────────────────────────

export interface ActiveSession {
  sessionId:    string;
  guestName?:   string;
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

// ── Normalized live event contract ────────────────────────────────────────────
// Field names match backend emission: guestSessionId, timestamp (not sessionId/ts)

export interface PosLiveEvent {
  eventType:      "ORDER_PLACED" | "ITEM_ADDED" | "TAB_CLOSED" | "PAYMENT_COMPLETE";
  vendor?:        string;
  venueId?:       string;
  lineItems:      PosLineItem[];
  totalCents:     number;
  guestSessionId?: string;
  timestamp:      string;
}

// ── Callbacks ─────────────────────────────────────────────────────────────────

export interface POSRouterCallbacks {
  onSynergyXP: (result: SynergyResult) => void;
  /** qty-accurate line items — fires only on ORDER_PLACED */
  onInventoryDecrement: (items: { name: string; qty: number }[]) => void;
  /** Analytics-only — fires on all event types */
  onLiveEvent?: (event: PosLiveEvent) => void;
}

// ── Engine class ──────────────────────────────────────────────────────────────

class POSRouterEngineClass {
  private callbacks:  POSRouterCallbacks | null = null;
  private venueId:    string | null             = null;
  private sessions    = new Map<string, ActiveSession>();
  /** 30s dedup cache keyed by guestSessionId to prevent double-firing */
  private processed   = new Map<string, number>();

  subscribe(venueId: string, callbacks: POSRouterCallbacks): void {
    this.destroy();
    this.venueId   = venueId;
    this.callbacks = callbacks;
    socket.emit("join_venue", { venueId });

    // Normalized channel — only source of XP + inventory side effects
    socket.on("pos:ORDER_PLACED",    this._handleLiveEvent);
    socket.on("pos:ITEM_ADDED",      this._handleLiveEvent);
    socket.on("pos:TAB_CLOSED",      this._handleLiveEvent);
    socket.on("pos:PAYMENT_COMPLETE",this._handleLiveEvent);

    // Legacy channel — analytics-only (NO XP, NO inventory decrement)
    // posOrders.ts emits both pos_order + pos:ORDER_PLACED for the same request;
    // restricting side effects to pos:ORDER_PLACED prevents duplicate processing.
    socket.on("pos_order",           this._handleOrderAnalyticsOnly);
  }

  // ── Normalized event: ORDER_PLACED triggers side effects; others = analytics ─

  private _handleLiveEvent = (ev: PosLiveEvent): void => {
    if (!this.callbacks) return;
    if (ev.venueId && this.venueId && ev.venueId !== this.venueId) return;

    // Always forward for analytics
    this.callbacks.onLiveEvent?.(ev);

    // Side effects (XP + inventory) ONLY on ORDER_PLACED
    if (ev.eventType !== "ORDER_PLACED") return;

    // Dedup by guestSessionId — prevents double-firing if the same order
    // session somehow arrives twice (e.g. network retry)
    if (ev.guestSessionId) {
      this._pruneProcessed();
      if (this.processed.has(ev.guestSessionId)) return;
      this.processed.set(ev.guestSessionId, Date.now());
    }

    const itemNames  = ev.lineItems.map(i => i.name);
    const multiplier = getMultiplier();
    const synergy    = calcSynergyXP(itemNames, multiplier);

    if (synergy.xpAwarded > 0) this.callbacks.onSynergyXP(synergy);

    const decrements = ev.lineItems
      .filter(i => i.name && i.qty > 0)
      .map(i => ({ name: i.name, qty: i.qty }));
    if (decrements.length) this.callbacks.onInventoryDecrement(decrements);

    if (ev.guestSessionId) this._trackSpend(ev.guestSessionId, ev.totalCents);
  };

  // ── Legacy: pos_order — analytics-only, ZERO side effects ────────────────

  private _handleOrderAnalyticsOnly = (ev: {
    orderType: string | null; items: string[]; venueId?: string; ts: number;
  }): void => {
    if (!this.callbacks) return;
    if (ev.venueId && this.venueId && ev.venueId !== this.venueId) return;

    // Forward as analytics event — no XP, no inventory decrement.
    // The canonical pos:ORDER_PLACED event (also emitted for the same request)
    // handles all side effects.
    this.callbacks.onLiveEvent?.({
      eventType:  "ORDER_PLACED",
      venueId:    ev.venueId,
      lineItems:  (ev.items ?? []).map(n => ({ name: n, productId: "", qty: 1, priceCents: 0 })),
      totalCents: 0,
      timestamp:  new Date(ev.ts).toISOString(),
    });
  };

  // ── Session spend ledger ──────────────────────────────────────────────────

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
    socket.off("pos:ORDER_PLACED",    this._handleLiveEvent);
    socket.off("pos:ITEM_ADDED",      this._handleLiveEvent);
    socket.off("pos:TAB_CLOSED",      this._handleLiveEvent);
    socket.off("pos:PAYMENT_COMPLETE",this._handleLiveEvent);
    socket.off("pos_order",           this._handleOrderAnalyticsOnly);
    this.callbacks = null;
    this.venueId   = null;
    this.processed.clear();
  }
}

export const posRouterEngine = new POSRouterEngineClass();
