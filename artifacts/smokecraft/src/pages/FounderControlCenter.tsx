/**
 * Founder Control Center — Sovereign Operations
 * Aesthetic: warm cream / ivory light mode, gold amber accents,
 * left sidebar navigation, Apple-Tesla data density.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { useLocation } from "wouter";
import {
  Activity, Zap, DollarSign, Globe, Shield, Cpu, RefreshCw,
  Check, BarChart3, Clock, Users, Server, Layers, Sparkles,
  Plus, Building2, X, ChevronLeft, ArrowUpRight, Home,
  FileText, Settings, AlertTriangle, Wifi,
} from "lucide-react";
import {
  getPlatformSummary, getForecast, getPlatformEvents, getTierMap,
  getEnterpriseContracts, getHardwareMrr, getModuleCatalog,
  type PlatformSummary, type RevenueEvent, type EnterpriseContract,
} from "@/services/revenueEngineApi";
import { useAuth } from "@/contexts/AuthContext";

// ── Design tokens (Sovereign Blue — Apple/Tesla luxury dark) ─────────────────
const T = {
  body:      "#050A14",               // deep navy (was cream)
  card:      "rgba(6,12,28,0.98)",    // dark surface (was white)
  cardAlt:   "rgba(8,18,40,0.95)",    // deeper surface (was faint cream)
  sidebar:   "rgba(3,6,16,0.99)",     // near-black navy sidebar
  sideText:  "#D8EEFF",               // platinum white (was cream)
  sideMuted: "rgba(180,210,250,0.45)",
  sideBorder:"rgba(0,128,255,0.10)",
  gold:      "#0080FF",               // metallic blue (was warm amber)
  goldLight: "#22AAFF",               // bright blue (was light gold)
  goldBg:    "rgba(0,128,255,0.10)",
  goldBorder:"rgba(0,128,255,0.30)",
  fore:      "#D8EEFF",               // platinum white (was near-black)
  sub:       "rgba(180,210,250,0.70)",
  faint:     "rgba(140,175,220,0.45)",
  border:    "rgba(0,128,255,0.14)",
  borderDark:"rgba(0,170,255,0.22)",
  green:     "#22c55e",
  greenBg:   "rgba(34,197,94,0.10)",
  red:       "#ef4444",
  redBg:     "rgba(239,68,68,0.09)",
  mono:      "'SF Mono','Fira Code',monospace",
  serif:     "'Cormorant Garamond',Georgia,serif",
  sans:      "system-ui,-apple-system,sans-serif",
};

function sovereignToken() { return localStorage.getItem("SOVEREIGN_SESSION") ?? ""; }

// ── Animated number ────────────────────────────────────────────────────────────
function Num({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const mv  = useMotionValue(0);
  useEffect(() => {
    const ctrl  = animate(mv, value, { duration: 1.1, ease: "easeOut" });
    const unsub = mv.on("change", v => { if (ref.current) ref.current.textContent = `${prefix}${Math.round(v).toLocaleString()}${suffix}`; });
    return () => { ctrl.stop(); unsub(); };
  }, [value, mv, prefix, suffix]);
  return <span ref={ref}>{prefix}0{suffix}</span>;
}

// ── KPI card ──────────────────────────────────────────────────────────────────
function KPICard({ label, value, icon, prefix = "", note, delay = 0 }: {
  label: string; value: number; icon: React.ReactNode;
  prefix?: string; note?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 14, padding: "20px 22px",
        display: "flex", flexDirection: "column", gap: 12,
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9, letterSpacing: "0.2em", color: T.faint, fontFamily: T.mono, textTransform: "uppercase" }}>{label}</span>
        <span style={{ color: T.gold, opacity: 0.75 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: T.fore, letterSpacing: "-0.02em", fontFamily: T.sans }}>
        <Num value={value} prefix={prefix} />
      </div>
      {note && <div style={{ fontSize: 10, color: T.sub, marginTop: -6 }}>{note}</div>}
    </motion.div>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function Badge({ ok, label }: { ok: boolean | null; label?: string }) {
  const [bg, border, color, dot] = ok === null
    ? ["rgba(176,168,158,0.12)", T.border, T.faint, T.faint]
    : ok
    ? [T.greenBg, "rgba(45,122,95,0.25)", T.green, T.green]
    : [T.redBg,   "rgba(185,64,64,0.25)", T.red,   T.red];
  const txt = label ?? (ok === null ? "LOADING" : ok ? "ACTIVE" : "OFFLINE");
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 999, border: `1px solid ${border}`,
      background: bg, fontSize: 9, fontWeight: 700,
      letterSpacing: "0.14em", color, fontFamily: T.mono, textTransform: "uppercase",
    }}>
      <motion.span
        style={{ width: 5, height: 5, borderRadius: "50%", background: dot, flexShrink: 0, display: "inline-block" }}
        animate={ok ? { opacity: [1, 0.35, 1] } : {}}
        transition={{ duration: 2.2, repeat: Infinity }}
      />
      {txt}
    </span>
  );
}

// ── Panel card ────────────────────────────────────────────────────────────────
function Card({ title, action, children, noPad }: {
  title: string; action?: React.ReactNode; children: React.ReactNode; noPad?: boolean;
}) {
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 22px", borderBottom: `1px solid ${T.border}`,
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: T.sub, fontFamily: T.mono, textTransform: "uppercase" }}>{title}</span>
        {action}
      </div>
      <div style={noPad ? {} : { padding: "20px 22px" }}>{children}</div>
    </div>
  );
}

// ── Row divider ───────────────────────────────────────────────────────────────
const Divider = () => <div style={{ borderBottom: `1px solid ${T.border}` }} />;

// ── Enroll Venue Modal ────────────────────────────────────────────────────────
type EnrollState = "idle" | "saving" | "done" | "error";

function EnrollModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [name,    setName   ] = useState("");
  const [type,    setType   ] = useState("cigar_lounge");
  const [plan,    setPlan   ] = useState("basic");
  const [tagline, setTagline] = useState("");
  const [color,   setColor  ] = useState("#C8960C");
  const [logoUrl, setLogoUrl] = useState("");
  const [status,  setStatus ] = useState<EnrollState>("idle");
  const [errMsg,  setErrMsg ] = useState("");

  const TYPES = [
    { v: "cigar_lounge", l: "Cigar Lounge" },
    { v: "whiskey_bar",  l: "Whiskey Bar"  },
    { v: "wine_bar",     l: "Wine Bar"     },
    { v: "coffee_house", l: "Coffee House" },
    { v: "scent_shop",   l: "Scent Shop"   },
  ];
  const PLANS = [
    { v: "basic",   l: "Basic"   },
    { v: "mid",     l: "Mid"     },
    { v: "premium", l: "Premium" },
  ];

  const submit = async () => {
    if (!name.trim()) { setErrMsg("Venue name is required"); return; }
    setStatus("saving"); setErrMsg("");
    try {
      const r = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${sovereignToken()}` },
        body: JSON.stringify({ name: name.trim(), type, plan, tagline: tagline.trim() || undefined, primaryColor: color || undefined, logoUrl: logoUrl.trim() || undefined }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({})) as { error?: string };
        setErrMsg(d.error ?? `Error ${r.status}`); setStatus("error"); return;
      }
      setStatus("done");
      setTimeout(() => { onSuccess(); onClose(); }, 800);
    } catch { setErrMsg("Network error — try again"); setStatus("error"); }
  };

  const field = (label: string, node: React.ReactNode) => (
    <div>
      <div style={{ fontSize: 9, letterSpacing: "0.18em", color: T.faint, fontFamily: T.mono, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      {node}
    </div>
  );
  const inputCss: React.CSSProperties = {
    width: "100%", background: T.cardAlt, border: `1px solid ${T.border}`,
    borderRadius: 10, padding: "11px 13px", color: T.fore, fontSize: 13,
    fontFamily: T.sans, outline: "none", boxSizing: "border-box",
  };
  const selectCss: React.CSSProperties = { ...inputCss, cursor: "pointer" };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(26,26,27,0.55)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 22, width: "100%", maxWidth: 500, padding: "30px 30px 26px", overflowY: "auto", maxHeight: "90vh", boxShadow: "0 24px 60px rgba(0,0,0,0.18)" }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 26 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: T.goldBg, border: `1px solid ${T.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Building2 size={16} color={T.gold} />
              </div>
              <span style={{ fontSize: 17, fontWeight: 600, color: T.fore, fontFamily: T.serif, letterSpacing: "0.1em" }}>ENROLL VENUE</span>
            </div>
            <p style={{ fontSize: 11, color: T.sub, margin: 0, letterSpacing: "0.04em" }}>Provision a new venue on the NOVEE OS network</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.faint, cursor: "pointer", padding: 4, marginTop: -2 }}><X size={17} /></button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {field("Venue Name *",
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. The Atlas Lounge" style={inputCss}
              onKeyDown={e => { if (e.key === "Enter") void submit(); }} />
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {field("Venue Type",
              <select value={type} onChange={e => setType(e.target.value)} style={selectCss}>
                {TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            )}
            {field("Service Plan",
              <select value={plan} onChange={e => setPlan(e.target.value)} style={selectCss}>
                {PLANS.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
            )}
          </div>
          {field("Tagline (optional)",
            <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Where connoisseurs gather" style={inputCss} />
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 12 }}>
            {field("Logo URL (optional)",
              <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://…" style={inputCss} />
            )}
            {field("Brand Color",
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ ...inputCss, padding: 5, height: 44, cursor: "pointer" }} />
            )}
          </div>

          {errMsg && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 11, color: T.red, padding: "9px 13px", background: T.redBg, border: `1px solid rgba(185,64,64,0.2)`, borderRadius: 8 }}>
              {errMsg}
            </motion.div>
          )}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 11, background: T.cardAlt, border: `1px solid ${T.border}`, color: T.sub, fontSize: 11, fontWeight: 600, cursor: "pointer", letterSpacing: "0.1em", fontFamily: T.mono }}>
            CANCEL
          </button>
          <motion.button
            onClick={() => { void submit(); }}
            disabled={status === "saving" || status === "done"}
            whileTap={status === "idle" || status === "error" ? { scale: 0.97 } : {}}
            style={{
              flex: 2, padding: "12px", borderRadius: 11,
              background: status === "done" ? T.greenBg : T.goldBg,
              border: `1px solid ${status === "done" ? "rgba(45,122,95,0.35)" : T.goldBorder}`,
              color: status === "done" ? T.green : T.gold,
              fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", fontFamily: T.mono,
              cursor: status === "saving" || status === "done" ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            {status === "saving" && <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}><RefreshCw size={11} /></motion.span>}
            {status === "done" && <Check size={12} />}
            {status === "done" ? "VENUE ENROLLED" : status === "saving" ? "ENROLLING…" : "ENROLL VENUE"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Sidebar nav item ──────────────────────────────────────────────────────────
function NavItem({ icon, label, active, onClick, badge }: {
  icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: "9px 14px", borderRadius: 9, border: "none",
        background: active ? "rgba(200,150,12,0.14)" : "transparent",
        color: active ? T.goldLight : T.sideMuted,
        cursor: "pointer", textAlign: "left",
        fontSize: 12, fontWeight: active ? 600 : 400, letterSpacing: "0.03em",
        fontFamily: T.sans, transition: "all 0.15s",
      }}
    >
      <span style={{ opacity: active ? 1 : 0.6, flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span style={{ fontSize: 9, background: T.gold, color: "#fff", borderRadius: 999, padding: "1px 6px", fontWeight: 700, fontFamily: T.mono }}>{badge}</span>
      )}
      {active && <div style={{ width: 3, height: 3, borderRadius: "50%", background: T.goldLight, flexShrink: 0 }} />}
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
type Tab = "overview" | "venues" | "tiers" | "enterprise" | "events" | "modules";
interface VenueRecord { id: string; name: string; type: string; plan: string; createdAt: string; }

export default function FounderControlCenter() {
  const { user }  = useAuth();
  const [, nav]   = useLocation();

  const [summary,   setSummary  ] = useState<PlatformSummary | null>(null);
  const [events,    setEvents   ] = useState<RevenueEvent[]>([]);
  const [contracts, setContracts] = useState<EnterpriseContract[]>([]);
  const [hwMrr,     setHwMrr    ] = useState(0);
  const [modules,   setModules  ] = useState<{ name: string; isActive?: boolean }[]>([]);
  const [tierMap,   setTierMap  ] = useState<Record<string, string[]>>({});
  const [forecast,  setForecast ] = useState<Record<string, unknown>>({});
  const [venues,    setVenues   ] = useState<VenueRecord[]>([]);
  const [loading,   setLoading  ] = useState(true);
  const [lastAt,    setLastAt   ] = useState(new Date());
  const [tab,       setTab      ] = useState<Tab>("overview");
  const [enrollOpen,setEnroll   ] = useState(false);

  const loadVenues = useCallback(async () => {
    try {
      const r = await fetch("/api/venues", { headers: { Authorization: `Bearer ${sovereignToken()}` } });
      if (r.ok) setVenues(await r.json() as VenueRecord[]);
    } catch { /* silent */ }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, evts, contr, hw, mods, tm, fc] = await Promise.allSettled([
        getPlatformSummary(), getPlatformEvents(25), getEnterpriseContracts(),
        getHardwareMrr(), getModuleCatalog(), getTierMap(), getForecast(),
      ]);
      if (sum.status   === "fulfilled") setSummary(sum.value);
      if (evts.status  === "fulfilled") setEvents(evts.value.events ?? []);
      if (contr.status === "fulfilled") setContracts(contr.value.contracts ?? []);
      if (hw.status    === "fulfilled") setHwMrr(hw.value.mrr ?? 0);
      if (mods.status  === "fulfilled") setModules(mods.value.modules ?? []);
      if (tm.status    === "fulfilled") setTierMap(tm.value.tierMap ?? {});
      if (fc.status    === "fulfilled") setForecast(fc.value);
      setLastAt(new Date());
      await loadVenues();
    } finally { setLoading(false); }
  }, [loadVenues]);

  useEffect(() => { void loadAll(); }, [loadAll]);
  useEffect(() => {
    const id = setInterval(() => { void loadAll(); }, 30_000);
    return () => clearInterval(id);
  }, [loadAll]);

  const hasSovereign = !!localStorage.getItem("SOVEREIGN_SESSION");
  if (user?.role !== "super_admin" && !hasSovereign) {
    return (
      <div style={{ height: "100vh", background: T.body, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Shield size={28} color={T.gold} style={{ marginBottom: 14 }} />
          <div style={{ fontSize: 11, letterSpacing: "0.18em", fontFamily: T.mono, color: T.sub }}>FOUNDER AUTHORITY REQUIRED</div>
        </div>
      </div>
    );
  }

  const TIER_ACC: Record<string, string> = { CORE: "#6B8CAE", PRO: T.gold, XEI: "#C4A96D", BLACK: "#8A8A8A" };

  const NAV: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview",   label: "Overview",    icon: <Home     size={14} /> },
    { id: "venues",     label: "Venues",      icon: <Building2 size={14} />, badge: venues.length },
    { id: "tiers",      label: "Tiers",       icon: <Layers   size={14} /> },
    { id: "enterprise", label: "Enterprise",  icon: <FileText size={14} />, badge: contracts.length },
    { id: "events",     label: "Events",      icon: <Activity size={14} />, badge: events.length },
    { id: "modules",    label: "Modules",     icon: <Server   size={14} /> },
  ];

  return (
    <div style={{ height: "100vh", display: "flex", background: T.body, fontFamily: T.sans, color: T.fore, overflow: "hidden" }}>

      {/* ── Sidebar ── */}
      <div style={{
        width: 230, flexShrink: 0, background: T.sidebar,
        display: "flex", flexDirection: "column",
        borderRight: `1px solid ${T.sideBorder}`,
        overflowY: "auto",
      }}>
        {/* Logo area */}
        <div style={{ padding: "22px 18px 16px", borderBottom: `1px solid ${T.sideBorder}` }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.28em", color: T.goldLight, fontFamily: T.mono }}>NOVEE OS</div>
          <div style={{ fontSize: 9, color: T.sideMuted, letterSpacing: "0.14em", marginTop: 3, fontFamily: T.mono }}>FOUNDER CONTROL</div>
        </div>

        {/* Back */}
        <div style={{ padding: "10px 10px 0" }}>
          <button
            onClick={() => nav("/sovereign-dashboard")}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
              background: "none", border: "none", color: T.sideMuted, cursor: "pointer",
              fontSize: 10, letterSpacing: "0.12em", fontFamily: T.mono,
            }}
          >
            <ChevronLeft size={11} /> SOVEREIGN COMMAND
          </button>
        </div>

        {/* Nav sections */}
        <div style={{ padding: "8px 10px", flex: 1 }}>
          <div style={{ fontSize: 8, letterSpacing: "0.22em", color: "rgba(240,237,232,0.22)", fontFamily: T.mono, textTransform: "uppercase", padding: "12px 4px 6px" }}>OPERATIONS</div>
          {NAV.map(n => (
            <NavItem key={n.id} icon={n.icon} label={n.label} active={tab === n.id} onClick={() => setTab(n.id)} badge={n.badge} />
          ))}

          <div style={{ fontSize: 8, letterSpacing: "0.22em", color: "rgba(240,237,232,0.22)", fontFamily: T.mono, textTransform: "uppercase", padding: "20px 4px 6px" }}>SYSTEM</div>
          <NavItem icon={<Wifi size={14} />}       label="Live Status"  active={false} onClick={() => {}} />
          <NavItem icon={<AlertTriangle size={14} />} label="Alerts"    active={false} onClick={() => {}} />
          <NavItem icon={<Settings size={14} />}   label="Settings"     active={false} onClick={() => {}} />
        </div>

        {/* Enroll CTA at bottom */}
        <div style={{ padding: "16px 12px", borderTop: `1px solid ${T.sideBorder}` }}>
          <motion.button
            onClick={() => setEnroll(true)}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{
              width: "100%", padding: "10px 0", borderRadius: 10,
              background: T.goldBg, border: `1px solid ${T.goldBorder}`,
              color: T.goldLight, fontSize: 10, fontWeight: 700,
              cursor: "pointer", letterSpacing: "0.14em", fontFamily: T.mono,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            }}
          >
            <Plus size={12} /> ENROLL VENUE
          </motion.button>
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 28px", borderBottom: `1px solid ${T.border}`,
          background: T.card, flexShrink: 0,
        }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, color: T.fore, letterSpacing: "0.06em", fontFamily: T.serif, margin: 0 }}>
              Founder Control Center
            </h1>
            <p style={{ fontSize: 9, color: T.faint, margin: "4px 0 0", letterSpacing: "0.18em", fontFamily: T.mono }}>
              NOVEE OS · SOVEREIGN OPERATIONS · SUPER_ADMIN
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 9, color: T.faint, letterSpacing: "0.1em", fontFamily: T.mono, display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={9} /> {lastAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            <motion.button
              onClick={() => { void loadAll(); }}
              disabled={loading}
              whileTap={{ scale: 0.94 }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 9,
                background: T.cardAlt, border: `1px solid ${T.border}`,
                color: T.sub, fontSize: 10, fontWeight: 600, cursor: "pointer",
                letterSpacing: "0.12em", fontFamily: T.mono,
              }}
            >
              <motion.span animate={loading ? { rotate: 360 } : {}} transition={{ duration: 0.9, repeat: loading ? Infinity : 0, ease: "linear" }}>
                <RefreshCw size={11} />
              </motion.span>
              REFRESH
            </motion.button>
            <Badge ok={!loading} label={loading ? "SYNCING" : "LIVE"} />
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px 60px" }}>

          {/* KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(148px,1fr))", gap: 12, marginBottom: 28 }}>
            <KPICard label="Platform MRR"   value={summary?.totalMrr     ?? 0} icon={<DollarSign size={14} />} prefix="$" delay={0}    />
            <KPICard label="Active Venues"  value={summary?.activeVenues  ?? 0} icon={<Globe      size={14} />}             delay={0.05} />
            <KPICard label="Subscriptions"  value={summary?.subscriptions ?? 0} icon={<Zap        size={14} />}             delay={0.1}  />
            <KPICard label="Total Revenue"  value={summary?.totalRevenue  ?? 0} icon={<BarChart3   size={14} />} prefix="$" delay={0.15} />
            <KPICard label="Hardware MRR"   value={hwMrr}                       icon={<Cpu        size={14} />} prefix="$" delay={0.2}  />
            <KPICard label="Active Modules" value={modules.length}              icon={<Sparkles   size={14} />}             delay={0.25} />
          </div>

          {/* Panel body */}
          <AnimatePresence mode="wait">

            {/* Overview */}
            {tab === "overview" && (
              <motion.div key="overview"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
              >
                <Card title="Revenue Forecast">
                  {Object.keys(forecast).length === 0
                    ? <p style={{ fontSize: 12, color: T.faint, margin: 0 }}>Loading forecast…</p>
                    : Object.entries(forecast).slice(0, 10).map(([k, v]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ fontSize: 11, color: T.sub, textTransform: "capitalize" }}>{k.replace(/_/g, " ")}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: T.fore }}>{typeof v === "number" ? `$${Number(v).toLocaleString()}` : String(v)}</span>
                      </div>
                    ))
                  }
                </Card>

                <Card title="Tier Capability Map">
                  {Object.entries(tierMap).length === 0
                    ? <p style={{ fontSize: 12, color: T.faint, margin: 0 }}>Loading tier map…</p>
                    : Object.entries(tierMap).map(([tier, feats]) => (
                      <div key={tier} style={{ marginBottom: 18 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: TIER_ACC[tier] ?? T.gold, letterSpacing: "0.2em", fontFamily: T.mono, marginBottom: 8, textTransform: "uppercase" }}>{tier}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {(feats as string[]).slice(0, 5).map((f: string) => (
                            <span key={f} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 6, background: T.cardAlt, border: `1px solid ${T.border}`, color: T.sub }}>
                              {f.replace(/_/g, " ")}
                            </span>
                          ))}
                          {(feats as string[]).length > 5 && <span style={{ fontSize: 9, color: T.faint }}>+{(feats as string[]).length - 5}</span>}
                        </div>
                      </div>
                    ))
                  }
                </Card>
              </motion.div>
            )}

            {/* Venues */}
            {tab === "venues" && (
              <motion.div key="venues"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <Card
                  title={`Enrolled Venues  ·  ${venues.length}`}
                  action={
                    <button
                      onClick={() => setEnroll(true)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        background: T.goldBg, border: `1px solid ${T.goldBorder}`,
                        borderRadius: 8, padding: "5px 13px",
                        color: T.gold, fontSize: 9, fontWeight: 700,
                        cursor: "pointer", letterSpacing: "0.12em", fontFamily: T.mono,
                      }}
                    >
                      <Plus size={10} /> ENROLL NEW
                    </button>
                  }
                  noPad
                >
                  {venues.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "50px 24px" }}>
                      <Building2 size={30} color={T.faint} style={{ marginBottom: 14 }} />
                      <p style={{ fontSize: 13, color: T.sub, margin: "0 0 18px" }}>No venues enrolled yet</p>
                      <button
                        onClick={() => setEnroll(true)}
                        style={{
                          background: T.goldBg, border: `1px solid ${T.goldBorder}`,
                          borderRadius: 10, padding: "10px 22px",
                          color: T.gold, fontSize: 10, fontWeight: 700,
                          cursor: "pointer", letterSpacing: "0.14em", fontFamily: T.mono,
                          display: "inline-flex", alignItems: "center", gap: 7,
                        }}
                      >
                        <Plus size={12} /> ENROLL FIRST VENUE
                      </button>
                    </div>
                  ) : (
                    <div>
                      {/* Table header */}
                      <div style={{
                        display: "grid", gridTemplateColumns: "2fr 1.2fr 0.9fr 0.9fr",
                        padding: "10px 22px", borderBottom: `1px solid ${T.border}`,
                        background: T.cardAlt,
                      }}>
                        {["Venue", "Type", "Plan", "Enrolled"].map(h => (
                          <span key={h} style={{ fontSize: 8, letterSpacing: "0.2em", color: T.faint, fontFamily: T.mono, textTransform: "uppercase" }}>{h}</span>
                        ))}
                      </div>
                      {venues.map((v, i) => (
                        <motion.div
                          key={v.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          transition={{ duration: 0.25, delay: i * 0.04 }}
                          style={{
                            display: "grid", gridTemplateColumns: "2fr 1.2fr 0.9fr 0.9fr",
                            padding: "14px 22px", borderBottom: `1px solid ${T.border}`,
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: T.fore }}>{v.name}</div>
                            <div style={{ fontSize: 9, color: T.faint, fontFamily: T.mono, marginTop: 2 }}>{v.id.slice(0, 12)}…</div>
                          </div>
                          <span style={{ fontSize: 11, color: T.sub }}>{v.type.replace(/_/g, " ")}</span>
                          <span style={{
                            fontSize: 9, padding: "3px 9px", borderRadius: 6, display: "inline-block",
                            background: v.plan === "premium" ? T.goldBg : T.cardAlt,
                            border: `1px solid ${v.plan === "premium" ? T.goldBorder : T.border}`,
                            color: v.plan === "premium" ? T.gold : T.sub,
                            fontFamily: T.mono, letterSpacing: "0.1em", textTransform: "uppercase",
                          }}>
                            {v.plan}
                          </span>
                          <span style={{ fontSize: 10, color: T.faint }}>
                            {new Date(v.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "2-digit" })}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* Tiers */}
            {tab === "tiers" && (
              <motion.div key="tiers"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 14 }}
              >
                {(["CORE","PRO","XEI","BLACK"] as const).map((tier, i) => {
                  const ac = TIER_ACC[tier] ?? T.gold;
                  const feats = tierMap[tier] ?? [];
                  return (
                    <motion.div key={tier} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.07 }}
                      style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 14, padding: "20px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: ac, letterSpacing: "0.24em", fontFamily: T.mono }}>{tier}</span>
                        <span style={{ fontSize: 10, color: T.faint }}>{feats.length} features</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {feats.slice(0, 7).map((f: string) => (
                          <div key={f} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Check size={9} color={ac} style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: T.sub }}>{f.replace(/_/g, " ")}</span>
                          </div>
                        ))}
                        {feats.length > 7 && <span style={{ fontSize: 9, color: T.faint, paddingLeft: 17 }}>+{feats.length - 7} more</span>}
                      </div>
                    </motion.div>
                  );
                })}
                {Object.keys(tierMap).length === 0 && (
                  <p style={{ fontSize: 12, color: T.faint, gridColumn: "1/-1", textAlign: "center", margin: "30px 0" }}>Loading tiers…</p>
                )}
              </motion.div>
            )}

            {/* Enterprise */}
            {tab === "enterprise" && (
              <motion.div key="enterprise"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <Card title={`Enterprise Contracts  ·  ${contracts.length}`} noPad>
                  {contracts.length === 0 ? (
                    <p style={{ fontSize: 12, color: T.faint, textAlign: "center", padding: "36px 0", margin: 0 }}>No contracts found</p>
                  ) : contracts.map((c, i) => (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 22px", borderBottom: `1px solid ${T.border}` }}>
                      <div>
                        <div style={{ fontSize: 13, color: T.fore, fontWeight: 500 }}>{c.contractType ?? "Enterprise"} · {c.tier ?? "—"}</div>
                        <div style={{ fontSize: 9, color: T.faint, marginTop: 3, fontFamily: T.mono }}>{c.id.slice(0, 12)} · {c.startDate ? new Date(c.startDate).toLocaleDateString() : "—"}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: T.gold }}>{c.monthlyValue ? `$${c.monthlyValue.toLocaleString()}/mo` : "—"}</span>
                        <Badge ok={c.status === "active"} />
                      </div>
                    </div>
                  ))}
                </Card>
              </motion.div>
            )}

            {/* Events */}
            {tab === "events" && (
              <motion.div key="events"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                <Card title={`Live Revenue Events  ·  ${events.length}`} noPad>
                  {events.length === 0 ? (
                    <p style={{ fontSize: 12, color: T.faint, textAlign: "center", padding: "36px 0", margin: 0 }}>No events yet</p>
                  ) : events.map(ev => {
                    const amt = typeof ev.amount === "number" ? `$${(ev.amount / 100).toFixed(2)}` : ev.amount ? String(ev.amount) : null;
                    return (
                      <div key={ev.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 22px", borderBottom: `1px solid ${T.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.gold, flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 12, color: T.fore, fontWeight: 500 }}>{(ev.eventType ?? "").replace(/_/g, " ")}</div>
                            <div style={{ fontSize: 9, color: T.faint, marginTop: 2, fontFamily: T.mono }}>{ev.venueId ? `venue ${ev.venueId.slice(0, 8)}` : "platform"}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          {amt && <div style={{ fontSize: 12, fontWeight: 700, color: T.gold }}>{amt}</div>}
                          <div style={{ fontSize: 9, color: T.faint, fontFamily: T.mono }}>{new Date(ev.createdAt).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    );
                  })}
                </Card>
              </motion.div>
            )}

            {/* Modules */}
            {tab === "modules" && (
              <motion.div key="modules"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 10 }}
              >
                {modules.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25, delay: i * 0.04 }}
                    style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                  >
                    <span style={{ fontSize: 12, color: T.fore, fontWeight: 500 }}>{m.name}</span>
                    <Badge ok={m.isActive ?? null} />
                  </motion.div>
                ))}
                {modules.length === 0 && (
                  <p style={{ fontSize: 12, color: T.faint, gridColumn: "1/-1", textAlign: "center", margin: "30px 0" }}>No modules in catalog</p>
                )}
              </motion.div>
            )}

          </AnimatePresence>

          {/* Footer */}
          <div style={{ marginTop: 56, textAlign: "center", fontSize: 8, color: T.faint, letterSpacing: "0.26em", fontFamily: T.mono }}>
            NOVEE OS · FOUNDER CONTROL CENTER · v2 <ArrowUpRight size={7} style={{ display: "inline", verticalAlign: "middle" }} />
          </div>

        </div>{/* end scrollable */}
      </div>{/* end main */}

      {/* Enroll modal */}
      <AnimatePresence>
        {enrollOpen && (
          <EnrollModal
            onClose={() => setEnroll(false)}
            onSuccess={() => { void loadAll(); setTab("venues"); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
