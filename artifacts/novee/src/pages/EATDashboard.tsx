/**
 * EATDashboard — NOVEE OS · E.A.T. Tactical Terminal
 * 3-column persistent grid: ENVIRONMENT | ASSET VAULT | TRANSACTION
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  eatEngine,
  type InventoryProduct,
  type CheckoutRequest,
} from "@/lib/eatEngine";
import { socket } from "@/lib/socket";
import type { EATModuleFlags } from "@/pages/ExecutiveCommandCenter";
import { StaffPinGate } from "@/components/StaffPinGate";

// ── Design constants ──────────────────────────────────────────────────────────
const BG         = "#0D0D0D";
const GOLD       = "#D4AF37";
const PANEL      = "rgba(14,10,3,0.96)";
const BORDER     = "rgba(212,175,55,0.30)";
const BORDER_DIM = "rgba(212,175,55,0.12)";
const TEAL       = "#4AD9C8";
const AMBER_H    = "#FF9500";
const GREEN      = "#32B45A";
const RED_H      = "#F07070";

// ── Fallback inventory ────────────────────────────────────────────────────────
type AssetCat = "CIGAR" | "SPIRIT" | "WINE";
interface StockItem { id: string; name: string; brand: string; category: AssetCat; qty: number; par: number; price: number; }

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

const DEFAULT_PRESETS = [
  { id: "atmosphere", label: "ATMOSPHERE" },
  { id: "ceremony",   label: "CEREMONY"   },
  { id: "service",    label: "SERVICE"    },
  { id: "close",      label: "CLOSE"      },
];

// ── Static table data for Transaction module ──────────────────────────────────
const TABLES = [
  { id: 1,  status: "active", vip: false, guests: 2, spend: 180, name: "Anna T.",     loyalty: "Gold"     },
  { id: 2,  status: "active", vip: false, guests: 3, spend: 290, name: "James R.",    loyalty: "Silver"   },
  { id: 4,  status: "active", vip: false, guests: 4, spend: 430, name: "Marcus B.",   loyalty: "Platinum" },
  { id: 5,  status: "active", vip: false, guests: 2, spend: 210, name: "Elena R.",    loyalty: "Silver"   },
  { id: 7,  status: "active", vip: false, guests: 3, spend: 340, name: "David C.",    loyalty: "Gold"     },
  { id: 9,  status: "active", vip: false, guests: 5, spend: 580, name: "Group: V",    loyalty: "Platinum" },
  { id: 12, status: "active", vip: true,  guests: 4, spend: 820, name: "John D.",     loyalty: "Platinum" },
];

// ── Bill items ────────────────────────────────────────────────────────────────
const BILL_ITEMS: Record<number, { item: string; qty: number; price: number }[]> = {
  12: [{ item: "Padron 1964 Anniversary", qty: 2, price: 48 }, { item: "Pappy Van Winkle 15yr", qty: 2, price: 85 }, { item: "Old Forester 1920", qty: 1, price: 42 }],
  4:  [{ item: "Arturo Fuente OpusX",     qty: 2, price: 72 }, { item: "Hennessy XO",            qty: 2, price: 78 }],
  9:  [{ item: "Opus X BBMF",             qty: 3, price: 88 }, { item: "Dom Pérignon",            qty: 1, price: 210 }],
  7:  [{ item: "Arturo Fuente Anejo",     qty: 2, price: 56 }, { item: "Woodford Double Oaked",  qty: 2, price: 48 }],
};

function loyaltyColor(t: string): string {
  if (t === "Platinum") return "#E8E8FF";
  if (t === "Gold")     return GOLD;
  if (t === "Silver")   return "#A8A8B8";
  return "#CD7F32";
}

// ── Atoms ─────────────────────────────────────────────────────────────────────

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
      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{ height: "100%", background: color, borderRadius: 3, boxShadow: `0 0 8px ${color}55` }} />
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
      background: PANEL, border: `1px solid ${highlight ? BORDER : BORDER_DIM}`,
      borderRadius: 12, overflow: "hidden",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      boxShadow: highlight ? `0 0 50px rgba(212,175,55,0.07), inset 0 1px 0 rgba(212,175,55,0.07)` : "none",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Bill modal ────────────────────────────────────────────────────────────────
function BillModal({ tableId, onClose, onSendBill }: { tableId: number; onClose: () => void; onSendBill: () => void }) {
  const items    = BILL_ITEMS[tableId] ?? [{ item: "Miscellaneous Items", qty: 1, price: 200 }];
  const table    = TABLES.find(t => t.id === tableId);
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0);
  const tax      = Math.round(subtotal * 0.085);
  const svc      = Math.round(subtotal * 0.20);
  const total    = subtotal + tax + svc;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 8000, background: "rgba(0,0,0,0.82)", backdropFilter: "blur(18px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <motion.div initial={{ scale: 0.88, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.88, y: 30 }}
        onClick={e => e.stopPropagation()}
        style={{ background: "rgba(8,5,2,0.98)", border: `1px solid ${GOLD}44`, borderRadius: 14, padding: "28px", width: 420, boxShadow: `0 24px 80px rgba(0,0,0,0.95)` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 10, color: `${GOLD}88`, letterSpacing: "0.20em", marginBottom: 3, textTransform: "uppercase" }}>TABLE {tableId} — BILL SUMMARY</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "rgba(240,232,212,0.88)", fontFamily: "'Cormorant Garamond',serif" }}>{table?.name ?? "Guest"}</div>
            <div style={{ fontSize: 10, color: `${GOLD}66`, marginTop: 2 }}>{table?.loyalty ?? "—"} Member</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: `1px solid ${GOLD}22`, borderRadius: 6, width: 30, height: 30, color: "rgba(240,232,212,0.45)", cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
        <div style={{ borderTop: `1px solid ${GOLD}18`, borderBottom: `1px solid ${GOLD}18`, padding: "10px 0", marginBottom: 10 }}>
          {items.map((it, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <div>
                <div style={{ fontSize: 12, color: "rgba(240,232,212,0.80)" }}>{it.item}</div>
                <div style={{ fontSize: 9, color: `${GOLD}55` }}>× {it.qty}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>${(it.qty * it.price).toLocaleString()}</div>
            </div>
          ))}
        </div>
        {[["Subtotal", `$${subtotal}`], ["Tax (8.5%)", `$${tax}`], ["Service (20%)", `$${svc}`]].map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: "rgba(240,232,212,0.38)" }}>{l}</span>
            <span style={{ fontSize: 11, color: "rgba(240,232,212,0.38)" }}>{v}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${GOLD}18`, paddingTop: 10, marginTop: 6, marginBottom: 18 }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: "rgba(240,232,212,0.88)" }}>TOTAL</span>
          <span style={{ fontSize: 20, fontWeight: 900, color: GOLD }}>${total.toLocaleString()}</span>
        </div>
        <motion.button type="button" onClick={() => { onSendBill(); onClose(); }} whileTap={{ scale: 0.95 }}
          style={{ width: "100%", padding: "15px", background: `linear-gradient(135deg, ${GOLD}, #C8960A)`, border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 800, color: "#090600", letterSpacing: "0.14em", textTransform: "uppercase" }}>
          SEND TO POS
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ── Interface ─────────────────────────────────────────────────────────────────
interface EATDashboardProps {
  eatFlags?: EATModuleFlags;
  onBack?: () => void;
}

export default function EATDashboard({ onBack }: EATDashboardProps) {
  // ── Engine state ──────────────────────────────────────────────────────────
  const [wsConnected,    setWsConnected]    = useState(socket.connected);
  const [liveInventory,  setLiveInventory]  = useState<InventoryProduct[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // ── Live tabs (fetched from API, fallback to static TABLES data) ─────────
  const [liveTabs,      setLiveTabs]      = useState(TABLES);
  const [pendingAction, setPendingAction] = useState<"open_tab" | "close_tab" | "void_item" | null>(null);

  useEffect(() => {
    const venueId = localStorage.getItem("axiom_venue_id") ?? "default";
    const token   = localStorage.getItem("axiom_token") ?? "";
    fetch(`/api/tabs/venue/${encodeURIComponent(venueId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const tabs = (d.tabs ?? d) as Array<{
          id: number; guestName?: string; totalAmount?: number;
          status?: string; guestCount?: number;
        }>;
        if (tabs.length > 0) {
          setLiveTabs(tabs.map(t => ({
            id:      t.id,
            status:  t.status ?? "active",
            vip:     false,
            guests:  t.guestCount ?? 2,
            spend:   Math.round((t.totalAmount ?? 0) / 100),
            name:    t.guestName ?? `Tab #${t.id}`,
            loyalty: "Gold",
          })));
        }
      })
      .catch(() => { /* keep static fallback */ });
  }, []);

  // ── Transaction state ─────────────────────────────────────────────────────
  const [billTableId,  setBillTableId]  = useState<number | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  // ── Inline qty edit ───────────────────────────────────────────────────────
  const [editId,  setEditId]  = useState<string | null>(null);
  const [editQty, setEditQty] = useState(0);

  useEffect(() => {
    eatEngine.start();
    const unsubInv = eatEngine.subscribeInventory(setLiveInventory);
    const unsubEnv = eatEngine.subscribeEnvironment(() => { /* env update */ });
    const onConn    = () => setWsConnected(true);
    const onDisconn = () => setWsConnected(false);
    socket.on("connect",    onConn);
    socket.on("disconnect", onDisconn);
    return () => {
      unsubInv(); unsubEnv();
      socket.off("connect", onConn);
      socket.off("disconnect", onDisconn);
      eatEngine.stop();
    };
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const displayStock: StockItem[] = liveInventory.length > 0
    ? liveInventory.map(p => {
        const base = STOCK.find(s => s.id === p.id) ?? STOCK[0];
        const cat  = (["CIGAR","SPIRIT","WINE"].includes(p.category.toUpperCase()) ? p.category.toUpperCase() : base.category) as AssetCat;
        return { ...base, id: p.id, name: p.name, brand: p.brand ?? base.brand, qty: p.qty, par: p.par, price: p.price, category: cat };
      })
    : STOCK;

  const cigars  = displayStock.filter(s => s.category === "CIGAR");
  const spirits = displayStock.filter(s => s.category === "SPIRIT");
  const wines   = displayStock.filter(s => s.category === "WINE");
  const totalPuros = cigars.reduce((n, c) => n + c.qty, 0);
  const lowStock   = displayStock.filter(s => s.qty / s.par < 0.35);

  const activeTables = liveTabs.filter(t => t.status === "active");
  const shiftTotal   = activeTables.reduce((s, t) => s + t.spend, 0);
  const avgSpend     = activeTables.length > 0 ? Math.round(shiftTotal / activeTables.length) : 0;

  const handlePreset = useCallback(async (id: string) => {
    setActivePresetId(id);
    try { await eatEngine.setEnvironmentMode(id); } catch { /* silent */ }
  }, []);

  const handleSendBill = useCallback(async (tableId: number) => {
    if (checkoutBusy) return;
    setCheckoutBusy(true);
    const table = TABLES.find(t => t.id === tableId);
    const items = (BILL_ITEMS[tableId] ?? [{ item: "Session Total", qty: 1, price: table?.spend ?? 0 }]);
    const req: CheckoutRequest = {
      venueId:     "venue_01",
      tableNumber: String(tableId),
      items:       items.map(i => ({ productId: `item_${i.item}`, name: i.item, qty: i.qty, price: i.price })),
      successUrl:  window.location.href,
      cancelUrl:   window.location.href,
    };
    try {
      const result = await eatEngine.checkout(req);
      if (result.checkoutUrl && result.checkoutUrl !== "" && !result.checkoutUrl.startsWith("#")) {
        window.open(result.checkoutUrl, "_blank");
      }
    } catch { /* silent — manual fallback */ }
    setCheckoutBusy(false);
  }, [checkoutBusy]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, background: BG, display: "flex", flexDirection: "column", overflow: "hidden", fontFamily: "'Inter',sans-serif" }}>

      {/* ── Ambient ── */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", right: "-8%", top: "-12%", width: 640, height: 640,
          background: `radial-gradient(circle, rgba(212,175,55,0.10) 0%, transparent 65%)`, filter: "blur(60px)" }} />
        <div style={{ position: "absolute", left: "-6%", bottom: "-10%", width: 540, height: 540,
          background: `radial-gradient(circle, rgba(180,80,0,0.07) 0%, transparent 70%)`, filter: "blur(55px)" }} />
        <div style={{ position: "absolute", inset: 0, opacity: 0.035,
          backgroundImage: `radial-gradient(${GOLD}88 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
      </div>

      {/* ── Header ── */}
      <header style={{
        height: 64, flexShrink: 0, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 24px",
        background: "rgba(5,3,1,0.97)", backdropFilter: "blur(20px)",
        borderBottom: `1px solid rgba(212,175,55,0.16)`, position: "relative", zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {onBack && (
            <button onClick={onBack} style={{
              display: "flex", alignItems: "center", gap: 8, minHeight: 44,
              background: "rgba(212,175,55,0.07)", border: `1px solid rgba(212,175,55,0.28)`,
              borderRadius: 10, padding: "10px 18px", cursor: "pointer",
              color: GOLD, fontSize: 13, fontWeight: 800, letterSpacing: "0.18em",
            }}>← BACK</button>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.8, repeat: Infinity }}
              style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD, boxShadow: `0 0 10px ${GOLD}` }} />
            <span style={{ color: GOLD, fontSize: 22, fontWeight: 900, letterSpacing: "0.22em" }}>E.A.T. TERMINAL</span>
            <span style={{ color: "rgba(212,175,55,0.28)", fontSize: 12, letterSpacing: "0.14em" }}>// NOVEE OS</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {lowStock.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px",
              background: "rgba(255,149,0,0.09)", border: "1px solid rgba(255,149,0,0.38)", borderRadius: 8 }}>
              <PulsingDot color={AMBER_H} />
              <span style={{ color: AMBER_H, fontSize: 12, fontWeight: 800, letterSpacing: "0.16em" }}>{lowStock.length} LOW STOCK</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <motion.div
              animate={{ opacity: wsConnected ? [1, 0.4, 1] : 1 }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 7, height: 7, borderRadius: "50%", background: wsConnected ? GREEN : "#444", boxShadow: wsConnected ? `0 0 6px ${GREEN}` : "none" }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.16em", color: wsConnected ? GREEN : "#444" }}>
              {wsConnected ? "LIVE" : "POLLING"}
            </span>
          </div>
        </div>
      </header>

      {/* ── 3-column grid ── */}
      <main style={{
        flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: 14, padding: 14, overflow: "hidden", position: "relative", zIndex: 10,
      }}>

        {/* ════════════ LEFT · ENVIRONMENT ════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
          <ModLabel n="01" label="ENVIRONMENT" />

          {/* Climate tile */}
          <Card highlight style={{ padding: "22px 24px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.24em", color: "rgba(212,175,55,0.48)", marginBottom: 16, textTransform: "uppercase" }}>LOUNGE CLIMATE</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                { label: "Temperature", value: "68°",  unit: "FAHRENHEIT", color: GOLD },
                { label: "Humidity",    value: "70%",  unit: "RELATIVE",   color: TEAL },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", letterSpacing: "0.16em", marginBottom: 4, textTransform: "uppercase" }}>{r.label}</div>
                  <div style={{ fontSize: 52, fontWeight: 900, color: r.color, lineHeight: 0.92, letterSpacing: "-0.02em" }}>{r.value}</div>
                  <div style={{ fontSize: 11, color: `${r.color}77`, marginTop: 4, letterSpacing: "0.14em", fontWeight: 600 }}>{r.unit}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Atmosphere presets */}
          <Card style={{ padding: "16px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.22em", color: "rgba(212,175,55,0.48)", marginBottom: 12, textTransform: "uppercase" }}>ATMOSPHERE PRESETS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
              {DEFAULT_PRESETS.map(p => {
                const active = activePresetId === p.id;
                return (
                  <motion.button key={p.id} whileTap={{ scale: 0.93 }}
                    onClick={() => handlePreset(p.id)}
                    style={{
                      minHeight: 64, padding: "12px 14px", cursor: "pointer",
                      background: active ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.025)",
                      border: `1.5px solid ${active ? GOLD : "rgba(212,175,55,0.16)"}`,
                      borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "space-between",
                      boxShadow: active ? `0 0 20px rgba(212,175,55,0.22)` : "none",
                      transition: "all 0.2s",
                    }}>
                    <span style={{ fontSize: 13, fontWeight: 900, letterSpacing: "0.18em", color: active ? GOLD : "rgba(255,255,255,0.42)", textTransform: "uppercase" }}>
                      {p.label}
                    </span>
                    {active && (
                      <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
                        style={{ width: 6, height: 6, borderRadius: "50%", background: GOLD, boxShadow: `0 0 6px ${GOLD}` }} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </Card>

          {/* Filtration + Air quality + Humidor */}
          <Card style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.22em", color: "rgba(212,175,55,0.48)", marginBottom: 14, textTransform: "uppercase" }}>FILTRATION & AIR</div>
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
                <span style={{ fontSize: 30, fontWeight: 900, color: TEAL }}>94</span>
              </div>
              <div style={{ borderTop: `1px solid rgba(212,175,55,0.09)`, paddingTop: 12 }}>
                <div style={{ fontSize: 9, letterSpacing: "0.20em", color: "rgba(212,175,55,0.38)", marginBottom: 10, textTransform: "uppercase" }}>HUMIDOR READINGS</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[{ label: "Temp", value: "65°F", color: GOLD }, { label: "Humidity", value: "72%", color: TEAL }].map(r => (
                    <div key={r.label}>
                      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.26)", letterSpacing: "0.14em", marginBottom: 2, textTransform: "uppercase" }}>{r.label}</div>
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
            <div style={{ fontSize: 10, letterSpacing: "0.24em", color: "rgba(212,175,55,0.48)", marginBottom: 10, textTransform: "uppercase" }}>HUMIDOR INVENTORY</div>
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
            <div style={{ fontSize: 10, letterSpacing: "0.22em", color: "rgba(212,175,55,0.48)", marginBottom: 16, textTransform: "uppercase" }}>SPIRIT RESERVES</div>
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
                          {(["−", "+"] as const).map((lbl, idx) => (
                            <button key={idx} onClick={() => setEditQty(q => idx === 0 ? Math.max(0, q - 1) : q + 1)}
                              style={{ width: 30, height: 30, borderRadius: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", color: "white", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{lbl}</button>
                          ))}
                          <span style={{ fontSize: 20, fontWeight: 900, color, minWidth: 28, textAlign: "center" }}>{editQty}</span>
                          <button onClick={() => setEditId(null)} style={{ padding: "5px 10px", borderRadius: 6, background: "rgba(50,180,90,0.18)", border: "1px solid rgba(50,180,90,0.40)", color: GREEN, cursor: "pointer", fontSize: 11, fontWeight: 800 }}>SAVE</button>
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
                { label: "Shift Revenue", value: `$${shiftTotal.toLocaleString()}`, color: GOLD      },
                { label: "Active Tables", value: `${activeTables.length}`,          color: TEAL      },
                { label: "Avg Spend",     value: `$${avgSpend}`,                    color: "#9B59B6" },
              ].map(m => (
                <div key={m.label}>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.26)", letterSpacing: "0.16em", marginBottom: 4, textTransform: "uppercase" }}>{m.label}</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color: m.color, lineHeight: 1 }}>{m.value}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Active tables */}
          <Card>
            <div style={{ padding: "13px 18px", borderBottom: `1px solid rgba(212,175,55,0.07)`,
              display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, letterSpacing: "0.22em", color: "rgba(212,175,55,0.48)", textTransform: "uppercase" }}>ACTIVE GUEST TABS</span>
              <span style={{ fontSize: 12, color: TEAL, fontWeight: 800, letterSpacing: "0.12em" }}>{activeTables.length} OPEN</span>
            </div>
            <div style={{ overflow: "auto", maxHeight: 230 }}>
              {activeTables.map(t => (
                <motion.div key={t.id} whileTap={{ backgroundColor: "rgba(212,175,55,0.05)" }}
                  style={{ padding: "13px 18px", borderBottom: `1px solid rgba(255,255,255,0.03)`,
                    display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
                  onClick={() => setBillTableId(t.id)}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.84)" }}>{t.name}</span>
                      {t.vip && (
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 800,
                          background: `${GOLD}14`, border: `1px solid ${GOLD}44`, color: GOLD }}>VIP</span>
                      )}
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 10, fontWeight: 800,
                        background: `${loyaltyColor(t.loyalty)}12`, border: `1px solid ${loyaltyColor(t.loyalty)}38`,
                        color: loyaltyColor(t.loyalty) }}>{t.loyalty}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.30)", letterSpacing: "0.10em" }}>
                      TABLE {t.id} · {t.guests} GUESTS
                    </span>
                  </div>
                  <span style={{ fontSize: 22, fontWeight: 900, color: GOLD }}>${t.spend.toLocaleString()}</span>
                </motion.div>
              ))}
            </div>
          </Card>

          {/* Quick actions */}
          <Card style={{ padding: "15px 16px" }}>
            <div style={{ fontSize: 13, letterSpacing: "0.22em", color: "rgba(212,175,55,0.55)", marginBottom: 11, textTransform: "uppercase", fontWeight: 800 }}>QUICK ACTIONS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9 }}>
              {[
                { label: "OPEN TAB",  color: GREEN,    action: () => setPendingAction("open_tab")  },
                { label: "CLOSE TAB", color: GOLD,     action: () => setPendingAction("close_tab") },
                { label: "VOID ITEM", color: RED_H,    action: () => setPendingAction("void_item") },
              ].map(a => (
                <motion.button key={a.label} whileTap={{ scale: 0.93 }}
                  onClick={a.action}
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
                { label: "Shift Revenue Goal",  current: shiftTotal,      target: 5000, color: GOLD      },
                { label: "Average Spend Target", current: avgSpend,        target: 350,  color: TEAL      },
                { label: "VIP Table Fill Rate",  current: activeTables.filter(t => t.vip).length, target: 3, color: "#9B59B6" },
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
            <div style={{ padding: "13px 18px", borderBottom: `1px solid ${BORDER_DIM}`,
              display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 10, letterSpacing: "0.22em", color: "rgba(212,175,55,0.48)", textTransform: "uppercase" }}>RECENT ACTIVITY</span>
              <span style={{ fontSize: 11, color: "rgba(212,175,55,0.35)", fontWeight: 700, letterSpacing: "0.10em" }}>LAST {Math.min(liveTabs.length, 10)}</span>
            </div>
            <div style={{ overflow: "auto", maxHeight: 240 }}>
              {liveTabs.slice(0, 10).map(t => (
                <motion.div key={t.id} whileTap={{ backgroundColor: "rgba(212,175,55,0.04)" }}
                  style={{ padding: "11px 18px", borderBottom: `1px solid rgba(255,255,255,0.03)`,
                    display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "default" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.82)", marginBottom: 2 }}>{t.name}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.26)", letterSpacing: "0.10em" }}>
                      TABLE {t.id} · {t.guests} GUEST{t.guests !== 1 ? "S" : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: GOLD, lineHeight: 1 }}>${t.spend.toLocaleString()}</div>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3,
                      color: t.status === "active" ? TEAL : "rgba(255,255,255,0.22)" }}>
                      {t.status}
                    </div>
                  </div>
                </motion.div>
              ))}
              {liveTabs.length === 0 && (
                <div style={{ padding: "24px", textAlign: "center", fontSize: 11,
                  color: "rgba(255,255,255,0.18)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                  NO ACTIVITY THIS SHIFT
                </div>
              )}
            </div>
          </Card>
        </div>

      </main>

      {/* ── Bill Modal ── */}
      <AnimatePresence>
        {billTableId !== null && (
          <BillModal
            tableId={billTableId}
            onClose={() => setBillTableId(null)}
            onSendBill={() => { void handleSendBill(billTableId); }}
          />
        )}
      </AnimatePresence>

      {/* ── Action PIN Gate — staff must authenticate before OPEN/CLOSE/VOID ── */}
      <AnimatePresence>
        {pendingAction !== null && (
          <StaffPinGate
            level="staff"
            onSuccess={() => {
              const token   = localStorage.getItem("axiom_token") ?? "";
              const headers: HeadersInit = {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              };
              if (pendingAction === "open_tab") {
                const venueId = localStorage.getItem("axiom_venue_id") ?? "default";
                fetch("/api/tabs/open", {
                  method: "POST", headers,
                  body: JSON.stringify({ guestName: "Walk-in Guest", venueId }),
                })
                  .then(r => r.ok ? r.json() : null)
                  .then(d => { if (d?.tab?.id) setBillTableId(Number(d.tab.id)); })
                  .catch(() => {});
              } else if (pendingAction === "close_tab" && activeTables[0]) {
                setBillTableId(activeTables[0].id);
              } else if (pendingAction === "void_item" && activeTables[0]) {
                const tabId = activeTables[0].id;
                fetch(`/api/tabs/${tabId}/void`, { method: "POST", headers })
                  .then(r => r.ok ? r.json() : null)
                  .then(() => setLiveTabs(prev => prev.filter(t => t.id !== tabId)))
                  .catch(() => {});
              }
              setPendingAction(null);
            }}
            onCancel={() => setPendingAction(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
