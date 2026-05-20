/**
 * posRouterEngine.ts — Frontend POS State-Binding Layer (SmokeCraft)
 *
 * subscribe(venueId, callbacks) opens a venue-scoped socket channel.
 * The engine joins `venue:<venueId>` and listens for four normalized event types:
 *
 *   pos:ORDER_PLACED    — the ONLY event that triggers XP awards + inventory decrement
 *   pos:ITEM_ADDED      — analytics dispatch only (no side effects)
 *   pos:TAB_CLOSED      — analytics dispatch only (no side effects)
 *   pos:PAYMENT_COMPLETE — analytics dispatch only (no side effects)
 *
 * Legacy `pos_order` is handled for the webhook/direct-trigger path (backwards compat).
 * `pos_order_complete` is NOT consumed — the bridge now emits `pos:ORDER_PLACED` only.
 *
 * Deduplication: a short-lived Set of processed sessionIds prevents double-firing
 * if the same order somehow arrives via both legacy and normalized channels.
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

export interface PosLiveEvent {
  eventType:  "ORDER_PLACED" | "ITEM_ADDED" | "TAB_CLOSED" | "PAYMENT_COMPLETE";
  vendor?:    string;
  venueId?:   string;
  lineItems:  PosLineItem[];
  totalCents: number;
  sessionId?: string;
  ts:         number;
}

// ── Callbacks ─────────────────────────────────────────────────────────────────

export interface POSRouterCallbacks {
  onSynergyXP: (result: SynergyResult) => void;
  /** qty-accurate line items for stock decrement — only fires on ORDER_PLACED */
  onInventoryDecrement: (items: { name: string; qty: number }[]) => void;
  /** Analytics-only callback — fires on all event types */
  onLiveEvent?: (event: PosLiveEvent) => void;
}

// ── Engine class ──────────────────────────────────────────────────────────────

class POSRouterEngineClass {
  private callbacks:   POSRouterCallbacks | null = null;
  private venueId:     string | null             = null;
  private sessions     = new Map<string, ActiveSession>();
  /** Short-lived dedup cache: sessionId → timestamp. Expires after 30s. */
  private processed    = new Map<string, number>();

  subscribe(venueId: string, callbacks: POSRouterCallbacks): void {
    this.destroy();
    this.venueId   = venueId;
    this.callbacks = callbacks;
    socket.emit("join_venue", { venueId });

    socket.on("pos:ORDER_PLACED",    this._handleLiveEvent);
    socket.on("pos:ITEM_ADDED",      this._handleLiveEvent);
    socket.on("pos:TAB_CLOSED",      this._handleLiveEvent);
    socket.on("pos:PAYMENT_COMPLETE",this._handleLiveEvent);
    socket.on("pos_order",           this._handleOrder);    // legacy webhook/direct
  }

  // ── Normalized event handler ──────────────────────────────────────────────

  private _handleLiveEvent = (ev: PosLiveEvent): void => {
    if (!this.callbacks) return;
    if (ev.venueId && this.venueId && ev.venueId !== this.venueId) return;

    // Always forward for analytics regardless of event type
    this.callbacks.onLiveEvent?.(ev);

    // XP + inventory side effects only on ORDER_PLACED
    if (ev.eventType !== "ORDER_PLACED") return;

    // Deduplication: skip if same sessionId was processed within 30s
    if (ev.sessionId) {
      this._pruneProcessed();
      if (this.processed.has(ev.sessionId)) return;
      this.processed.set(ev.sessionId, Date.now());
    }

    const itemNames  = ev.lineItems.map(i => i.name);
    const multiplier = getMultiplier();
    const synergy    = calcSynergyXP(itemNames, multiplier);

    if (synergy.xpAwarded > 0) this.callbacks.onSynergyXP(synergy);

    const decrementItems = ev.lineItems
      .filter(i => i.name && i.qty > 0)
      .map(i => ({ name: i.name, qty: i.qty }));
    if (decrementItems.length) this.callbacks.onInventoryDecrement(decrementItems);

    if (ev.sessionId) this._trackSpend(ev.sessionId, ev.totalCents);
  };

  // ── Legacy: pos_order (webhook/direct-trigger) ────────────────────────────

  private _handleOrder = (ev: { orderType: string | null; items: string[]; venueId?: string; ts: number }): void => {
    if (!this.callbacks) return;
    if (ev.venueId && this.venueId && ev.venueId !== this.venueId) return;

    const items      = ev.items ?? [];
    const multiplier = getMultiplier();
    const synergy    = calcSynergyXP(items, multiplier);

    if (synergy.xpAwarded > 0) this.callbacks.onSynergyXP(synergy);
    if (items.length) {
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

  // ── Session spend ledger ──────────────────────────────────────────────────

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
    socket.off("pos:ORDER_PLACED",    this._handleLiveEvent);
    socket.off("pos:ITEM_ADDED",      this._handleLiveEvent);
    socket.off("pos:TAB_CLOSED",      this._handleLiveEvent);
    socket.off("pos:PAYMENT_COMPLETE",this._handleLiveEvent);
    socket.off("pos_order",           this._handleOrder);
    this.callbacks = null;
    this.venueId   = null;
    this.processed.clear();
  }
}

export const posRouterEngine = new POSRouterEngineClass();
