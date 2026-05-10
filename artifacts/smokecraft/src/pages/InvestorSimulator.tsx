/**
 * InvestorSimulator — /investor-simulator
 * Phase 6: Expansion Simulator — Metcalfe's Law applied to hospitality data networks
 *
 * Tab 1 — Live Snapshot: real DB counts → full valuation report
 * Tab 2 — Simulator: drag venue slider 1–5000, watch curve animate live
 * Tab 3 — Revenue: SaaS + Manufacturer + Upsell projections at scale
 *
 * Pulls from /api/investor-demo/* — no mocks.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence }                   from "framer-motion";
import { useLocation }                               from "wouter";

const C = {
  bg:      "#F5F2ED",
  glass:   "rgba(26,26,27,0.04)",
  glassMd: "rgba(26,26,27,0.07)",
  border:  "rgba(26,26,27,0.09)",
  gold:    "#D48B00",
  text:    "#1A1A1B",
  muted:   "rgba(26,26,27,0.52)",
  dim:     "rgba(26,26,27,0.30)",
  green:   "#4ade80",
  blue:    "#60a5fa",
  purple:  "#a78bfa",
};

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const getToken = () => localStorage.getItem("axiom_jwt") ?? localStorage.getItem("auth_token") ?? "";
async function apiGet(path: string) {
  const r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!r.ok) throw new Error(r.status.toString());
  return r.json();
}

// ── Math engine (mirrors API) ──────────────────────────────────────────────────

const BASE_VALUE = 12.5;
const VENUE_TARGET = 5000;

function calcNetwork(venues: number, guests: number) {
  const multiplier = Math.log10(venues + 1) * 2.5;
  const valuation  = guests * BASE_VALUE * multiplier;
  const accuracy   = Math.min(99.9, venues * 0.15 + 65);
  const dominance  = (venues / VENUE_TARGET) * 100;
  return { multiplier, valuation, accuracy, dominance };
}
function calcRevenue(venues: number) {
  const saas  = venues * 1500 * 12;
  const mfr   = venues * 5000 * 12;
  const upsel = venues * 25000;
  return { saas, mfr, upsel, total: saas + mfr + upsel };
}
const usd = (n: number) => n >= 1e9 ? `$${(n / 1e9).toFixed(2)}B`
  : n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M`
  : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

// ── Primitives ─────────────────────────────────────────────────────────────────

function AnimCount({ target, duration = 0.8, prefix = "", suffix = "", decimals = 0 }: { target: number; duration?: number; prefix?: string; suffix?: string; decimals?: number }) {
  const [val, setVal] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    const from = ref.current;
    ref.current = target;
    const start = performance.now();
    const dur = duration * 1000;
    let raf = 0;
    const fn = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(from + (target - from) * ease);
      if (t < 1) raf = requestAnimationFrame(fn);
    };
    raf = requestAnimationFrame(fn);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return <span>{prefix}{val.toFixed(decimals)}{suffix}</span>;
}

function GlassCard({ children, accent, style }: { children: React.ReactNode; accent?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ background: C.glass, border: `1px solid ${accent ? accent + "44" : C.border}`, borderRadius: 14, padding: "18px 20px", boxShadow: accent ? `0 0 28px ${accent}18` : "none", ...style }}>
      {children}
    </div>
  );
}
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>{children}</div>;
}
function Empty({ msg }: { msg: string }) {
  return <div style={{ color: C.muted, fontSize: 13, padding: "48px 0", textAlign: "center" }}>{msg}</div>;
}

// ── Metcalfe Curve SVG ────────────────────────────────────────────────────────

function MetcalfeCurve({ venueCount, maxVenues = 1000 }: { venueCount: number; maxVenues?: number }) {
  const W = 560; const H = 180;
  const pad = { l: 48, r: 20, t: 16, b: 32 };
  const IW = W - pad.l - pad.r;
  const IH = H - pad.t - pad.b;

  const guestDensity = 200; // default 200 guests/venue
  const points = Array.from({ length: 101 }, (_, i) => {
    const v = (i / 100) * maxVenues;
    const g = v * guestDensity;
    const { valuation } = calcNetwork(Math.max(1, v), g);
    return valuation;
  });
  const maxVal = Math.max(...points, 1);

  const pathD = points.map((val, i) => {
    const x = pad.l + (i / 100) * IW;
    const y = pad.t + IH - (val / maxVal) * IH;
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ");

  const markerX = pad.l + (venueCount / maxVenues) * IW;
  const markerVal = points[Math.round(venueCount / maxVenues * 100)] ?? 0;
  const markerY = pad.t + IH - (markerVal / maxVal) * IH;

  const gridVals = [maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal].map(v =>
    v >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : `$${(v / 1e6).toFixed(0)}M`
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75, 1].map((frac, i) => (
        <g key={i}>
          <line x1={pad.l} y1={pad.t + IH * (1 - frac)} x2={W - pad.r} y2={pad.t + IH * (1 - frac)}
            stroke="rgba(26,26,27,0.08)" strokeDasharray="4 3" />
          <text x={pad.l - 4} y={pad.t + IH * (1 - frac) + 4} textAnchor="end"
            fontSize={8} fill="rgba(26,26,27,0.32)">{gridVals[i]}</text>
        </g>
      ))}
      {/* Axes */}
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + IH} stroke="rgba(26,26,27,0.15)" />
      <line x1={pad.l} y1={pad.t + IH} x2={W - pad.r} y2={pad.t + IH} stroke="rgba(26,26,27,0.15)" />
      {/* X labels */}
      {[0, 250, 500, 750, 1000].filter(v => v <= maxVenues).map(v => (
        <text key={v} x={pad.l + (v / maxVenues) * IW} y={H - 8} textAnchor="middle" fontSize={8} fill="rgba(26,26,27,0.32)">{v}</text>
      ))}
      {/* Curve fill */}
      <path d={`${pathD} L${pad.l + IW},${pad.t + IH} L${pad.l},${pad.t + IH} Z`}
        fill={`${C.gold}18`} />
      {/* Curve line */}
      <motion.path d={pathD} fill="none" stroke={C.gold} strokeWidth={2} strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.2, ease: "easeOut" }} />
      {/* Marker */}
      <line x1={markerX} y1={pad.t} x2={markerX} y2={pad.t + IH} stroke={C.gold} strokeWidth={1} strokeDasharray="3 2" opacity={0.6} />
      <circle cx={markerX} cy={markerY} r={5} fill={C.gold} />
      <circle cx={markerX} cy={markerY} r={9} fill="none" stroke={C.gold} strokeWidth={1} opacity={0.4} />
    </svg>
  );
}

