/**
 * ExecutiveWarRoom — /executive-war-room
 * Phase 2: Real-time Room Energy + Revenue Pressure Engine
 *
 * Tab 1 — Room Energy: live energy scores per table/session, status badges
 * Tab 2 — Revenue Pressure: product-level pressure heatmap (CRITICAL/HIGH/WATCH)
 * Tab 3 — Fleet Status: hardware heartbeat overview
 *
 * All data sourced from /api/executive-intelligence/* — no mocks.
 */

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence }     from "framer-motion";
import { useLocation }                 from "wouter";

const C = {
  bg:      "#F5F2ED",
  obsidian:"#1A1A1B",
  glass:   "rgba(26,26,27,0.04)",
  glassMd: "rgba(26,26,27,0.07)",
  border:  "rgba(26,26,27,0.09)",
  gold:    "#D48B00",
  text:    "#1A1A1B",
  muted:   "rgba(26,26,27,0.52)",
  dim:     "rgba(26,26,27,0.30)",
  green:   "#4ade80",
  red:     "#f87171",
  orange:  "#fb923c",
  yellow:  "#fbbf24",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getToken() {
  return localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token") ?? "";
}
function getVenueId() {
  const t = getToken();
  if (!t) return null;
  try { return JSON.parse(atob(t.split(".")[1]!)).venueId ?? null; } catch { return null; }
}
async function apiGet(path: string) {
  const r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!r.ok) throw new Error(r.status.toString());
  return r.json();
}
async function apiPost(path: string, body: unknown) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(r.status.toString());
  return r.json();
}

// ── Primitives ─────────────────────────────────────────────────────────────────

function AnimCount({ value, decimals = 0, suffix = "" }: { value: number; decimals?: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const dur = 800;
    const fn = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(parseFloat((value * ease).toFixed(decimals)));
      if (t < 1) raf = requestAnimationFrame(fn);
    };
    raf = requestAnimationFrame(fn);
    return () => cancelAnimationFrame(raf);
  }, [value, decimals]);
  return <span>{display.toFixed(decimals)}{suffix}</span>;
}

function Bar({ pct, color = C.gold }: { pct: number; color?: string }) {
  return (
    <div style={{ height: 4, background: "rgba(26,26,27,0.09)", borderRadius: 2, overflow: "hidden", marginTop: 5 }}>
      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.7, ease: "easeOut" }} style={{ height: "100%", background: color, borderRadius: 2 }} />
    </div>
  );
}

function GlassCard({ children, accent, style }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: C.glass, border: `1px solid ${accent ? accent + "33" : C.border}`,
      borderRadius: 14, padding: "18px 20px",
      boxShadow: accent ? `0 0 24px ${accent}14` : "none", ...style,
    }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{children}</div>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    HIGH_MOMENTUM: C.green, STAGNATION_RISK: C.orange,
    CRITICAL: C.red, HIGH: C.orange, WATCH: C.yellow,
    ONLINE: C.green, MESH_FAILOVER: C.orange, OFFLINE: C.red,
  };
  const color = colors[status] ?? C.muted;
  return (
    <span style={{
      fontSize: 9, letterSpacing: "0.1em", padding: "3px 8px",
      borderRadius: 20, border: `1px solid ${color}44`,
      color, background: `${color}14`, fontWeight: 600,
    }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ── Types ──────────────────────────────────────────────────────────────────────

type EnergyResult = {
  tableId: string; sessionId: string; energyScore: number; status: string;
  recommendation: string; breakdown: { velocityScore: number; premiumScore: number };
};
type PressureItem = {
  productId: string; productName: string; urgency: string; pressureRatio: number;
  velocity: number; stockLevel: number;
};
type FleetDevice = {
  deviceId: string; deviceType: string; networkStatus: string;
  firmwareVersion: string; lastHeartbeat: string | null;
  thermalThresholdCelsius: number; pixelShiftActive: boolean;
};

type Tab = "energy" | "pressure" | "fleet";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "energy",   label: "Room Energy",      icon: "⚡" },
  { id: "pressure", label: "Revenue Pressure", icon: "◈" },
  { id: "fleet",    label: "Fleet Status",     icon: "◉" },
];

// ── Room Energy tab ────────────────────────────────────────────────────────────

