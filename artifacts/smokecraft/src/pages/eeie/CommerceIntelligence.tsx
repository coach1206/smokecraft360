/**
 * EEIE Commerce Intelligence Center
 * Money-flow brain of EEIE. Same design language as Staff Cockpit, Product Wall,
 * Media Library, Mood Sensor, and Unified Data Brain.
 *
 * Sections:
 *  — Commerce Overview Banner (live revenue + KPIs)
 *  — Revenue Intelligence (sparkline + category rings)
 *  — POS Adapter Health (visual cards + flow pipeline)
 *  — Pairing Bundle Performance (image-forward cards)
 *  — Live Commerce Feed (event stream)
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Package, DollarSign, BarChart2,
  CheckCircle, AlertTriangle, WifiOff, Wifi,
  ShoppingCart, Zap, Leaf, Coffee, Utensils,
  Activity, Eye, ArrowRight, Layers, GitBranch,
} from "lucide-react";
import {
  type Theme, Badge, Meter, Panel, DonutRing,
  Waveform, KpiCard, LiveDot, triggerHaptic,
} from "./shared";
import "@/styles/eeie-motion.css";

// ── POS Adapter data ──────────────────────────────────────────

interface Adapter {
  id: string; name: string; color: string;
  status: "healthy" | "degraded" | "unconfigured" | "offline";
  syncMs: number; errors: number; simulated: boolean;
  lastSync: string; throughput: number;
}

const ADAPTERS: Adapter[] = [
  { id: "eeie",   name: "EEIE Internal",  color: "#00AAFF", status: "healthy",      syncMs: 8,   errors: 0, simulated: true,  lastSync: "1s ago",  throughput: 100 },
  { id: "toast",  name: "Toast POS",      color: "#F97316", status: "healthy",      syncMs: 45,  errors: 0, simulated: true,  lastSync: "3s ago",  throughput: 94  },
  { id: "stripe", name: "Stripe Terminal",color: "#6772E5", status: "healthy",      syncMs: 12,  errors: 0, simulated: true,  lastSync: "6s ago",  throughput: 99  },
  { id: "custom", name: "Custom API",     color: "#A78BFA", status: "degraded",     syncMs: 280, errors: 3, simulated: false, lastSync: "48s ago", throughput: 41  },
  { id: "square", name: "Square",         color: "#00D4AA", status: "unconfigured", syncMs: 0,   errors: 0, simulated: false, lastSync: "—",       throughput: 0   },
  { id: "clover", name: "Clover",         color: "#05C16E", status: "unconfigured", syncMs: 0,   errors: 0, simulated: false, lastSync: "—",       throughput: 0   },
];

// ── Bundle performance data ───────────────────────────────────

interface BundleProduct { name: string; color: string; icon: React.ElementType; }
interface Bundle {
  id: string; name: string; revenue: string; conversions: number;
  matchScore: number; trending: boolean; trend: string;
  products: BundleProduct[];
}

const BUNDLES: Bundle[] = [
  {
    id: "b1", name: "Cream & Oak Experience",
    revenue: "$3,420", conversions: 38, matchScore: 94, trending: true,
    trend: "+18% vs last week",
    products: [
      { name: "Padron 1964 Exclusivo",    color: "#7C3AED", icon: Leaf     },
      { name: "Woodford Reserve D.O.",    color: "#D97706", icon: Coffee   },
      { name: "Smoked Short Rib Sliders", color: "#DC2626", icon: Utensils },
    ],
  },
  {
    id: "b2", name: "Bold Barrel Pairing",
    revenue: "$2,670", conversions: 24, matchScore: 88, trending: false,
    trend: "+4% vs last week",
    products: [
      { name: "Arturo Fuente Opus X",     color: "#059669", icon: Leaf     },
      { name: "Hennessy VSOP",            color: "#B45309", icon: Coffee   },
      { name: "Truffle Charcuterie",      color: "#065F46", icon: Utensils },
    ],
  },
  {
    id: "b3", name: "Sweet Finish Session",
    revenue: "$1,980", conversions: 29, matchScore: 96, trending: true,
    trend: "+31% vs last week",
    products: [
      { name: "My Father Le Bijou 1922",  color: "#0891B2", icon: Leaf     },
      { name: "Balvenie DoubleWood 17",   color: "#7C3AED", icon: Coffee   },
      { name: "Vanilla Crème Brûlée",     color: "#F59E0B", icon: Utensils },
    ],
  },
];

// ── Revenue sparkline ─────────────────────────────────────────

const HOURLY_REV = [120, 180, 220, 160, 310, 285, 420, 380, 510, 480, 610, 580];
const REV_MAX    = Math.max(...HOURLY_REV);
const HOURS      = ["8a","9a","10a","11a","12p","1p","2p","3p","4p","5p","6p","7p"];
const TOTAL_REV  = HOURLY_REV.reduce((a, b) => a + b, 0);

// ── Revenue category rings ────────────────────────────────────

const CATEGORIES = [
  { label: "Cigars",  pct: 42, color: "#7C3AED" },
  { label: "Spirits", pct: 31, color: "#D97706" },
  { label: "Food",    pct: 18, color: "#059669" },
  { label: "Bundles", pct: 9,  color: "#0891B2" },
];

// ── Commerce event feed ───────────────────────────────────────

const EVENTS = [
  { id: "e1", type: "Bundle Confirmed",  detail: "T2 · Elena V.",     amount: "$118",  color: "#00AAFF", ts: "2m ago"  },
  { id: "e2", type: "POS Sync",          detail: "Toast Adapter",      amount: "8ms",   color: "#00E87A", ts: "3m ago"  },
  { id: "e3", type: "Cigar Added",       detail: "T1 · Marcus R.",     amount: "$42",   color: "#7C3AED", ts: "5m ago"  },
  { id: "e4", type: "Cart Confirmed",    detail: "T4 · Sophia L.",     amount: "$64",   color: "#22D3EE", ts: "7m ago"  },
  { id: "e5", type: "Inventory Alert",   detail: "Padron 1964 · Low",  amount: "3 left",color: "#F59E0B", ts: "11m ago" },
  { id: "e6", type: "Bundle Abandoned",  detail: "T7 · James O.",      amount: "$89",   color: "#FF3B5C", ts: "14m ago" },
];

// ── Commerce flow pipeline steps ─────────────────────────────

const FLOW_STEPS = [
  { label: "Guest Session", count: "4 active" },
  { label: "Swipe Engine",  count: "Live"     },
  { label: "Bundle Match",  count: "3 open"   },
  { label: "Cart Confirm",  count: "2 pending"},
  { label: "POS Handoff",   count: "Healthy"  },
  { label: "Revenue",       count: "$4,280"   },
];

// ── Helpers ───────────────────────────────────────────────────

function adapterStatusColor(status: Adapter["status"], T: Theme) {
  return { healthy: T.green, degraded: T.yellow, unconfigured: T.textSub, offline: T.red }[status];
}

function adapterClass(status: Adapter["status"]) {
  return status === "healthy"      ? "eeie-active-breathe"
       : status === "degraded"     ? "eeie-warning-pulse"
       : "eeie-machine-pulse";
}

// ── Component ─────────────────────────────────────────────────

interface Props { T: Theme; }

export function CommerceIntelligenceTab({ T }: Props) {
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    triggerHaptic("success");
    setToast(msg);
    setTimeout(() => setToast(null), 2400);
  }

  const flowColors = [T.accent, T.cyan, T.purple, T.yellow, T.green, T.green];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* ── Commerce Overview Banner ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="eeie-active-breathe"
        style={{
          padding: "20px 28px", borderRadius: 18,
          background: `${T.accent}10`, border: `1px solid ${T.accent}28`,
          boxShadow: `0 0 40px ${T.accent}10`,
          display: "flex", alignItems: "center", gap: 28,
          position: "relative", overflow: "hidden",
        }}
      >
        <div className="eeie-mood-wash" style={{ background: `${T.accent}08` }} />

        {/* Revenue figure */}
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.20em", marginBottom: 4 }}>
            TODAY'S COMMERCE INTELLIGENCE
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: T.text, letterSpacing: "-0.03em" }}>$4,280</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
            <Badge label="+14% vs yesterday" color={T.green} bg={`${T.green}14`} />
            <LiveDot color={T.green} size={5} />
            <span style={{ fontSize: 8.5, color: T.green, fontWeight: 700, fontFamily: T.mono }}>LIVE REVENUE</span>
          </div>
        </div>

        {/* Quick stat pills */}
        <div style={{ display: "flex", gap: 28, marginLeft: 12, position: "relative" }}>
          {[
            { l: "ORDERS",     v: "46"   },
            { l: "AVG CHECK",  v: "$94"  },
            { l: "CONVERSION", v: "76%"  },
            { l: "NET MARGIN", v: "58%"  },
          ].map(m => (
            <div key={m.l}>
              <div style={{ fontSize: 7.5, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.16em", marginBottom: 3 }}>{m.l}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.accent }}>{m.v}</div>
            </div>
          ))}
        </div>

        {/* Waveform */}
        <div style={{ flex: 1, maxWidth: 260, position: "relative" }}>
          <Waveform color={T.accent} speed={3.2} height={44} />
        </div>

        {/* Status chips */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, position: "relative" }}>
          {[
            { label: "POS ADAPTERS", v: "3 healthy",  c: T.green  },
            { label: "SYNC SPEED",   v: "8ms avg",    c: T.accent },
            { label: "AI BUNDLES",   v: "3 active",   c: T.purple },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div className="eeie-status-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: s.c }} />
              <span style={{ fontSize: 7.5, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.14em" }}>{s.label}</span>
              <span style={{ fontSize: 7.5, color: s.c, fontWeight: 700, fontFamily: T.mono }}>{s.v}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12 }}>
        <KpiCard label="Today's Revenue"  value="$4,280" delta="↑ +14% vs yesterday"  positive T={T} color={T.green}  icon={DollarSign}  />
        <KpiCard label="Avg Check Size"   value="$94"    delta="↑ +8% vs 7-day avg"   positive T={T} color={T.accent} icon={ShoppingCart} />
        <KpiCard label="Conversion Rate"  value="76%"    delta="↑ +3pts vs last week"  positive T={T} color={T.purple} icon={TrendingUp}   />
        <KpiCard label="Net Margin"       value="58%"    delta="↑ +2pts vs last month" positive T={T} color={T.cyan}   icon={BarChart2}    />
      </div>

      {/* ── Revenue Intelligence ───────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 14 }}>

        {/* Hourly sparkline */}
        <Panel title="Hourly Revenue Flow" subtitle="Commerce momentum · Today" icon={<Activity size={14} />} badge="LIVE" T={T} accentColor={T.green}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 80 }}>
            {HOURLY_REV.map((v, i) => {
              const pct  = v / REV_MAX;
              const isNow = i === HOURLY_REV.length - 1;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${pct * 68}px` }}
                    transition={{ delay: i * 0.04, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                    className={isNow ? "eeie-machine-pulse" : ""}
                    style={{
                      width: "100%", borderRadius: 4, minHeight: 3,
                      background: isNow ? T.accent : `${T.accent}45`,
                    }}
                  />
                  <div style={{ fontSize: 7, color: T.textFaint, fontFamily: T.mono }}>{HOURS[i]}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 10, color: T.textSub }}>Total revenue logged today</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>${TOTAL_REV.toLocaleString()}</span>
          </div>
        </Panel>

        {/* Category rings */}
        <Panel title="Revenue Mix" subtitle="By category" icon={<Layers size={14} />} T={T}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {CATEGORIES.map(cat => (
              <div key={cat.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <DonutRing pct={cat.pct} color={cat.color} size={42} label={`${cat.pct}%`} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{cat.label}</div>
                  <div style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono }}>{cat.pct}% of total</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* ── POS Adapter Health ─────────────────────────────────── */}
      <Panel title="POS Adapter Health" subtitle="Commerce infrastructure · Live sync status" icon={<Zap size={14} />} T={T} accentColor={T.green}>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
          {ADAPTERS.map(a => {
            const sc = adapterStatusColor(a.status, T);
            return (
              <motion.div key={a.id} whileHover={{ y: -1 }}
                className={adapterClass(a.status)}
                style={{
                  padding: "14px 16px", borderRadius: 14,
                  background: a.status === "unconfigured"
                    ? (T.dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)")
                    : `${sc}08`,
                  border: `1px solid ${a.status === "degraded" ? `${sc}35` : T.border}`,
                  boxShadow: T.shadow,
                  opacity: a.status === "unconfigured" ? 0.55 : 1,
                }}
              >
                {/* Header row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 9,
                      background: `${a.color}18`, border: `1px solid ${a.color}30`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      {a.status === "unconfigured"
                        ? <WifiOff size={14} color={T.textSub} />
                        : <Wifi    size={14} color={a.color}   />
                      }
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.text }}>{a.name}</div>
                      {a.simulated && (
                        <div style={{ fontSize: 7.5, color: T.textFaint, fontFamily: T.mono }}>SIMULATED</div>
                      )}
                    </div>
                  </div>
                  <Badge label={a.status.toUpperCase()} color={sc} bg={`${sc}14`} />
                </div>

                {/* Metrics */}
                {a.status !== "unconfigured" ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 8 }}>
                      {[
                        { l: "Last Sync",  v: a.lastSync },
                        { l: "Sync Speed", v: a.syncMs ? `${a.syncMs}ms` : "—" },
                      ].map(m => (
                        <div key={m.l} style={{ padding: "7px 9px", borderRadius: 8, background: `${T.accent}06`, border: `1px solid ${T.border}` }}>
                          <div style={{ fontSize: 7.5, color: T.textFaint, fontFamily: T.mono, marginBottom: 2 }}>{m.l}</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{m.v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: T.textSub, marginBottom: 4 }}>
                      <span>Throughput</span>
                      <span style={{ color: sc, fontWeight: 700 }}>{a.throughput}%</span>
                    </div>
                    <Meter pct={a.throughput} color={sc} height={4} />
                    {a.errors > 0 && (
                      <div style={{ marginTop: 8, padding: "6px 9px", borderRadius: 7, background: `${T.yellow}0E`, border: `1px solid ${T.yellow}25`, fontSize: 9, color: T.yellow, fontFamily: T.mono }}>
                        ⚠ {a.errors} recent errors · degraded sync
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontSize: 9.5, color: T.textSub, lineHeight: 1.6 }}>
                    Add <span style={{ color: a.color, fontWeight: 700 }}>{a.id.toUpperCase()}_API_KEY</span> to activate integration.
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Commerce flow pipeline */}
        <div style={{ padding: "14px 16px", borderRadius: 12, background: `${T.accent}05`, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 7.5, color: T.textFaint, fontFamily: T.mono, letterSpacing: "0.18em", marginBottom: 12 }}>
            COMMERCE FLOW PIPELINE · LIVE
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            {FLOW_STEPS.map((step, i) => {
              const c = flowColors[i] ?? T.accent;
              return (
                <div key={step.label} style={{ display: "flex", alignItems: "center", flex: 1 }}>
                  <div style={{
                    flex: 1, padding: "10px 6px", borderRadius: 10,
                    background: `${c}0E`, border: `1px solid ${c}28`,
                    textAlign: "center" as const,
                  }}>
                    <div className="eeie-status-pulse"
                      style={{ width: 6, height: 6, borderRadius: "50%", background: c, margin: "0 auto 5px" }} />
                    <div style={{ fontSize: 7.5, fontWeight: 700, color: c, fontFamily: T.mono, letterSpacing: "0.08em" }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: 9, color: T.text, marginTop: 2 }}>{step.count}</div>
                  </div>
                  {i < FLOW_STEPS.length - 1 && (
                    <div style={{ flexShrink: 0, padding: "0 3px" }}>
                      <ArrowRight size={10} color={`${T.accent}50`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Panel>

      {/* ── Pairing Bundle Performance ─────────────────────────── */}
      <Panel title="Pairing Bundle Performance" subtitle="AI-curated bundles · Revenue & conversion intelligence" icon={<Package size={14} />} T={T} accentColor={T.purple}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {BUNDLES.map(b => (
            <motion.div key={b.id}
              className="eeie-module-card eeie-live-card eeie-hover-lift eeie-machine-pulse"
              style={{ borderRadius: 14, border: `1px solid ${T.border}`, background: T.card, overflow: "hidden", boxShadow: T.shadow }}
            >
              {/* 3-panel product image strip */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", height: 88, borderBottom: `1px solid ${T.border}` }}>
                {b.products.map((prod, i) => {
                  const Icon = prod.icon;
                  return (
                    <div key={i}
                      className="eeie-image-shimmer"
                      style={{
                        background: `linear-gradient(135deg, ${prod.color}18 0%, ${prod.color}06 100%)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexDirection: "column", gap: 5,
                        borderRight: i < 2 ? `1px solid ${prod.color}14` : "none",
                      }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: 9,
                        background: `${prod.color}20`, border: `1px solid ${prod.color}35`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon size={15} color={prod.color} />
                      </div>
                      <div style={{
                        fontSize: 6.5, color: `${prod.color}A0`,
                        fontFamily: T.mono, textAlign: "center" as const, padding: "0 4px",
                        lineHeight: 1.2,
                      }}>
                        {prod.name.split(" ").slice(0, 2).join(" ")}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ padding: "12px 14px" }}>
                {/* Name + trend badge */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: T.text, lineHeight: 1.3, flex: 1 }}>{b.name}</div>
                  {b.trending && (
                    <div style={{ marginLeft: 6, flexShrink: 0 }}>
                      <Badge label="TRENDING" color={T.green} bg={`${T.green}14`} />
                    </div>
                  )}
                </div>

                {/* Revenue + match ring */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: T.text }}>{b.revenue}</div>
                    <div style={{ fontSize: 8.5, color: T.green, fontFamily: T.mono }}>{b.trend}</div>
                  </div>
                  <DonutRing pct={b.matchScore} color={T.green} size={50} label={`${b.matchScore}%`} />
                </div>

                {/* Conversions meter */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8.5, color: T.textFaint, marginBottom: 3 }}>
                    <span>Conversions</span>
                    <span style={{ fontWeight: 700, color: T.accent }}>{b.conversions} orders</span>
                  </div>
                  <Meter pct={Math.min(100, b.conversions * 2.6)} color={T.accent} height={4} />
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 6 }}>
                  <motion.button whileTap={{ scale: 0.93 }}
                    onClick={() => showToast(`${b.name} shown to table`)}
                    style={{
                      flex: 1, padding: "9px 0", borderRadius: 9,
                      border: `1px solid ${T.border}`, background: "transparent",
                      color: T.textSub, cursor: "pointer", fontSize: 9.5,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    }}>
                    <Eye size={11} /> View
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.93 }}
                    onClick={() => showToast(`${b.name} pushed to POS`)}
                    style={{
                      flex: 1, padding: "9px 0", borderRadius: 9,
                      border: "none", background: T.accent, color: "#fff",
                      cursor: "pointer", fontSize: 9.5, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                    }}>
                    <ShoppingCart size={11} /> Push to POS
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Panel>

      {/* ── AI Commerce Insight ───────────────────────────────── */}
      <Panel title="AI Commerce Insight" subtitle="EEIE revenue intelligence · Real-time advisory" icon={<GitBranch size={14} />} T={T} accentColor={T.purple}>
        <div className="eeie-ai-breathing" style={{
          padding: "16px 20px", borderRadius: 14,
          background: `${T.purple}08`, border: `1px solid ${T.purple}22`,
          display: "flex", gap: 18, alignItems: "flex-start",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 13, flexShrink: 0,
            background: `${T.purple}18`, border: `1px solid ${T.purple}35`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <TrendingUp size={20} color={T.purple} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: T.purple, letterSpacing: "0.16em", fontFamily: T.mono, marginBottom: 6 }}>
              EEIE REVENUE INTELLIGENCE · HIGH CONFIDENCE
            </div>
            <div style={{ fontSize: 13, color: T.text, lineHeight: 1.7, marginBottom: 10 }}>
              Table 2 (Elena V., Platinum) has an active conversion window. The <strong>Sweet Finish Session</strong> bundle has a 96% match score against her taste profile. Recommend immediate staff engagement — projected upsell: <span style={{ color: T.green, fontWeight: 700 }}>+$72 / +22% tip</span>.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "Match Score",  v: "96%",     c: T.green  },
                { label: "Confidence",   v: "94%",     c: T.accent },
                { label: "Time Window",  v: "< 4 min", c: T.yellow },
              ].map(s => (
                <div key={s.label} style={{ padding: "6px 12px", borderRadius: 8, background: `${s.c}0E`, border: `1px solid ${s.c}25` }}>
                  <div style={{ fontSize: 7.5, color: T.textFaint, fontFamily: T.mono, marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: s.c }}>{s.v}</div>
                </div>
              ))}
              <motion.button whileTap={{ scale: 0.93 }}
                onClick={() => showToast("Action sent to T2 staff")}
                style={{ marginLeft: "auto", padding: "8px 18px", borderRadius: 9, border: `1px solid ${T.purple}35`, background: `${T.purple}14`, color: T.purple, cursor: "pointer", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle size={13} /> Act Now
              </motion.button>
            </div>
          </div>
        </div>
      </Panel>

      {/* ── Live Commerce Feed ────────────────────────────────── */}
      <Panel title="Live Commerce Feed" subtitle="Real-time transaction and system events" icon={<Activity size={14} />} badge="LIVE" T={T} accentColor={T.green}>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {EVENTS.map((ev, i) => (
            <motion.div key={ev.id}
              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="eeie-feed-slide"
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px", borderRadius: 10,
                background: i === 0
                  ? `${ev.color}08`
                  : T.dark ? "rgba(255,255,255,0.02)" : "rgba(0,60,160,0.02)",
                border: `1px solid ${i === 0 ? `${ev.color}25` : T.border}`,
              }}
            >
              <div style={{ width: 3, height: 34, borderRadius: 2, background: ev.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: T.text, marginBottom: 2 }}>{ev.type}</div>
                <div style={{ fontSize: 9, color: T.textSub }}>{ev.detail}</div>
              </div>
              <div style={{ textAlign: "right" as const }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: ev.color }}>{ev.amount}</div>
                <div style={{ fontSize: 8, color: T.textFaint, fontFamily: T.mono }}>{ev.ts}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Health summary footer */}
        <div style={{ marginTop: 12, display: "flex", gap: 14, padding: "10px 14px", borderRadius: 10, background: `${T.accent}06`, border: `1px solid ${T.border}` }}>
          {[
            { icon: <CheckCircle size={11} color={T.green} />,    label: "All critical POS adapters healthy" },
            { icon: <AlertTriangle size={11} color={T.yellow} />, label: "Custom API degraded · 3 errors" },
            { icon: <TrendingUp size={11} color={T.accent} />,    label: "Revenue trending +14% vs yesterday" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {item.icon}
              <span style={{ fontSize: 9.5, color: T.textSub }}>{item.label}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{
              position: "fixed", bottom: 100, right: 32,
              background: T.accent, color: "#fff",
              padding: "12px 20px", borderRadius: 12,
              fontWeight: 700, fontSize: 12, zIndex: 999,
              boxShadow: `0 4px 20px ${T.accent}50`,
            }}
          >
            ✓ {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
