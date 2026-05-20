/**
 * EATConsole — E.A.T. Tactical Terminal
 * SmokeCraft 360 Staff Area · 3-column persistent grid
 * ENVIRONMENT | ASSET VAULT | TRANSACTION
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Wifi, WifiOff } from "lucide-react";
import {
  eatEngine,
  type InventoryProduct,
  type EnvironmentPreset,
  type CheckoutRequest,
  type EnvironmentState,
} from "@/lib/eatEngine";
import { socket } from "@/lib/socket";

// ── Design constants ──────────────────────────────────────────────────────────
const BG        = "#0D0D0D";
const GOLD      = "#D4AF37";
const PANEL     = "rgba(14,10,3,0.96)";
const BORDER    = "rgba(212,175,55,0.30)";
const BORDER_DIM = "rgba(212,175,55,0.12)";
const TEAL      = "#4AD9C8";
const AMBER_H   = "#FF9500";
const GREEN     = "#32B45A";
const RED_H     = "#F07070";

// ── Types ─────────────────────────────────────────────────────────────────────
type AssetCategory = "CIGAR" | "SPIRIT" | "WINE";
interface StockItem { id: string; name: string; brand: string; category: AssetCategory; qty: number; par: number; price: number; }
interface GuestTab  { id: string; name: string; tableNumber: string; total: number; loyalty?: string; itemCount?: number; openedAt?: string; }

// ── Fallback inventory ────────────────────────────────────────────────────────
const STOCK: StockItem[] = [
  { id: "c1", name: "1926 Serie No. 6",        brand: "PADRÓN",             category: "CIGAR",  qty: 24, par: 48, price: 45  },
  { id: "c2", name: "Fuente Fuente Opus X",     brand: "ARTURO FUENTE",      category: "CIGAR",  qty: 11, par: 36, price: 65  },
  { id: "c3", name: "Cohiba Behike 54",         brand: "COHIBA",             category: "CIGAR",  qty: 18, par: 30, price: 95  },
  { id: "c4", name: "Liga Privada No. 9",       brand: "DREW ESTATE",        category: "CIGAR",  qty: 31, par: 48, price: 32  },
  { id: "c5", name: "Padron 1964 Anniversary",  brand: "PADRÓN",             category: "CIGAR",  qty: 42, par: 60, price: 48  },
  { id: "s1", name: "Macallan 18yr Sherry Oak", brand: "THE MACALLAN",       category: "SPIRIT", qty: 6,  par: 12, price: 220 },
  { id: "s2", name: "Pappy Van Winkle 23yr",    brand: "OLD RIP VAN WINKLE", category: "SPIRIT", qty: 3,  par: 6,  price: 340 },
  { id: "s3", name: "Hennessy XO",              brand: "HENNESSY",           category: "SPIRIT", qty: 8,  par: 12, price: 160 },
  { id: "s4", name: "Buffalo Trace Antique",    brand: "BUFFALO TRACE",      category: "SPIRIT", qty: 11, par: 18, price: 85  },
  { id: "w1", name: "Opus One 2020",            brand: "OPUS ONE",           category: "WINE",   qty: 18, par: 24, price: 120 },
  { id: "w2", name: "Château Pétrus 2016",      brand: "POMEROL ESTATE",     category: "WINE",   qty: 4,  par: 12, price: 280 },
  { id: "w3", name: "Dom Pérignon 2013",        brand: "MOËT & CHANDON",     category: "WINE",   qty: 9,  par: 18, price: 210 },
];

const WRAPPER_NAMES = ["CONNECTICUT", "COROJO", "CRIOLLO", "MADURO", "HABANO"];

const DEFAULT_PRESETS: EnvironmentPreset[] = [
  { id: "atmosphere", label: "ATMOSPHERE", lighting: "Warm amber glow",    music: "Smooth Jazz",  scent: "Cedar & Vanilla", energy: "Warm & Relaxed" },
  { id: "ceremony",   label: "CEREMONY",   lighting: "Single spotlight",   music: "Silence",      scent: "Aged Oak",        energy: "Ritual"         },
  { id: "service",    label: "SERVICE",    lighting: "Full warm",          music: "Upbeat Jazz",  scent: "Citrus & Cedar",  energy: "Active"         },
  { id: "close",      label: "CLOSE",      lighting: "Deep low",           music: "Ambient",      scent: "Sandalwood",      energy: "Closing"        },
];

function loyaltyColor(tier: string): string {
  if (tier === "Platinum") return "#E8E8FF";
  if (tier === "Gold")     return GOLD;
  if (tier === "Silver")   return "#A8A8B8";
  return "#CD7F32";
}

// ── Shared atoms ──────────────────────────────────────────────────────────────

function PulsingDot({ color = GREEN }: { color?: string }) {
  return (
    <motion.div
      animate={{ scale: [1, 1.55, 1], opacity: [1, 0.4, 1] }}
      transition={{ duration: 1.4, repeat: Infinity }}
      style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}88`, flexShrink: 0 }}
    />
  );
}

function FluidBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.055)", borderRadius: 3, overflow: "hidden" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ height: "100%", background: color, borderRadius: 3, boxShadow: `0 0 8px ${color}55` }}
      />
    </div>
  );
}

function ModLabel({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.32em", color: "rgba(212,175,55,0.42)", textTransform: "uppercase", fontFamily: "'Inter',sans-serif" }}>
        {n} — {label}
      </span>
    </div>
  );
}

function Card({ children, highlight = false, style }: { children: React.ReactNode; highlight?: boolean; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: PANEL,
      border: `1px solid ${highlight ? BORDER : BORDER_DIM}`,
      borderRadius: 12, overflow: "hidden",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      boxShadow: highlight ? `0 0 50px rgba(212,175,55,0.07), inset 0 1px 0 rgba(212,175,55,0.08)` : "none",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EATConsole({ defaultTab: _defaultTab }: { defaultTab?: string }) {
  const [, navigate] = useLocation();

  // ── Engine state ──────────────────────────────────────────────────────────
  const [wsConnected,    setWsConnected]    = useState(socket.connected);
  const [liveInventory,  setLiveInventory]  = useState<InventoryProduct[]>([]);
  const [livePresets,    setLivePresets]    = useState<EnvironmentPreset[]>(eatEngine.getPresets());
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // ── Transaction state ─────────────────────────────────────────────────────
  const [activeTabs, setActiveTabs] = useState<GuestTab[]>([]);

  // ── Inline qty edit ───────────────────────────────────────────────────────
  const [editId,  setEditId]  = useState<string | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [envState,      setEnvState]      = useState<EnvironmentState>(eatEngine.getEnvironment());
  const [pendingAction, setPendingAction] = useState<"open_tab" | "close_tab" | "void_item" | null>(null);
  const [pinEntry,      setPinEntry]      = useState("");
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [pinError,      setPinError]      = useState("");

  const handlePinConfirm = useCallback(async () => {
    if (pinSubmitting || pinEntry.length < 4) return;
    setPinSubmitting(true);
    setPinError("");
    try {
      const res  = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pin: pinEntry }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; tier?: string };
      if (data.ok) {
        if (pendingAction === "open_tab")  void fetch("/api/tabs/open",  { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
        if (pendingAction === "close_tab") void fetch("/api/tabs/close", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
        if (pendingAction === "void_item") void fetch("/api/tabs/void",  { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
        setPendingAction(null); setPinEntry(""); setPinError("");
      } else {
        setPinError(data.error === "too_many_attempts" ? "TOO MANY ATTEMPTS — WAIT" : "INVALID PIN");
        setPinEntry("");
      }
    } catch {
      setPinError("NETWORK ERROR — RETRY");
    } finally {
      setPinSubmitting(false);
    }
  }, [pinEntry, pendingAction, pinSubmitting]);

  useEffect(() => {
    eatEngine.start();
    const unsubInv = eatEngine.subscribeInventory(setLiveInventory);
    const unsubEnv = eatEngine.subscribeEnvironment(s => { setEnvState(s); setLivePresets(eatEngine.getPresets()); });
    const onConn    = () => setWsConnected(true);
    const onDisconn = () => setWsConnected(false);
    socket.on("connect",    onConn);
    socket.on("disconnect", onDisconn);
    return () => {
      unsubInv(); unsubEnv();
      socket.off("connect", onConn);
      socket.off("disconnect", onDisconn);
    };
  }, []);

  useEffect(() => {
    fetch("/api/tabs")
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: unknown) => {
        const rows = (d as { tabs?: GuestTab[] }).tabs ?? (Array.isArray(d) ? (d as GuestTab[]) : null);
        if (rows) setActiveTabs(rows);
      })
      .catch(() => {
        setActiveTabs([
          { id: "t1", name: "John D.",   tableNumber: "12", total: 820,  loyalty: "Platinum", itemCount: 4, openedAt: "9:10 PM" },
          { id: "t2", name: "Marcus B.", tableNumber: "04", total: 940,  loyalty: "Platinum", itemCount: 3, openedAt: "8:45 PM" },
          { id: "t3", name: "Elena R.",  tableNumber: "02", total: 210,  loyalty: "Silver",   itemCount: 2, openedAt: "9:30 PM" },
          { id: "t4", name: "David C.",  tableNumber: "07", total: 440,  loyalty: "Gold",     itemCount: 2, openedAt: "8:55 PM" },
          { id: "t5", name: "Group: V",  tableNumber: "09", total: 580,  loyalty: "Platinum", itemCount: 5, openedAt: "7:30 PM" },
        ]);
      });
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const displayStock: StockItem[] = liveInventory.length > 0
    ? liveInventory.map(p => {
        const base = STOCK.find(s => s.id === p.id) ?? STOCK[0];
        const cat  = (["CIGAR","SPIRIT","WINE"].includes(p.category.toUpperCase()) ? p.category.toUpperCase() : base.category) as AssetCategory;
        return { ...base, id: p.id, name: p.name, brand: p.brand ?? base.brand, qty: p.qty, par: p.par, price: p.price, category: cat };
      })
    : STOCK;

  const cigars  = displayStock.filter(s => s.category === "CIGAR");
  const spirits = displayStock.filter(s => s.category === "SPIRIT");
  const wines   = displayStock.filter(s => s.category === "WINE");
  const totalPuros = cigars.reduce((n, c) => n + c.qty, 0);
  const lowStock   = displayStock.filter(s => s.qty / s.par < 0.35);
  const displayPresets = livePresets.length > 0 ? livePresets : DEFAULT_PRESETS;

  const shiftTotal = activeTabs.reduce((s, t) => s + t.total, 0);
  const avgTab     = activeTabs.length > 0 ? Math.round(shiftTotal / activeTabs.length) : 0;

  const handlePreset = useCallback(async (id: string) => {
    setActivePresetId(id);
    try { await eatEngine.setEnvironmentMode(id); } catch { /* silent */ }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, background: BG, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter',sans-serif" }}>

      {/* ── Ambient layer ── */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", right: "-8%", top: "-12%", width: 640, height: 640,
          background: `radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 65%)`, filter: "blur(60px)" }} />
        <div style={{ position: "absolute", left: "-6%", bottom: "-10%", width: 540, height: 540,
          background: `radial-gradient(circle, rgba(180,80,0,0.07) 0%, transparent 70%)`, filter: "blur(55px)" }} />
        <div style={{ position: "absolute", inset: 0, opacity: 0.035,
          backgroundImage: `radial-gradient(${GOLD}88 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
        <div style={{ position: "absolute", inset: 0, opacity: 0.025,
          backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 4px)",
          backgroundSize: "100% 4px" }} />
      </div>

      {/* ── Header ── */}
      <header style={{
        height: 64, flexShrink: 0, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 24px",
        background: "rgba(5,3,1,0.97)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid rgba(212,175,55,0.16)`, position: "relative", zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <button onClick={() => navigate("/craft-hub")} style={{
            display: "flex", alignItems: "center", gap: 8, minHeight: 44,
            background: "rgba(212,175,55,0.07)", border: `1px solid rgba(212,175,55,0.28)`,
            borderRadius: 10, padding: "10px 18px", cursor: "pointer",
            color: GOLD, fontSize: 13, fontWeight: 800, letterSpacing: "0.18em",
          }}>← BACK</button>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
              style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD, boxShadow: `0 0 10px ${GOLD}` }} />
            <span style={{ color: GOLD, fontSize: 22, fontWeight: 900, letterSpacing: "0.22em" }}>E.A.T. TERMINAL</span>
            <span style={{ color: "rgba(212,175,55,0.28)", fontSize: 12, letterSpacing: "0.14em" }}>// SMOKECRAFT 360</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {lowStock.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px",
              background: "rgba(255,149,0,0.09)", border: "1px solid rgba(255,149,0,0.38)", borderRadius: 8 }}>
              <PulsingDot color={AMBER_H} />
              <span style={{ color: AMBER_H, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em" }}>
                {lowStock.length} LOW STOCK
              </span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {wsConnected ? <Wifi size={14} color={GREEN} /> : <WifiOff size={14} color="#444" />}
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", color: wsConnected ? GREEN : "#444" }}>
              {wsConnected ? "LIVE" : "POLLING"}
            </span>
          </div>
        </div>
      </header>

      {/* ── 3-column tactical grid ── */}
      <main style={{
        flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: 14, padding: 14, overflow: "hidden", position: "relative", zIndex: 10,
      }}>

        {/* ════════════ LEFT · ENVIRONMENT ════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
          <ModLabel n="01" label="ENVIRONMENT" />

          {/* Climate tile */}
          <Card highlight style={{ padding: "22px 24px" }}>
            <div style={{ fontSize: 13, letterSpacing: "0.22em", color: "rgba(212,175,55,0.55)", marginBottom: 16, textTransform: "uppercase", fontWeight: 800 }}>LOUNGE CLIMATE</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Temperature", value: `${Math.round(envState.temperature)}°`,  unit: "FAHRENHEIT", color: GOLD },
                { label: "Humidity",    value: `${Math.round(envState.humidity)}%`,     unit: "RELATIVE",   color: TEAL },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", letterSpacing: "0.14em", marginBottom: 4, textTransform: "uppercase", fontWeight: 700 }}>{r.label}</div>
                  <div style={{ fontSize: 52, fontWeight: 900, color: r.color, lineHeight: 0.92, letterSpacing: "-0.02em" }}>{r.value}</div>
                  <div style={{ fontSize: 13, color: `${r.color}77`, marginTop: 4, letterSpacing: "0.14em", fontWeight: 600 }}>{r.unit}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Atmosphere presets */}
          <Card style={{ padding: "16px" }}>
            <div style={{ fontSize: 13, letterSpacing: "0.22em", color: "rgba(212,175,55,0.55)", marginBottom: 12, textTransform: "uppercase", fontWeight: 800 }}>ATMOSPHERE PRESETS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
              {displayPresets.slice(0, 4).map((p, i) => {
                const lbl = p.label || ["ATMOSPHERE","CEREMONY","SERVICE","CLOSE"][i] || "PRESET";
                const active = activePresetId === p.id;
                return (
                  <motion.button key={p.id} whileTap={{ scale: 0.93 }}
                    onClick={() => handlePreset(p.id)}
                    style={{
                      minHeight: 64, padding: "12px 14px", cursor: "pointer",
                      background: active ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.025)",
                      border: `1.5px solid ${active ? GOLD : "rgba(212,175,55,0.16)"}`,
                      borderRadius: 9, display: "flex", flexDirection: "column",
                      alignItems: "flex-start", justifyContent: "center",
                      boxShadow: active ? `0 0 20px rgba(212,175,55,0.22)` : "none",
                      transition: "all 0.2s",
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.18em", color: active ? GOLD : "rgba(255,255,255,0.42)", textTransform: "uppercase" }}>
                        {lbl}
                      </span>
                      {active && (
                        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
                          style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, boxShadow: `0 0 6px ${GOLD}` }} />
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </Card>

          {/* Filtration + Air quality + Humidor */}
          <Card style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 13, letterSpacing: "0.22em", color: "rgba(212,175,55,0.55)", marginBottom: 14, textTransform: "uppercase", fontWeight: 800 }}>FILTRATION & AIR</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(255,255,255,0.55)" }}>EXHAUST FILTRATION</span>
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 13px",
                  background: "rgba(50,180,90,0.09)", border: "1px solid rgba(50,180,90,0.35)", borderRadius: 20 }}>
                  <PulsingDot color={GREEN} />
                  <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.16em", color: GREEN }}>ACTIVE</span>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.10em", color: "rgba(255,255,255,0.55)" }}>AIR QUALITY INDEX</span>
                <span style={{ fontSize: 30, fontWeight: 900, color: TEAL }}>{envState.airQuality === "Good" ? 94 : envState.airQuality === "Fair" ? 68 : 42}</span>
              </div>
              <div style={{ borderTop: `1px solid rgba(212,175,55,0.09)`, paddingTop: 12 }}>
                <div style={{ fontSize: 12, letterSpacing: "0.20em", color: "rgba(212,175,55,0.48)", marginBottom: 10, textTransform: "uppercase", fontWeight: 800 }}>HUMIDOR READINGS</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[{ label: "Temp", value: `${Math.round(envState.humidorTemp)}°F`, color: GOLD }, { label: "Humidity", value: `${Math.round(envState.humidorHumidity)}%`, color: TEAL }].map(r => (
                    <div key={r.label}>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.36)", letterSpacing: "0.12em", marginBottom: 2, textTransform: "uppercase", fontWeight: 700 }}>{r.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: r.color }}>{r.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ════════════ CENTER · ASSET VAULT ════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
          <ModLabel n="02" label="ASSET VAULT" />

          {/* Hero puro count */}
          <Card highlight style={{ padding: "22px 24px", boxShadow: `0 0 60px rgba(212,175,55,0.09)` }}>
            <div style={{ fontSize: 13, letterSpacing: "0.22em", color: "rgba(212,175,55,0.55)", marginBottom: 10, textTransform: "uppercase", fontWeight: 800 }}>HUMIDOR INVENTORY</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginBottom: 16 }}>
              <span style={{ fontSize: 84, fontWeight: 900, color: GOLD, lineHeight: 0.88, letterSpacing: "-0.03em" }}>{totalPuros}</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: "rgba(212,175,55,0.60)", letterSpacing: "0.22em", paddingBottom: 10 }}>PUROS</span>
            </div>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              {cigars.map((c, i) => {
                const low = c.qty / c.par < 0.35;
                return (
                  <div key={c.id} style={{
                    display: "flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 20,
                    background: low ? "rgba(255,149,0,0.09)" : "rgba(212,175,55,0.07)",
                    border: `1px solid ${low ? "rgba(255,149,0,0.45)" : "rgba(212,175,55,0.26)"}`,
                  }}>
                    {low && <PulsingDot color={AMBER_H} />}
                    <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: low ? AMBER_H : "rgba(212,175,55,0.85)" }}>
                      {WRAPPER_NAMES[i] ?? c.brand.split(" ")[0].toUpperCase()} · {c.qty}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Spirit reserves */}
          <Card style={{ padding: "18px 20px", flex: 1 }}>
            <div style={{ fontSize: 13, letterSpacing: "0.22em", color: "rgba(212,175,55,0.55)", marginBottom: 16, textTransform: "uppercase", fontWeight: 800 }}>SPIRIT RESERVES</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {spirits.map(s => {
                const pct   = Math.min(100, Math.round((s.qty / s.par) * 100));
                const low   = pct < 35;
                const color = low ? AMBER_H : pct > 70 ? TEAL : GOLD;
                const isEdit = editId === s.id;
                return (
                  <div key={s.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        {low && <PulsingDot color={AMBER_H} />}
                        <span style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.70)", letterSpacing: "0.06em" }}>{s.name}</span>
                      </div>
                      {isEdit ? (
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {([["−", () => setEditQty(q => Math.max(0, q - 1))], ["+", () => setEditQty(q => q + 1)]] as [string, () => void][]).map(([lbl, fn], idx) => (
                            <button key={idx} onClick={fn} style={{ width: 44, height: 44, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "white", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>{lbl}</button>
                          ))}
                          <span style={{ fontSize: 20, fontWeight: 900, color, minWidth: 28, textAlign: "center" }}>{editQty}</span>
                          <button onClick={() => {
                            const id  = editId;
                            const qty = editQty;
                            setEditId(null);
                            if (!id) return;
                            setLiveInventory(inv => inv.map(p => p.id === id ? { ...p, qty } : p));
                            void fetch(`/api/inventory/${encodeURIComponent(id)}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ qty }),
                            }).catch(() => {});
                          }} style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(50,180,90,0.18)", border: "1px solid rgba(50,180,90,0.40)", color: GREEN, cursor: "pointer", fontSize: 14, fontWeight: 800 }}>SAVE</button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditId(s.id); setEditQty(s.qty); }} style={{ background: "none", border: "none", cursor: "pointer" }}>
                          <span style={{ fontSize: 22, fontWeight: 900, color }}>
                            {s.qty}<span style={{ fontSize: 13, color: "rgba(255,255,255,0.26)", marginLeft: 3 }}>/{s.par}</span>
                          </span>
                        </button>
                      )}
                    </div>
                    <FluidBar pct={pct} color={color} />
                  </div>
                );
              })}
            </div>

            {/* Wine cellar */}
            <div style={{ borderTop: `1px solid rgba(212,175,55,0.08)`, marginTop: 18, paddingTop: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.22em", color: "rgba(212,175,55,0.48)", marginBottom: 12, textTransform: "uppercase" }}>WINE CELLAR BY VARIETAL</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {wines.map(w => {
                  const low = w.qty / w.par < 0.35;
                  return (
                    <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        {low && <PulsingDot color={AMBER_H} />}
                        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.56)", letterSpacing: "0.06em" }}>{w.name}</span>
                      </div>
                      <span style={{ fontSize: 22, fontWeight: 900, color: low ? AMBER_H : "#9B59B6" }}>{w.qty}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </div>

        {/* ════════════ RIGHT · TRANSACTION ════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
          <ModLabel n="03" label="TRANSACTION" />

          {/* Shift metrics */}
          <Card highlight style={{ padding: "18px 22px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.22em", color: "rgba(212,175,55,0.48)", marginBottom: 14, textTransform: "uppercase" }}>SHIFT METRICS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "Shift Revenue", value: `$${shiftTotal.toLocaleString()}`, color: GOLD       },
                { label: "Active Tabs",   value: `${activeTabs.length}`,            color: TEAL       },
                { label: "Avg Tab",       value: `$${avgTab}`,                      color: "#9B59B6"  },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.26)", letterSpacing: "0.16em", marginBottom: 4, textTransform: "uppercase" }}>{m.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.value}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Active tabs */}
          <Card>
            <div style={{ padding: "13px 18px", borderBottom: `1px solid rgba(212,175,55,0.07)`,
              display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, letterSpacing: "0.22em", color: "rgba(212,175,55,0.48)", textTransform: "uppercase" }}>ACTIVE GUEST TABS</span>
              <span style={{ fontSize: 12, color: TEAL, fontWeight: 800, letterSpacing: "0.12em" }}>{activeTabs.length} OPEN</span>
            </div>
            <div style={{ overflow: "auto", maxHeight: 218 }}>
              {activeTabs.length === 0
                ? <div style={{ padding: "24px", textAlign: "center", color: "rgba(255,255,255,0.16)", fontSize: 13, letterSpacing: "0.14em" }}>NO ACTIVE TABS</div>
                : activeTabs.map(tab => (
                  <div key={tab.id} style={{
                    padding: "13px 18px", borderBottom: `1px solid rgba(255,255,255,0.03)`,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.84)" }}>{tab.name}</span>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 800,
                          background: `${loyaltyColor(tab.loyalty ?? "")}12`,
                          border: `1px solid ${loyaltyColor(tab.loyalty ?? "")}38`,
                          color: loyaltyColor(tab.loyalty ?? "") }}>
                          {tab.loyalty ?? "—"}
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", letterSpacing: "0.10em" }}>
                        TABLE {tab.tableNumber} · {tab.itemCount ?? "—"} ITEMS · {tab.openedAt ?? "—"}
                      </span>
                    </div>
                    <span style={{ fontSize: 22, fontWeight: 900, color: GOLD }}>${tab.total.toLocaleString()}</span>
                  </div>
                ))
              }
            </div>
          </Card>

          {/* Quick actions — PIN-gated */}
          <Card style={{ padding: "15px 16px" }}>
            <div style={{ fontSize: 13, letterSpacing: "0.22em", color: "rgba(212,175,55,0.55)", marginBottom: 11, textTransform: "uppercase", fontWeight: 800 }}>QUICK ACTIONS · PIN REQUIRED</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9 }}>
              {([
                { label: "OPEN TAB",  color: GREEN,  action: "open_tab"  },
                { label: "CLOSE TAB", color: GOLD,   action: "close_tab" },
                { label: "VOID ITEM", color: RED_H,  action: "void_item" },
              ] as const).map(a => (
                <motion.button key={a.label} whileTap={{ scale: 0.93 }}
                  onClick={() => setPendingAction(a.action)}
                  style={{
                    minHeight: 72, padding: "14px 8px", cursor: "pointer",
                    background: `${a.color}0d`, border: `1px solid ${a.color}44`,
                    borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: "0.14em", color: a.color, textTransform: "uppercase" }}>
                    {a.label}
                  </span>
                </motion.button>
              ))}
            </div>
          </Card>

          {/* Milestone tracker */}
          <Card style={{ padding: "15px 18px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.22em", color: "rgba(212,175,55,0.48)", marginBottom: 13, textTransform: "uppercase" }}>MILESTONE TRACKER</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Shift Revenue Goal", current: shiftTotal, target: 5000, color: GOLD      },
                { label: "Average Tab Target",  current: avgTab,     target: 350,  color: TEAL      },
                { label: "VIP Table Fill Rate", current: 3,          target: 5,    color: "#9B59B6" },
              ].map(m => {
                const pct = Math.min(100, Math.round((m.current / m.target) * 100));
                return (
                  <div key={m.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.48)", letterSpacing: "0.08em" }}>{m.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: m.color }}>{pct}%</span>
                    </div>
                    <FluidBar pct={pct} color={m.color} />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Recent transactions — last 10 tabs */}
          <Card>
            <div style={{ padding: "13px 18px", borderBottom: `1px solid rgba(212,175,55,0.12)`,
              display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, letterSpacing: "0.22em", color: "rgba(212,175,55,0.55)", textTransform: "uppercase", fontWeight: 800 }}>RECENT ACTIVITY</span>
              <span style={{ fontSize: 13, color: TEAL, fontWeight: 800, letterSpacing: "0.12em" }}>LAST {Math.min(activeTabs.length, 10)}</span>
            </div>
            <div style={{ overflow: "auto", maxHeight: 240 }}>
              {activeTabs.slice(0, 10).map(tab => (
                <div key={tab.id} style={{ padding: "11px 18px", borderBottom: `1px solid rgba(255,255,255,0.03)`,
                  display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.84)", marginBottom: 2 }}>{tab.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.30)", letterSpacing: "0.10em" }}>
                      TABLE {tab.tableNumber} · {tab.itemCount ?? "—"} ITEMS · {tab.openedAt ?? "—"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: GOLD, lineHeight: 1 }}>${tab.total.toLocaleString()}</div>
                    <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3, color: loyaltyColor(tab.loyalty ?? "") }}>
                      {tab.loyalty ?? "—"}
                    </div>
                  </div>
                </div>
              ))}
              {activeTabs.length === 0 && (
                <div style={{ padding: "24px", textAlign: "center", fontSize: 14,
                  color: "rgba(255,255,255,0.18)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  NO ACTIVITY THIS SHIFT
                </div>
              )}
            </div>
          </Card>
        </div>

      </main>

      {/* ── Inline PIN Gate Overlay ──────────────────────────────────── */}
      <AnimatePresence>
        {pendingAction && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 9999,
              display: "flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }} transition={{ type: "spring", stiffness: 480, damping: 28 }}
              style={{ background: "#0D0D0D", border: `1px solid ${GOLD}44`, borderRadius: 16,
                padding: "36px 40px", width: 360, textAlign: "center",
                boxShadow: `0 0 60px rgba(212,175,55,0.15)` }}>
              <div style={{ fontSize: 12, letterSpacing: "0.26em", color: `${GOLD}88`, marginBottom: 8, textTransform: "uppercase", fontWeight: 700 }}>STAFF AUTHORIZATION</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: GOLD, letterSpacing: "0.12em", marginBottom: 24, textTransform: "uppercase" }}>
                {pendingAction === "open_tab" ? "OPEN TAB" : pendingAction === "close_tab" ? "CLOSE TAB" : "VOID ITEM"}
              </div>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinEntry}
                onChange={e => setPinEntry(e.target.value.replace(/\D/g, ""))}
                onKeyDown={e => e.key === "Enter" && void handlePinConfirm()}
                placeholder="· · · ·"
                style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${GOLD}33`,
                  borderRadius: 10, padding: "16px 18px", color: GOLD, fontSize: 28, textAlign: "center",
                  letterSpacing: "0.3em", outline: "none", marginBottom: pinError ? 10 : 18, fontFamily: "monospace",
                  boxSizing: "border-box" }}
                autoFocus
              />
              {pinError && (
                <div style={{ fontSize: 13, color: RED_H, marginBottom: 14, letterSpacing: "0.12em", fontWeight: 700 }}>{pinError}</div>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => { setPendingAction(null); setPinEntry(""); setPinError(""); }}
                  style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)", borderRadius: 9,
                    color: "rgba(255,255,255,0.50)", cursor: "pointer", fontSize: 14,
                    fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  CANCEL
                </button>
                <button
                  onClick={() => void handlePinConfirm()}
                  disabled={pinSubmitting || pinEntry.length < 4}
                  style={{ flex: 1, padding: "14px",
                    background: pinEntry.length >= 4 ? `${GOLD}18` : "rgba(255,255,255,0.03)",
                    border: `1px solid ${pinEntry.length >= 4 ? GOLD + "44" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: 9, color: pinEntry.length >= 4 ? GOLD : "rgba(255,255,255,0.25)",
                    cursor: pinEntry.length >= 4 ? "pointer" : "not-allowed",
                    fontSize: 14, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
                    opacity: pinSubmitting ? 0.6 : 1 }}>
                  {pinSubmitting ? "VERIFYING..." : "CONFIRM"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