function RoomEnergyTab({ venueId }: { venueId: string | null }) {
  const [data, setData] = useState<EnergyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = () => {
    if (!venueId) return;
    setLoading(true);
    apiGet(`/api/executive-intelligence/venues/${venueId}/room-energy`)
      .then(d => { setData(d.sessions ?? []); setLastRefresh(new Date()); })
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); const iv = setInterval(load, 30_000); return () => clearInterval(iv); }, [venueId]);

  if (!venueId) return <Empty msg="No venue ID found in token — super_admin required." />;

  const avgScore = data.length ? Math.round(data.reduce((s, r) => s + r.energyScore, 0) / data.length) : 0;
  const momentum = data.filter(r => r.status === "HIGH_MOMENTUM").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Summary strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        <GlassCard accent={C.gold}>
          <Label>Avg Room Energy</Label>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif" }}>
            {loading ? "—" : <AnimCount value={avgScore} />}
          </div>
          <Bar pct={avgScore} color={avgScore > 75 ? C.green : avgScore > 40 ? C.gold : C.orange} />
        </GlassCard>
        <GlassCard accent={C.green}>
          <Label>High Momentum Tables</Label>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.green, fontFamily: "'Cormorant Garamond', serif" }}>
            {loading ? "—" : <AnimCount value={momentum} />}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>of {data.length} active</div>
        </GlassCard>
        <GlassCard>
          <Label>Last Refresh</Label>
          <div style={{ fontSize: 13, color: C.gold, marginTop: 8 }}>
            {lastRefresh.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Auto-refresh every 30s</div>
        </GlassCard>
      </div>

      {/* Per-table cards */}
      {loading && <Empty msg="Computing room energy…" />}
      {!loading && data.length === 0 && <Empty msg="No active sessions found for this venue." />}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
        <AnimatePresence>
          {data.map((r, i) => (
            <motion.div key={r.sessionId}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.3 }}>
              <GlassCard accent={r.status === "HIGH_MOMENTUM" ? C.green : C.orange}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <Label>Table {r.tableId}</Label>
                    <div style={{ fontSize: 11, color: C.muted }}>{r.sessionId.slice(0, 12)}…</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: r.status === "HIGH_MOMENTUM" ? C.green : C.orange, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1 }}>
                  <AnimCount value={r.energyScore} />
                </div>
                <Bar pct={r.energyScore} color={r.status === "HIGH_MOMENTUM" ? C.green : C.orange} />
                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>VELOCITY</div>
                    <div style={{ fontSize: 14, color: C.text }}>{r.breakdown.velocityScore.toFixed(1)}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: C.dim, marginBottom: 3 }}>PREMIUM</div>
                    <div style={{ fontSize: 14, color: C.text }}>{r.breakdown.premiumScore.toFixed(1)}</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, fontSize: 12, color: C.muted, lineHeight: 1.5, fontStyle: "italic" }}>
                  {r.recommendation}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Revenue Pressure Heatmap ───────────────────────────────────────────────────

function PressureTab({ venueId }: { venueId: string | null }) {
  const [data, setData] = useState<PressureItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venueId) return;
    setLoading(true);
    apiGet(`/api/executive-intelligence/venues/${venueId}/revenue-pressure`)
      .then(d => setData(d.pressureItems ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [venueId]);

  if (!venueId) return <Empty msg="No venue ID found in token." />;
  if (loading) return <Empty msg="Analyzing revenue pressure…" />;

  const urgencyColor: Record<string, string> = { CRITICAL: C.red, HIGH: C.orange, WATCH: C.yellow };
  const critical = data.filter(d => d.urgency === "CRITICAL");
  const high     = data.filter(d => d.urgency === "HIGH");
  const watch    = data.filter(d => d.urgency === "WATCH");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[["CRITICAL", critical.length, C.red], ["HIGH", high.length, C.orange], ["WATCH", watch.length, C.yellow]].map(([label, count, color]) => (
          <GlassCard key={label as string} accent={color as string}>
            <Label>{label as string}</Label>
            <div style={{ fontSize: 36, fontWeight: 700, color: color as string, fontFamily: "'Cormorant Garamond', serif" }}>
              <AnimCount value={count as number} />
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>products at pressure</div>
          </GlassCard>
        ))}
      </div>

      {/* Heatmap grid — color intensity = pressure ratio */}
      <GlassCard>
        <Label>2.5D Revenue Pressure Heatmap</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 6, marginTop: 8 }}>
          {data.map((item, i) => {
            const color = urgencyColor[item.urgency] ?? C.gold;
            const intensity = Math.min(1, item.pressureRatio / 3);
            return (
              <motion.div key={item.productId}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                style={{
                  padding: "10px 12px",
                  background: `${color}${Math.round(intensity * 38).toString(16).padStart(2, "0")}`,
                  border: `1px solid ${color}55`, borderRadius: 10, cursor: "default",
                  boxShadow: intensity > 0.7 ? `0 0 16px ${color}44` : "none",
                }}>
                <div style={{ fontSize: 10, color: C.text, fontWeight: 600, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.productName || item.productId.slice(0, 10)}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: "'Cormorant Garamond', serif" }}>
                  {item.pressureRatio.toFixed(1)}×
                </div>
                <StatusBadge status={item.urgency} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: C.muted }}>
                  <span>vel {item.velocity}</span>
                  <span>stk {item.stockLevel}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
        {data.length === 0 && <div style={{ color: C.muted, fontSize: 12, padding: "20px 0", textAlign: "center" }}>No pressure signals detected — inventory is healthy.</div>}
      </GlassCard>
    </div>
  );
}

