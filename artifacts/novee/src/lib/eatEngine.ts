/**
 * eatEngine.ts — Environment · Asset · Transaction foundation engine (NOVEE).
 *
 * Mirrors SmokeCraft eatEngine exactly. Both platforms share the same
 * engine contract so cross-platform feature parity is guaranteed.
 */

import { socket } from "@/lib/socket";

export interface EnvironmentState {
  venueId:         string;
  temperature:     number;
  humidity:        number;
  humidorTemp:     number;
  humidorHumidity: number;
  lightingMode:    string;
  activeSceneId:   string;
  airQuality:      "Good" | "Fair" | "Poor";
  co2Ppm:          number;
  lastUpdated:     string;
}

export interface EnvironmentPreset {
  id:       string;
  label:    string;
  lighting: string;
  music:    string;
  scent:    string;
  energy:   string;
}

export interface FloorTable {
  id:       number;
  section:  string;
  status:   "active" | "idle" | "reserved";
  guests:   number;
  staff?:   string;
  spend:    number;
  vip:      boolean;
}

export interface FloorState {
  tables:       FloorTable[];
  totalActive:  number;
  totalGuests:  number;
  totalRevenue: number;
  lastUpdated:  string;
}

export interface CartItem {
  productId: string;
  name:      string;
  qty:       number;
  price:     number;
}

export interface CheckoutRequest {
  venueId:     string;
  tableNumber: string;
  items:       CartItem[];
  successUrl?: string;
  cancelUrl?:  string;
}

export interface CheckoutResult {
  sessionId:   string;
  checkoutUrl: string;
  total:       number;
  status:      "created";
}

export interface InventoryProduct {
  id:       string;
  name:     string;
  brand?:   string;
  category: string;
  qty:      number;
  par:      number;
  price:    number;
  origin?:  string;
  imageUrl?: string;
  lowStock:  boolean;
}

export interface DeviceStatus {
  deviceId:     string;
  tableNumber?: string;
  status:       "online" | "idle" | "offline";
  lastSeen:     string;
  venueId?:     string;
  version?:     string;
}

type Unsubscribe = () => void;

const DEFAULT_ENV: EnvironmentState = {
  venueId: "", temperature: 70, humidity: 55,
  humidorTemp: 70, humidorHumidity: 70,
  lightingMode: "Amber Low", activeSceneId: "jazz",
  airQuality: "Good", co2Ppm: 420, lastUpdated: new Date().toISOString(),
};

const DEFAULT_FLOOR: FloorState = {
  tables: [], totalActive: 0, totalGuests: 0, totalRevenue: 0,
  lastUpdated: new Date().toISOString(),
};

const FALLBACK_PRESETS: EnvironmentPreset[] = [
  { id: "jazz",    label: "Jazz Lounge",             lighting: "Amber Low",   music: "Smooth Jazz", scent: "Cedar & Vanilla",  energy: "Warm & Relaxed" },
  { id: "vip",     label: "VIP Bourbon Night",        lighting: "Warm Dim",    music: "Neo-Soul",    scent: "Aged Oak",         energy: "Exclusive"      },
  { id: "energy",  label: "High Energy Event",        lighting: "Full Warm",   music: "Upbeat Jazz", scent: "Citrus & Cedar",   energy: "Electric"       },
  { id: "late",    label: "Late Night Sophisticated", lighting: "Deep Low",    music: "Ambient",     scent: "Sandalwood",       energy: "Intimate"       },
  { id: "private", label: "Private Reserve Session",  lighting: "Candlelight", music: "Classical",   scent: "Tobacco Flower",   energy: "Ultra-Private"  },
];

class EATEngineClass {
  private _env:        EnvironmentState       = { ...DEFAULT_ENV };
  private _floor:      FloorState             = { ...DEFAULT_FLOOR };
  private _inventory:  InventoryProduct[]     = [];
  private _presets:    EnvironmentPreset[]    = FALLBACK_PRESETS;
  private _envSubs:    Set<(s: EnvironmentState)   => void> = new Set();
  private _floorSubs:  Set<(s: FloorState)         => void> = new Set();
  private _invSubs:    Set<(s: InventoryProduct[]) => void> = new Set();
  private _envTimer:   ReturnType<typeof setInterval> | null = null;
  private _floorTimer: ReturnType<typeof setInterval> | null = null;
  private _invTimer:   ReturnType<typeof setInterval> | null = null;
  private _venueId:    string = "";
  private _started:    boolean = false;

