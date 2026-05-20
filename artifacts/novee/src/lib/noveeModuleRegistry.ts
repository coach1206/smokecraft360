/**
 * noveeModuleRegistry.ts — NOVEE OS Modular Expansion Architecture.
 *
 * Defines the module contract and singleton registry for NOVEE OS.
 * Modules are the unit of functionality: each declares its phase,
 * access tier, nav slot, and display config. New craft verticals
 * (WineCraft, BeerCraft, PourCraft) and enterprise features
 * (Reconciliation, Analytics, Telemetry) plug in as modules.
 *
 * Usage:
 *   noveeModuleRegistry.register(myModule)
 *   noveeModuleRegistry.getVisible("staff")     // nav-visible for staff+
 *   noveeModuleRegistry.getByPhase("eat_dashboard")
 */

import type { Phase } from "@/context/GuestProfileContext";

export type PinTier     = "none" | "staff" | "management" | "sovereign";
export type ModuleStatus = "active" | "inactive" | "locked" | "beta";
export type ModuleTag    = "core" | "craft" | "operational" | "management" | "enterprise" | "beta" | "partner" | "ai";

export interface NoveeModule {
  id:          string;
  name:        string;
  abbr:        string;
  description: string;
  version:     string;

  pinLevel:    PinTier;
  roles?:      string[];

  targetPhase: Phase;
  showInNav:   boolean;
  navOrder:    number;
  icon:        string;

  accentColor:  string;
  status:       ModuleStatus;
  tags?:        ModuleTag[];

  // Optional metadata for analytics + module manifests
  author?:      string;
  launchedAt?:  string;
}

// ── Registry singleton ────────────────────────────────────────────────────────

const TIER_ORDER: PinTier[] = ["none", "staff", "management", "sovereign"];

class NoveeModuleRegistryClass {
  private _modules   = new Map<string, NoveeModule>();
  private _listeners = new Set<() => void>();

  register(module: NoveeModule): void {
    this._modules.set(module.id, module);
    this._listeners.forEach(cb => cb());
  }

  registerMany(modules: NoveeModule[]): void {
    modules.forEach(m => this._modules.set(m.id, m));
    this._listeners.forEach(cb => cb());
  }

  unregister(id: string): void {
    this._modules.delete(id);
    this._listeners.forEach(cb => cb());
  }

  get(id: string): NoveeModule | undefined {
    return this._modules.get(id);
  }

  getAll(): NoveeModule[] {
    return Array.from(this._modules.values()).sort((a, b) => a.navOrder - b.navOrder);
  }

  /** Returns nav-visible modules accessible at the given PIN tier or below */
  getVisible(pinTier?: PinTier): NoveeModule[] {
    const userLevel = TIER_ORDER.indexOf(pinTier ?? "none");
    return this.getAll().filter(m =>
      m.showInNav &&
      m.status !== "locked" &&
      TIER_ORDER.indexOf(m.pinLevel) <= userLevel
    );
  }

  getByPhase(phase: Phase): NoveeModule | undefined {
    return this.getAll().find(m => m.targetPhase === phase);
  }

  getByTag(tag: ModuleTag): NoveeModule[] {
    return this.getAll().filter(m => m.tags?.includes(tag));
  }

  getByStatus(status: ModuleStatus): NoveeModule[] {
    return this.getAll().filter(m => m.status === status);
  }

  setStatus(id: string, status: ModuleStatus): void {
    const m = this._modules.get(id);
    if (m) { this._modules.set(id, { ...m, status }); this._listeners.forEach(cb => cb()); }
  }

  enable(id: string):  void { this.setStatus(id, "active");   }
  disable(id: string): void { this.setStatus(id, "inactive"); }

  /** Subscribe to registry changes (re-render triggers) */
  onChange(cb: () => void): () => void {
    this._listeners.add(cb);
    return () => this._listeners.delete(cb);
  }

  /** Serialize all module manifests (for ops dashboards) */
  toManifest(): NoveeModule[] {
    return this.getAll().map(m => ({ ...m }));
  }
}

export const noveeModuleRegistry = new NoveeModuleRegistryClass();

// ── Built-in core modules ─────────────────────────────────────────────────────

