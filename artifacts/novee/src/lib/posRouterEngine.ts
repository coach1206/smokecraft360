/**
 * posRouterEngine.ts — Frontend POS State-Binding Layer (NOVEE OS)
 *
 * Extends the existing POSRouterEngine payload normalizer (posRouter.ts) with
 * live socket.io connectivity. Listens for `pos_order` and `pos_order_complete`
 * events and dispatches flavor synergy XP + inventory decrements.
 *
 * Synergy table:
 *   Cigar only:              +5 XP
 *   Cigar + Spirit:         +12 XP
 *   Cigar + Spirit + Food:  +22 XP
 * Multipliers: 2x / 3x / 5x from localStorage `pos_multiplier_active`
 */

import { socket } from "./socket";

// ── Item classification (mirrors posRouter.ts keyword banks) ─────────────────

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

// ── Synergy XP ───────────────────────────────────────────────────────────────

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

// ── Socket event shapes ───────────────────────────────────────────────────────

interface PosOrderEvent {
  orderType: string | null;
  items:     string[];
  venueId?:  string;
  ts:        number;
}

interface PosOrderCompleteEvent {
  vendor:          string;
  lineItems:       { name?: string }[];
  totalCents:      number;
  guestSessionId?: string;
  timestamp:       string;
}

// ── Callbacks ─────────────────────────────────────────────────────────────────

export interface NoveePOSCallbacks {
  onSynergyXP:          (result: SynergyResult) => void;
  onInventoryDecrement: (itemNames: string[]) => void;
  onOrderReceived?:     (vendor: string, totalCents: number) => void;
}

// ── Engine ────────────────────────────────────────────────────────────────────

class NoveePOSRouterEngineClass {
  private cbs: NoveePOSCallbacks | null = null;

  subscribe(callbacks: NoveePOSCallbacks): void {
    this.destroy();
    this.cbs = callbacks;
    socket.on("pos_order",          this._onOrder);
    socket.on("pos_order_complete", this._onComplete);
  }

  private _onOrder = (ev: PosOrderEvent): void => {
    if (!this.cbs) return;
    const items = ev.items ?? [];
    const m = getMultiplier();
    const s = calcSynergyXP(items, m);
    if (s.xpAwarded > 0) this.cbs.onSynergyXP(s);
    if (items.length)     this.cbs.onInventoryDecrement(items);
    this.cbs.onOrderReceived?.("pos", 0);
  };

  private _onComplete = (ev: PosOrderCompleteEvent): void => {
    if (!this.cbs) return;
    const names = (ev.lineItems ?? []).map(i => i.name ?? "").filter(Boolean);
    const m = getMultiplier();
    const s = calcSynergyXP(names, m);
    if (s.xpAwarded > 0) this.cbs.onSynergyXP(s);
    if (names.length)     this.cbs.onInventoryDecrement(names);
    this.cbs.onOrderReceived?.(ev.vendor, ev.totalCents);
  };

  destroy(): void {
    socket.off("pos_order",          this._onOrder);
    socket.off("pos_order_complete", this._onComplete);
    this.cbs = null;
  }
}

export const noveePosRouterEngine = new NoveePOSRouterEngineClass();