  start(venueId = ""): void {
    if (this._started) { this._venueId = venueId; return; }
    this._started = true;
    this._venueId = venueId;
    this._wireSocket();
    void this._fetchAll();
    this._envTimer   = setInterval(() => void this._fetchEnv(),       30_000);
    this._floorTimer = setInterval(() => void this._fetchFloor(),     15_000);
    this._invTimer   = setInterval(() => void this._fetchInventory(), 60_000);
  }

  stop(): void {
    if (this._envTimer)   clearInterval(this._envTimer);
    if (this._floorTimer) clearInterval(this._floorTimer);
    if (this._invTimer)   clearInterval(this._invTimer);
    this._envTimer = this._floorTimer = this._invTimer = null;
    socket.off("environment_updated", this._onEnvUpdate);
    socket.off("floor_updated",       this._onFloorUpdate);
    socket.off("inventory_updated",   this._onInvUpdate);
    socket.off("pos:ORDER_PLACED",    this._onOrder);
    this._started = false;
  }

  subscribeEnvironment(cb: (s: EnvironmentState) => void): Unsubscribe {
    cb(this._env);
    this._envSubs.add(cb);
    return () => this._envSubs.delete(cb);
  }

  subscribeFloor(cb: (s: FloorState) => void): Unsubscribe {
    cb(this._floor);
    this._floorSubs.add(cb);
    return () => this._floorSubs.delete(cb);
  }

  subscribeInventory(cb: (s: InventoryProduct[]) => void): Unsubscribe {
    cb(this._inventory);
    this._invSubs.add(cb);
    return () => this._invSubs.delete(cb);
  }

  getPresets():     EnvironmentPreset[] { return this._presets;   }
  getEnvironment(): EnvironmentState    { return this._env;       }
  getFloor():       FloorState          { return this._floor;     }
  getInventory():   InventoryProduct[]  { return this._inventory; }