noveeModuleRegistry.registerMany([
  {
    id: "crafthub", name: "CraftHub", abbr: "HUB",
    description: "Guest experience entry point — craft rituals and tasting journeys",
    version: "1.0.0", pinLevel: "none", targetPhase: "crafthub",
    showInNav: true, navOrder: 0, icon: "⊹", accentColor: "#D4AF37",
    status: "active", tags: ["core"],
  },
  {
    id: "smokecraft", name: "SmokeCraft", abbr: "SMK",
    description: "Luxury cigar ritual — leaf mapping, pairing, and legacy builds",
    version: "1.0.0", pinLevel: "none", targetPhase: "crafthub",
    showInNav: true, navOrder: 1, icon: "◈", accentColor: "#C87028",
    status: "active", tags: ["core", "craft"],
  },
  {
    id: "eat", name: "E.A.T Intel", abbr: "EAT",
    description: "Environment, Asset & Transaction intelligence for floor staff",
    version: "1.0.0", pinLevel: "staff", targetPhase: "eat_dashboard",
    showInNav: true, navOrder: 2, icon: "⊞", accentColor: "#D4AF37",
    status: "active", tags: ["core", "operational"],
  },
  {
    id: "executive_command", name: "Command Center", abbr: "CMD",
    description: "Management-level operational control, analytics, and environment",
    version: "1.0.0", pinLevel: "management", targetPhase: "executive_command",
    showInNav: true, navOrder: 3, icon: "⟡", accentColor: "#C87028",
    status: "active", tags: ["core", "management"],
  },
  {
    id: "pairing", name: "Pairing Engine", abbr: "PRG",
    description: "AI-powered cigar and spirit pairing recommendations",
    version: "1.0.0", pinLevel: "none", targetPhase: "pairing_view",
    showInNav: true, navOrder: 4, icon: "◆", accentColor: "#D4AF37",
    status: "active", tags: ["core", "ai"],
  },
  {
    id: "lounge", name: "Lounge View", abbr: "LGE",
    description: "Guest-facing lounge atmosphere and ambient display mode",
    version: "1.0.0", pinLevel: "none", targetPhase: "lounge_view",
    showInNav: true, navOrder: 5, icon: "◯", accentColor: "#6B5E4E",
    status: "active", tags: ["core"],
  },

  // ── Craft expansion modules (beta) ─────────────────────────────────────────
  {
    id: "pourcraft", name: "PourCraft", abbr: "PCR",
    description: "High-end spirits curation and master mixology",
    version: "0.9.0", pinLevel: "none", targetPhase: "crafthub",
    showInNav: false, navOrder: 10, icon: "◐", accentColor: "#4A90D9",
    status: "beta", tags: ["craft", "beta"],
  },
  {
    id: "beercraft", name: "BeerCraft", abbr: "BCR",
    description: "Artisanal craft brewing — taproom and draft profiles",
    version: "0.9.0", pinLevel: "none", targetPhase: "crafthub",
    showInNav: false, navOrder: 11, icon: "◑", accentColor: "#C8A020",
    status: "beta", tags: ["craft", "beta"],
  },
  {
    id: "winecraft", name: "WineCraft", abbr: "WCR",
    description: "Fine wines — sommelier curation and cellar inventory",
    version: "0.9.0", pinLevel: "none", targetPhase: "crafthub",
    showInNav: false, navOrder: 12, icon: "◒", accentColor: "#9B59B6",
    status: "beta", tags: ["craft", "beta"],
  },

  // ── Enterprise modules ─────────────────────────────────────────────────────
  {
    id: "reconciliation", name: "Reconciliation", abbr: "REC",
    description: "Financial reconciliation, alert queue, and payout status",
    version: "1.0.0", pinLevel: "management", targetPhase: "executive_command",
    showInNav: false, navOrder: 20, icon: "⊟", accentColor: "#C87028",
    status: "active", tags: ["enterprise", "management"],
  },
  {
    id: "device_telemetry", name: "Device Telemetry", abbr: "TLM",
    description: "Kiosk and tablet health monitoring, heartbeat status",
    version: "1.0.0", pinLevel: "management", targetPhase: "executive_command",
    showInNav: false, navOrder: 21, icon: "⊛", accentColor: "#D4AF37",
    status: "active", tags: ["enterprise", "operational"],
  },
  {
    id: "control_chamber", name: "Control Chamber", abbr: "CC",
    description: "Sovereign-level system control and founder operations",
    version: "1.0.0", pinLevel: "sovereign", targetPhase: "executive_command",
    showInNav: false, navOrder: 99, icon: "⊕", accentColor: "#E8C840",
    status: "active", tags: ["enterprise", "management"],
  },
]);