// ── Live Snapshot tab ─────────────────────────────────────────────────────────

type SnapshotData = {
  generatedAt: string;
  liveVenueCount: number;
  liveGuestCount: number;
  networkValuation: { totalDataValuationFmt: string; dataIntelligenceAccuracy: number; marketDominanceIndex: number; networkEffectMultiplier: number };
  revenueStreams: { formatted: { saasRevenue: string; manufacturerDataRevenue: string; transactionalUpsell: string; totalAnnualRevenue: string } };
  projections: Record<string, { network: { totalDataValuationFmt: string; dataIntelligenceAccuracy: number; marketDominanceIndex: number }; revenue: { formatted: { totalAnnualRevenue: string } } }>;
};

function SnapshotTab() {
  const [data, setData]     = useState<SnapshotData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    apiGet("/api/investor-demo/snapshot")
      .then(setData)
      .catch(e => setError(e.message === "401" ? "super_admin required" : "Error loading snapshot"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Empty msg="Hydrating live network data…" />;
  if (error)   return <Empty msg={error} />;
  if (!data)   return null;

  const { networkValuation: nv, revenueStreams: rs, projections: proj } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Live counts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        <GlassCard accent={C.gold}>
          <Label>Live Venue Count</Label>
          <div style={{ fontSize: 48, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1 }}>
            <AnimCount target={data.liveVenueCount} />
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>active venues in network</div>
        </GlassCard>
        <GlassCard accent={C.blue}>
          <Label>Total Guest Profiles</Label>
          <div style={{ fontSize: 48, fontWeight: 700, color: C.blue, fontFamily: "'Cormorant Garamond', serif", lineHeight: 1 }}>
            <AnimCount target={data.liveGuestCount} />
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>enrolled identities</div>
        </GlassCard>
      </div>
      {/* Valuation */}
      <GlassCard accent={C.gold}>
        <Label>Network Data Valuation · Metcalfe's Law</Label>
        <div style={{ fontSize: 40, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif" }}>{nv.totalDataValuationFmt}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 16 }}>
          {[
            ["Network Multiplier", nv.networkEffectMultiplier.toFixed(2) + "×", C.gold],
            ["Data Accuracy", nv.dataIntelligenceAccuracy.toFixed(1) + "%", C.green],
            ["Market Dominance", nv.marketDominanceIndex.toFixed(2) + "%", C.blue],
          ].map(([l, v, col]) => (
            <div key={l as string}>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 4 }}>{l as string}</div>
              <div style={{ fontSize: 22, color: col as string, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif" }}>{v as string}</div>
            </div>
          ))}
        </div>
      </GlassCard>
      {/* Revenue */}
      <GlassCard>
        <Label>Annual Revenue Streams — Current Network</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            ["SaaS Subscriptions", rs.formatted.saasRevenue, C.gold],
            ["Manufacturer Data Access", rs.formatted.manufacturerDataRevenue, C.purple],
            ["AI Transactional Upsell", rs.formatted.transactionalUpsell, C.green],
          ].map(([l, v, col]) => (
            <div key={l as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 13, color: C.muted }}>{l as string}</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: col as string, fontFamily: "'Cormorant Garamond', serif" }}>{v as string}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 8 }}>
            <span style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>Total Annual Revenue</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif" }}>{rs.formatted.totalAnnualRevenue}</span>
          </div>
        </div>
      </GlassCard>
      {/* Scale projections */}
      <GlassCard>
        <Label>Scale Projections</Label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {Object.entries(proj).map(([key, p]) => (
            <div key={key} style={{ padding: "14px 0", borderRight: `1px solid ${C.border}`, paddingRight: 12 }}>
              <div style={{ fontSize: 10, color: C.dim, marginBottom: 6 }}>{key.replace("atScale", "").replace(/(\d)(?=(\d{3})+$)/g, "$1,")} VENUES</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif", marginBottom: 4 }}>{p.network.totalDataValuationFmt}</div>
              <div style={{ fontSize: 11, color: C.green, marginBottom: 2 }}>{p.network.dataIntelligenceAccuracy.toFixed(1)}% accuracy</div>
              <div style={{ fontSize: 11, color: C.muted }}>{p.revenue.formatted.totalAnnualRevenue} ARR</div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ── Simulator tab ─────────────────────────────────────────────────────────────

function SimulatorTab() {
  const [venues, setVenues]   = useState(100);
  const [density, setDensity] = useState(200); // guests per venue
  const guests = venues * density;
  const net = calcNetwork(venues, guests);
  const rev = calcRevenue(venues);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Controls */}
      <GlassCard accent={C.gold}>
        <Label>Expansion Simulator — Drag to Explore</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 4 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: C.muted }}>Venue Count</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif" }}>{venues.toLocaleString()}</span>
            </div>
            <input type="range" min={1} max={5000} value={venues} onChange={e => setVenues(Number(e.target.value))}
              style={{ width: "100%", accentColor: C.gold, cursor: "pointer" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.dim, marginTop: 4 }}>
              <span>1</span><span>1,250</span><span>2,500</span><span>3,750</span><span>5,000 (target)</span>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: C.muted }}>Avg Guests / Venue</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: C.blue, fontFamily: "'Cormorant Garamond', serif" }}>{density}</span>
            </div>
            <input type="range" min={10} max={1000} step={10} value={density} onChange={e => setDensity(Number(e.target.value))}
              style={{ width: "100%", accentColor: C.blue, cursor: "pointer" }} />
          </div>
        </div>
      </GlassCard>

      {/* Live KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        <GlassCard accent={C.gold}>
          <Label>Network Data Valuation</Label>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif" }}>
            <AnimCount target={net.valuation} prefix="" suffix="" decimals={0}
              key={`val-${venues}-${density}`} />
          </div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{usd(net.valuation)}</div>
        </GlassCard>
        <GlassCard accent={C.green}>
          <Label>Data Intelligence Accuracy</Label>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.green, fontFamily: "'Cormorant Garamond', serif" }}>
            <AnimCount target={net.accuracy} suffix="%" decimals={1} key={`acc-${venues}`} />
          </div>
          <div style={{ height: 4, background: "rgba(26,26,27,0.09)", borderRadius: 2, overflow: "hidden", marginTop: 8 }}>
            <motion.div animate={{ width: `${net.accuracy}%` }} transition={{ duration: 0.4 }} style={{ height: "100%", background: C.green, borderRadius: 2 }} />
          </div>
        </GlassCard>
        <GlassCard accent={C.blue}>
          <Label>Network Effect Multiplier</Label>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.blue, fontFamily: "'Cormorant Garamond', serif" }}>
            <AnimCount target={net.multiplier} suffix="×" decimals={2} key={`mul-${venues}`} />
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>log₁₀({venues + 1}) × 2.5</div>
        </GlassCard>
        <GlassCard accent={C.purple}>
          <Label>Market Dominance Index</Label>
          <div style={{ fontSize: 32, fontWeight: 700, color: C.purple, fontFamily: "'Cormorant Garamond', serif" }}>
            <AnimCount target={net.dominance} suffix="%" decimals={1} key={`dom-${venues}`} />
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>of 5,000-venue global target</div>
        </GlassCard>
      </div>

      {/* Curve */}
      <GlassCard>
        <Label>Metcalfe Valuation Curve · {density} guests/venue baseline</Label>
        <MetcalfeCurve venueCount={venues} maxVenues={5000} />
        <div style={{ fontSize: 10, color: C.dim, marginTop: 8, textAlign: "center" }}>
          Marker = current slider position · curve = total data valuation at each scale point
        </div>
      </GlassCard>

      {/* Revenue breakdown */}
      <GlassCard>
        <Label>Projected Annual Revenue at {venues.toLocaleString()} Venues</Label>
        {[
          ["SaaS Subscriptions ($1,500/venue/mo × 12)", rev.saas, C.gold],
          ["Manufacturer Data Access ($5,000/venue/mo × 12)", rev.mfr, C.purple],
          ["AI Transactional Upsell ($25,000/venue)", rev.upsel, C.green],
        ].map(([l, v, col]) => (
          <div key={l as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 12, color: C.muted, maxWidth: "55%" }}>{l as string}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: col as string, fontFamily: "'Cormorant Garamond', serif" }}>{usd(v as number)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Total ARR</span>
          <span style={{ fontSize: 28, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif" }}>{usd(rev.total)}</span>
        </div>
      </GlassCard>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

type Tab = "snapshot" | "simulator" | "revenue";
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "snapshot",  label: "Live Snapshot",        icon: "◉" },
  { id: "simulator", label: "Expansion Simulator",  icon: "◈" },
  { id: "revenue",   label: "Revenue Breakdown",    icon: "◆" },
];

function RevenueTab() {
  const [venues, setVenues] = useState(500);
  const [data, setData]     = useState<{ formatted: { saasRevenue: string; manufacturerDataRevenue: string; transactionalUpsell: string; totalAnnualRevenue: string }; venueCount: number } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((v: number) => {
    apiGet(`/api/investor-demo/revenue?venueCount=${v}`).then(setData).catch(() => null);
  }, []);

  useEffect(() => { load(venues); }, []);

  const onSlide = (v: number) => {
    setVenues(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(v), 300);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <GlassCard accent={C.gold}>
        <Label>Venue Count Scenario</Label>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: C.muted }}>Venues</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif" }}>{venues.toLocaleString()}</span>
        </div>
        <input type="range" min={1} max={5000} value={venues} onChange={e => onSlide(Number(e.target.value))}
          style={{ width: "100%", accentColor: C.gold, cursor: "pointer" }} />
      </GlassCard>
      {data && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            ["SaaS Subscriptions", data.formatted.saasRevenue, C.gold, "venues × $1,500 × 12 months"],
            ["Manufacturer Data Revenue", data.formatted.manufacturerDataRevenue, C.purple, "venues × $5,000 × 12 months"],
            ["AI Transactional Upsell", data.formatted.transactionalUpsell, C.green, "venues × $25,000 one-time uplift"],
          ].map(([l, v, col, sub]) => (
            <GlassCard key={l as string} accent={col as string}>
              <Label>{l as string}</Label>
              <div style={{ fontSize: 36, fontWeight: 700, color: col as string, fontFamily: "'Cormorant Garamond', serif" }}>{v as string}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub as string}</div>
            </GlassCard>
          ))}
          <GlassCard accent={C.gold} style={{ borderWidth: 2 }}>
            <Label>Total Annual Revenue</Label>
            <div style={{ fontSize: 48, fontWeight: 700, color: C.gold, fontFamily: "'Cormorant Garamond', serif" }}>{data.formatted.totalAnnualRevenue}</div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}