// ── Fleet Status tab ───────────────────────────────────────────────────────────

function FleetTab({ venueId }: { venueId: string | null }) {
  const [data, setData] = useState<FleetDevice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const qs = venueId ? `?venueId=${venueId}` : "";
    setLoading(true);
    apiGet(`/api/hardware-fleet${qs}`)
      .then(d => setData(d.devices ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [venueId]);

  if (loading) return <Empty msg="Polling hardware fleet…" />;
  if (data.length === 0) return <Empty msg="No devices registered yet." />;

  const online  = data.filter(d => d.networkStatus === "ONLINE").length;
  const mesh    = data.filter(d => d.networkStatus === "MESH_FAILOVER").length;
  const offline = data.filter(d => d.networkStatus === "OFFLINE").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
        {[["Online", online, C.green], ["Mesh Failover", mesh, C.orange], ["Offline", offline, C.red]].map(([l, n, col]) => (
          <GlassCard key={l as string} accent={col as string}>
            <Label>{l as string}</Label>
            <div style={{ fontSize: 32, fontWeight: 700, color: col as string, fontFamily: "'Cormorant Garamond', serif" }}>{n as number}</div>
          </GlassCard>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.map((d, i) => (
          <motion.div key={d.deviceId} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
            <GlassCard accent={d.networkStatus === "ONLINE" ? C.green : d.networkStatus === "MESH_FAILOVER" ? C.orange : C.red}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>{d.deviceType ?? "Unknown"}</div>
                  <div style={{ fontSize: 10, color: C.dim }}>{d.deviceId.slice(0, 18)}…</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <StatusBadge status={d.networkStatus} />
                  <div style={{ fontSize: 10, color: C.muted }}>fw {d.firmwareVersion ?? "—"}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 11, color: C.muted }}>
                <span>Thermal: {d.thermalThresholdCelsius}°C max</span>
                <span>Pixel shift: {d.pixelShiftActive ? "✓ ON" : "✗ OFF"}</span>
                {d.lastHeartbeat && <span>Last ping: {new Date(d.lastHeartbeat).toLocaleTimeString()}</span>}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div style={{ color: C.muted, fontSize: 13, padding: "48px 0", textAlign: "center", letterSpacing: "0.04em" }}>{msg}</div>;
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function ExecutiveWarRoom() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("energy");
  const venueId = getVenueId();

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text, fontFamily: "'Cormorant Garamond', serif", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(212,139,0,0.8) 40%,rgba(212,139,0,0.8) 60%,transparent)", zIndex: 20 }} />

      {/* Header */}
      <div style={{ padding: "18px 24px 0", position: "sticky", top: 0, zIndex: 15, background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <button onClick={() => navigate(-1 as never)} style={{ background: C.glass, border: `1px solid ${C.border}`, color: C.muted, padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, letterSpacing: "0.08em", fontFamily: "inherit" }}>← BACK</button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: "clamp(17px,3.5vw,24px)", fontWeight: 500, color: C.gold, letterSpacing: "0.06em" }}>Executive War Room</h1>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.14em", marginTop: 2 }}>AXIOM OS · PHASE 2 — COMMAND LAYER</div>
          </div>
          <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.8, repeat: Infinity }} style={{ width: 7, height: 7, borderRadius: "50%", background: C.green }} />
          <span style={{ fontSize: 10, color: C.green, letterSpacing: "0.1em" }}>LIVE</span>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flexShrink: 0, padding: "9px 18px", background: "none", border: "none", cursor: "pointer",
              fontSize: 12, letterSpacing: "0.06em", fontFamily: "inherit",
              color: tab === t.id ? C.gold : C.muted,
              borderBottom: tab === t.id ? `2px solid ${C.gold}` : "2px solid transparent",
              transition: "all 0.15s",
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 80px" }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {tab === "energy"   && <RoomEnergyTab   venueId={venueId} />}
            {tab === "pressure" && <PressureTab      venueId={venueId} />}
            {tab === "fleet"    && <FleetTab         venueId={venueId} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
