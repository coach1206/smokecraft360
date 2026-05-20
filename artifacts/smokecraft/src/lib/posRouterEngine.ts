/**
 * posRouterEngine.ts — Frontend POS State-Binding Layer (SmokeCraft)
 *
 * Connects to the existing socket.io singleton and listens for `pos_order`
 * and `pos_order_complete` events from any of the 4 vendor adapters
 * (Toast · Clover · Square · Lightspeed).
 *
 * On each external order event:
 *  1. Classifies line items into categories (cigar / spirit / food / other)
 *  2. Computes flavor synergy XP based on category combinations
 *  3. Applies active spend multiplier (2x / 3x / 5x) from localStorage
 *  4. Dispatches callbacks to PosContext for inventory decrement + XP overlay
 */

import { socket } from "@/lib/socket";

// ── Item category classification ──────────────────────────────────────────────

const CIGAR_KW  = ["cigar","padron","cohiba","arturo","fuente","opus","liga","romeo","davidoff","montecristo","plasencia","behike"];
const SPIRIT_KW = ["bourbon","whiskey","whisky","scotch","cognac","hennessy","macallan","rum","vodka","gin","tequila","mezcal","cognac","brandy","armagnac"];
const FOOD_KW   = ["plate","slider","truffle","wagyu","lobster","deviled","salad","cheese","chocolate","charcuterie","nuts","pairing","appetizer","soup"];

export type ItemCategory = "cigar" | "spirit" | "food" | "other";

function classify(name: string): ItemCategory {
  const n = name.toLowerCase();
  if (CIGAR_KW.some(k => n.includes(k)))  return "cigar";
  if (SPIRIT_KW.some(k => n.includes(k))) return "spirit";
  if (FOOD_KW.some(k => n.includes(k)))   return "food";
  return "other";
}

// ── Synergy XP table ─────────────────────────────────────────────────────────
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

// ── Socket event shapes ───────────────────────────────────────────────────────

interface PosOrderSocketEvent {
  orderType:  string | null;
  items:      string[];
  venueId?:   string;
  tableId?:   string;
  ts:         number;
}

interface PosOrderCompleteEvent {
  vendor:         string;
  venueId:        string;
  lineItems:      { name?: string; productId?: string; qty?: number; priceCents?: number }[];
  totalCents:     number;
  guestSessionId?: string;
  timestamp:      string;
}

// ── Callbacks injected by PosContext ──────────────────────────────────────────

export interface POSRouterCallbacks {
  /** Called when synergy XP should be awarded (cigar/spirit/food combo) */
  onSynergyXP: (result: SynergyResult) => void;
  /** Called with matching product names that should have stock decremented */
  onInventoryDecrement: (itemNames: string[]) => void;
  /** Called when any POS order arrives — for display / analytics */
  onOrderReceived?: (event: PosOrderSocketEvent | PosOrderCompleteEvent) => void;
}

// ── Engine class ──────────────────────────────────────────────────────────────

class POSRouterEngineClass {
  private callbacks: POSRouterCallbacks | null = null;
  private sessions  = new Map<string, ActiveSession>();

  subscribe(callbacks: POSRouterCallbacks): void {
    this.destroy(); // clean any prior subscription
    this.callbacks = callbacks;
    socket.on("pos_order",          this._handleOrder);
    socket.on("pos_order_complete", this._handleOrderComplete);
  }

  private _handleOrder = (ev: PosOrderSocketEvent): void => {
    if (!this.callbacks) return;
    const items = ev.items ?? [];
    const multiplier = getMultiplier();
    const synergy = calcSynergyXP(items, multiplier);

    if (synergy.xpAwarded > 0) this.callbacks.onSynergyXP(synergy);
    if (items.length)           this.callbacks.onInventoryDecrement(items);
    this.callbacks.onOrderReceived?.(ev);
  };

  private _handleOrderComplete = (ev: PosOrderCompleteEvent): void => {
    if (!this.callbacks) return;

    // Extract item names from the enriched payload
    const itemNames = (ev.lineItems ?? [])
      .map(i => i.name ?? "")
      .filter(n => n.length > 0);

    const multiplier = getMultiplier();
    const synergy = calcSynergyXP(itemNames, multiplier);

    if (synergy.xpAwarded > 0) this.callbacks.onSynergyXP(synergy);
    if (itemNames.length)       this.callbacks.onInventoryDecrement(itemNames);

    // Track session spend
    if (ev.guestSessionId) {
      const existing = this.sessions.get(ev.guestSessionId);
      this.sessions.set(ev.guestSessionId, {
        sessionId:    ev.guestSessionId,
        totalSpent:   (existing?.totalSpent ?? 0) + ev.totalCents,
        lastActivity: Date.now(),
      });
    }

    this.callbacks.onOrderReceived?.(ev);
  };

  /** Returns all tracked active sessions (for display in E.A.T Terminal) */
  getActiveSessions(): ActiveSession[] {
    // Prune sessions idle >4 hours
    const cutoff = Date.now() - 4 * 60 * 60 * 1000;
    for (const [id, s] of this.sessions) {
      if (s.lastActivity < cutoff) this.sessions.delete(id);
    }
    return Array.from(this.sessions.values()).sort((a, b) => b.lastActivity - a.lastActivity);
  }

  /** Unsubscribe all socket listeners and clear state */
  destroy(): void {
    socket.off("pos_order",          this._handleOrder);
    socket.off("pos_order_complete", this._handleOrderComplete);
    this.callbacks = null;
  }
}

/** Singleton — import this anywhere to subscribe/unsubscribe */
export const posRouterEngine = new POSRouterEngineClass();