  async setEnvironmentMode(presetId: string): Promise<void> {
    const preset = this._presets.find(p => p.id === presetId);
    if (!preset) return;
    this._applyEnv({ ...this._env, activeSceneId: presetId, lightingMode: preset.lighting, lastUpdated: new Date().toISOString() });
    try {
      await fetch("/api/environment-sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ venueId: this._venueId, sceneId: presetId }),
      });
    } catch { /* optimistic */ }
  }

  async checkout(req: CheckoutRequest): Promise<CheckoutResult> {
    const res = await fetch("/api/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        venueId:     req.venueId,
        tableNumber: req.tableNumber,
        items:       req.items.map(i => ({ productId: i.productId, name: i.name, qty: i.qty, priceCents: Math.round(i.price * 100) })),
        successUrl:  req.successUrl ?? `${window.location.origin}/`,
        cancelUrl:   req.cancelUrl  ?? `${window.location.origin}/`,
      }),
    });
    if (!res.ok) throw new Error(`Checkout failed: ${res.status}`);
    const data = await res.json() as { url?: string; sessionId?: string; total?: number };
    return { sessionId: data.sessionId ?? "", checkoutUrl: data.url ?? "", total: data.total ?? 0, status: "created" };
  }

  private async _fetchAll(): Promise<void> {
    await Promise.allSettled([this._fetchEnv(), this._fetchFloor(), this._fetchInventory()]);
  }

  private async _fetchEnv(): Promise<void> {
    try {
      const q = this._venueId ? `?venueId=${encodeURIComponent(this._venueId)}` : "";
      const [envRes, presetsRes] = await Promise.all([
        fetch(`/api/environment-sync${q}`),
        this._presets === FALLBACK_PRESETS ? fetch("/api/environment-sync/presets") : Promise.resolve(null),
      ]);
      if (envRes.ok) {
        const data = await envRes.json() as Partial<EnvironmentState>;
        this._applyEnv({ ...DEFAULT_ENV, ...this._env, ...data, lastUpdated: new Date().toISOString() });
      }
      if (presetsRes?.ok) {
        const data = await presetsRes.json() as EnvironmentPreset[];
        if (Array.isArray(data) && data.length) this._presets = data;
      }
    } catch { /* polling */ }
  }

  private async _fetchFloor(): Promise<void> {
    try {
      const q   = this._venueId ? `?venueId=${encodeURIComponent(this._venueId)}` : "";
      const res = await fetch(`/api/staff/floor${q}`);
      if (!res.ok) return;
      const data = await res.json() as { tables?: FloorTable[] } | FloorTable[];
      const tables = Array.isArray(data) ? data : (data.tables ?? []);
      if (tables.length) this._applyFloor(tables);
    } catch { /* polling */ }
  }

  private async _fetchInventory(): Promise<void> {
    try {
      const q   = this._venueId ? `?venueId=${encodeURIComponent(this._venueId)}` : "";
      const res = await fetch(`/api/inventory${q}`);
      if (!res.ok) return;
      const raw = await res.json() as Array<Record<string, unknown>>;
      if (!Array.isArray(raw) || !raw.length) return;
      this._inventory = raw.map(p => ({
        id:       String(p["id"] ?? ""),
        name:     String(p["name"] ?? ""),
        brand:    p["brand"]    ? String(p["brand"])    : undefined,
        category: String(p["category"] ?? "other"),
        qty:      Number(p["qty"]      ?? 99),
        par:      Number(p["par"]      ?? 12),
        price:    Number(p["costCents"] ?? 0) / 100,
        origin:   p["origin"]   ? String(p["origin"])   : undefined,
        imageUrl: p["imageUrl"] ? String(p["imageUrl"]) : undefined,
        lowStock: Number(p["qty"] ?? 99) < Number(p["par"] ?? 12) * 0.25,
      }));
      this._invSubs.forEach(cb => cb(this._inventory));
    } catch { /* polling */ }
  }

  private _wireSocket(): void {
    socket.on("environment_updated", this._onEnvUpdate);
    socket.on("floor_updated",       this._onFloorUpdate);
    socket.on("inventory_updated",   this._onInvUpdate);
    socket.on("pos:ORDER_PLACED",    this._onOrder);
  }

  private _onEnvUpdate = (data: Partial<EnvironmentState>): void => {
    if (data.venueId && this._venueId && data.venueId !== this._venueId) return;
    this._applyEnv({ ...this._env, ...data, lastUpdated: new Date().toISOString() });
  };

  private _onFloorUpdate = (data: { tables?: FloorTable[]; venueId?: string }): void => {
    if (data.venueId && this._venueId && data.venueId !== this._venueId) return;
    if (data.tables) this._applyFloor(data.tables);
  };

  private _onInvUpdate = (): void => { void this._fetchInventory(); };

  private _onOrder = (data: { venueId?: string; lineItems?: Array<{ name: string; qty: number }> }): void => {
    if (data.venueId && this._venueId && data.venueId !== this._venueId) return;
    if (!data.lineItems) return;
    this._inventory = this._inventory.map(item => {
      const line = data.lineItems!.find(l => l.name === item.name);
      if (!line) return item;
      const newQty = Math.max(0, item.qty - line.qty);
      return { ...item, qty: newQty, lowStock: newQty < item.par * 0.25 };
    });
    this._invSubs.forEach(cb => cb(this._inventory));
  };

  private _applyEnv(s: EnvironmentState): void {
    this._env = s;
    this._envSubs.forEach(cb => cb(s));
  }

  private _applyFloor(tables: FloorTable[]): void {
    const active = tables.filter(t => t.status === "active");
    const f: FloorState = {
      tables,
      totalActive:  active.length,
      totalGuests:  active.reduce((s, t) => s + t.guests, 0),
      totalRevenue: active.reduce((s, t) => s + t.spend,  0),
      lastUpdated:  new Date().toISOString(),
    };
    this._floor = f;
    this._floorSubs.forEach(cb => cb(f));
  }
}

export const eatEngine = new EATEngineClass();