export default function InvestorSimulator() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<Tab>("simulator");

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text, fontFamily: "'Cormorant Garamond', serif", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg,transparent,rgba(96,165,250,0.8) 40%,rgba(96,165,250,0.8) 60%,transparent)", zIndex: 20 }} />

      <div style={{ padding: "18px 24px 0", position: "sticky", top: 0, zIndex: 15, background: C.bg, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <button onClick={() => navigate(-1 as never)} style={{ background: C.glass, border: `1px solid ${C.border}`, color: C.muted, padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12, letterSpacing: "0.08em", fontFamily: "inherit" }}>← BACK</button>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: "clamp(17px,3.5vw,24px)", fontWeight: 500, color: C.blue, letterSpacing: "0.06em" }}>Investor Simulator</h1>
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.14em", marginTop: 2 }}>NOVEE OS · PHASE 6 — EXPANSION ENGINE</div>
          </div>
          <div style={{ fontSize: 11, color: C.muted, textAlign: "right" }}>
            <div style={{ color: C.gold, fontWeight: 600 }}>5,000</div>
            <div style={{ fontSize: 9 }}>venue target</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              flexShrink: 0, padding: "9px 18px", background: "none", border: "none", cursor: "pointer",
              fontSize: 12, letterSpacing: "0.06em", fontFamily: "inherit",
              color: tab === t.id ? C.blue : C.muted,
              borderBottom: tab === t.id ? `2px solid ${C.blue}` : "2px solid transparent",
              transition: "all 0.15s",
            }}>{t.icon} {t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 80px" }}>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {tab === "snapshot"  && <SnapshotTab />}
            {tab === "simulator" && <SimulatorTab />}
            {tab === "revenue"   && <RevenueTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
