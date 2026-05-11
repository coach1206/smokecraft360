/**
 * Founder Control Center — Phase 9
 *
 * Cinematic super-admin operations surface. Calls live API endpoints.
 * Routes: /founder-control
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, animate } from "framer-motion";
import { useLocation } from "wouter";
import {
  Activity, Zap, DollarSign, Globe, Shield, Cpu, RefreshCw,
  ChevronRight, Check, X, BarChart3, ArrowUpRight, Clock,
  Users, Server, Layers, Sparkles,
} from "lucide-react";
import {
  getPlatformSummary, getForecast, getPlatformEvents, getTierMap,
  getEnterpriseContracts, getHardwareMrr, getModuleCatalog,
  type PlatformSummary, type RevenueEvent, type EnterpriseContract,
} from "@/services/revenueEngineApi";
import { useAuth } from "@/contexts/AuthContext";

// ── Design tokens ─────────────────────────────────────────────────────────

const GOLD   = "#D48B00";
const CREAM  = "#F5F2ED";
const BG     = "#0A0A0B";
const GLASS  = "rgba(245,242,237,0.05)";
const BORDER = "rgba(212,139,0,0.18)";

// ── Animated counter ──────────────────────────────────────────────────────

function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const ref  = useRef<HTMLSpanElement>(null);
  const mv   = useMotionValue(0);

  useEffect(() => {
    const ctrl = animate(mv, value, { duration: 1.4, ease: "easeOut" });
    const unsub = mv.on("change", (v) => {
      if (ref.current) ref.current.textContent = `${prefix}${Math.round(v).toLocaleString()}${suffix}`;
    });
    return () => { ctrl.stop(); unsub(); };
  }, [value, mv, prefix, suffix]);

  return <span ref={ref}>{prefix}0{suffix}</span>;
}

// ── Status pill ───────────────────────────────────────────────────────────

function StatusPill({ ok }: { ok: boolean | null }) {
  const color = ok === null ? "#8A9BB0" : ok ? "#5E9E6E" : "#C0392B";
  const label = ok === null ? "LOADING" : ok ? "LIVE" : "ERROR";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "2px 8px", borderRadius: 999, border: `1px solid ${color}40`,
      background: `${color}15`, fontSize: 9, fontWeight: 700,
      letterSpacing: "0.18em", textTransform: "uppercase", color,
    }}>
      <motion.span
        style={{ width: 4, height: 4, borderRadius: "50%", background: color, display: "inline-block" }}
        animate={ok ? { opacity: [1, 0.3, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      {label}
    </span>
  );
}

// ── Metric tile ───────────────────────────────────────────────────────────

function MetricTile({
  label, value, icon, sub, accent = GOLD, delay = 0, prefix = "",
}: {
  label: string; value: number | string; icon: React.ReactNode;
  sub?: string; accent?: string; delay?: number; prefix?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay }}
      style={{
        borderRadius: 18, border: `1px solid ${accent}25`,
        background: GLASS, padding: "20px 18px",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        display: "flex", flexDirection: "column", gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,242,237,0.35)" }}>{label}</span>
        <span style={{ color: accent, opacity: 0.7 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: CREAM, letterSpacing: "-0.01em" }}>
        {typeof value === "number"
          ? <AnimatedNumber value={value} />
          : value}
      </div>
      {sub && <div style={{ fontSize: 10, color: "rgba(245,242,237,0.35)", marginTop: -4 }}>{sub}</div>}
    </motion.div>
  );
}

// ── Panel shell ───────────────────────────────────────────────────────────

function Panel({ title, icon, children, accent = GOLD, delay = 0 }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
  accent?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      style={{
        borderRadius: 22, border: `1px solid ${accent}22`,
        background: GLASS, padding: "22px 20px",
        backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
        display: "flex", flexDirection: "column", gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: accent }}>{icon}</span>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(245,242,237,0.6)" }}>
          {title}
        </span>
      </div>
      {children}
    </motion.div>
  );
}

// ── Event row ────────────────────────────────────────────────────────────

function EventRow({ ev }: { ev: RevenueEvent }) {
  const amt = typeof ev.amount === "number" ? `$${(ev.amount / 100).toFixed(2)}` :
              ev.amount ? String(ev.amount) : null;
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 0", borderBottom: "1px solid rgba(245,242,237,0.05)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 5, height: 5, borderRadius: "50%", background: GOLD, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 11, color: CREAM, fontWeight: 500 }}>
            {ev.eventType.replace(/_/g, " ")}
          </div>
          <div style={{ fontSize: 9, color: "rgba(245,242,237,0.35)", marginTop: 2 }}>
            {ev.venueId ? `venue ${ev.venueId.slice(0, 8)}` : "platform"}
          </div>
        </div>
      </div>
      <div style={{ textAlign: "right" }}>
        {amt && <div style={{ fontSize: 12, fontWeight: 600, color: GOLD }}>{amt}</div>}
        <div style={{ fontSize: 9, color: "rgba(245,242,237,0.3)" }}>
          {new Date(ev.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

type Panel_ = "ecosystem" | "provision" | "contracts" | "events" | "modules";

export default function FounderControlCenter() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [summary,    setSummary    ] = useState<PlatformSummary | null>(null);
  const [events,     setEvents     ] = useState<RevenueEvent[]>([]);
  const [contracts,  setContracts  ] = useState<EnterpriseContract[]>([]);
  const [hwMrr,      setHwMrr      ] = useState<number>(0);
  const [modules,    setModules    ] = useState<{ name: string; isActive?: boolean }[]>([]);
  const [tierMap,    setTierMap    ] = useState<Record<string, string[]>>({});
  const [forecast,   setForecast   ] = useState<Record<string, unknown>>({});
  const [loading,    setLoading    ] = useState(true);
  const [lastRefresh,setLastRefresh] = useState(new Date());
  const [activePanel,setActivePanel] = useState<Panel_>("ecosystem");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, evts, contr, hw, mods, tm, fc] = await Promise.allSettled([
        getPlatformSummary(),
        getPlatformEvents(20),
        getEnterpriseContracts(),
        getHardwareMrr(),
        getModuleCatalog(),
        getTierMap(),
        getForecast(),
      ]);
      if (sum.status === "fulfilled")   setSummary(sum.value);
      if (evts.status === "fulfilled")  setEvents(evts.value.events ?? []);
      if (contr.status === "fulfilled") setContracts(contr.value.contracts ?? []);
      if (hw.status === "fulfilled")    setHwMrr(hw.value.mrr ?? 0);
      if (mods.status === "fulfilled")  setModules(mods.value.modules ?? []);
      if (tm.status === "fulfilled")    setTierMap(tm.value.tierMap ?? {});
      if (fc.status === "fulfilled")    setForecast(fc.value);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => { void loadAll(); }, 30_000);
    return () => clearInterval(id);
  }, [loadAll]);

  const hasSovereignSession = !!localStorage.getItem("SOVEREIGN_SESSION");
  if (user?.role !== "super_admin" && !hasSovereignSession) {
    return (
      <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "rgba(245,242,237,0.3)", fontSize: 13, letterSpacing: "0.1em" }}>
          <Shield size={28} color={GOLD} style={{ marginBottom: 16 }} />
          <div>FOUNDER AUTHORITY REQUIRED</div>
        </div>
      </div>
    );
  }

  const mrr         = summary?.totalMrr ?? 0;
  const activeVenues = summary?.activeVenues ?? 0;
  const subs        = summary?.subscriptions ?? 0;
  const totalRevenue = summary?.totalRevenue ?? 0;

  const PANELS: { id: Panel_; label: string; icon: React.ReactNode }[] = [
    { id: "ecosystem", label: "Ecosystem",   icon: <Globe    size={12} /> },
    { id: "provision", label: "Tiers",       icon: <Layers   size={12} /> },
    { id: "contracts", label: "Enterprise",  icon: <Users    size={12} /> },
    { id: "events",    label: "Events",      icon: <Activity size={12} /> },
    { id: "modules",   label: "Modules",     icon: <Server   size={12} /> },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BG, position: "relative", overflow: "hidden" }}>

      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 800, height: 400,
        background: `radial-gradient(ellipse, ${GOLD}12 0%, transparent 70%)`,
        pointerEvents: "none", zIndex: 0,
      }} />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1280, margin: "0 auto", padding: "24px 20px" }}>

        {/* ── Top bar ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <motion.button
                type="button"
                onClick={() => setLocation("/admin-panel")}
                style={{ background: "none", border: "none", color: "rgba(245,242,237,0.35)", cursor: "pointer", padding: 0, fontSize: 11, letterSpacing: "0.1em" }}
              >
                ← Dashboard
              </motion.button>
            </div>
            <h1 style={{
              fontSize: "clamp(20px, 3vw, 32px)", fontWeight: 300, color: CREAM,
              letterSpacing: "0.22em", textTransform: "uppercase",
              fontFamily: "'Cormorant Garamond', Georgia, serif", margin: 0,
            }}>
              Founder Control Center
            </h1>
            <p style={{ fontSize: 10, color: "rgba(245,242,237,0.3)", margin: "4px 0 0", letterSpacing: "0.12em" }}>
              AXIOM OS · ENTERPRISE OPERATIONS · SUPER_ADMIN
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 9, color: "rgba(245,242,237,0.3)", letterSpacing: "0.14em" }}>
              <Clock size={10} style={{ verticalAlign: "middle", marginRight: 4 }} />
              {lastRefresh.toLocaleTimeString()}
            </span>
            <motion.button
              type="button"
              onClick={() => { void loadAll(); }}
              disabled={loading}
              whileTap={{ scale: 0.92 }}
              style={{
                background: GLASS, border: `1px solid ${BORDER}`, borderRadius: 10,
                padding: "8px 14px", color: GOLD, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 600,
                letterSpacing: "0.14em", textTransform: "uppercase",
              }}
            >
              <motion.span animate={loading ? { rotate: 360 } : {}} transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: "linear" }}>
                <RefreshCw size={11} />
              </motion.span>
              Refresh
            </motion.button>
          </div>
        </div>

        {/* ── Metric tiles ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
          <MetricTile label="Platform MRR"     value={mrr}          icon={<DollarSign size={14} />} prefix="$" delay={0}    />
          <MetricTile label="Active Venues"    value={activeVenues} icon={<Globe      size={14} />}             delay={0.07} />
          <MetricTile label="Subscriptions"    value={subs}         icon={<Zap        size={14} />}             delay={0.14} />
          <MetricTile label="Total Revenue"    value={totalRevenue} icon={<BarChart3  size={14} />} prefix="$" delay={0.21} />
          <MetricTile label="Hardware MRR"     value={hwMrr}        icon={<Cpu        size={14} />} prefix="$" delay={0.28} />
          <MetricTile label="Active Modules"   value={modules.length} icon={<Sparkles size={14} />}            delay={0.35} />
        </div>

        {/* ── Panel selector ── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
          {PANELS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActivePanel(p.id)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 999,
                border: `1px solid ${activePanel === p.id ? GOLD : "rgba(245,242,237,0.1)"}`,
                background: activePanel === p.id ? `${GOLD}15` : "transparent",
                color: activePanel === p.id ? GOLD : "rgba(245,242,237,0.45)",
                fontSize: 10, fontWeight: 600, letterSpacing: "0.12em",
                textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s",
              }}
            >
              {p.icon}{p.label}
            </button>
          ))}
        </div>

        {/* ── Panel content ── */}
        <AnimatePresence mode="wait">

          {/* Ecosystem overview */}
          {activePanel === "ecosystem" && (
            <motion.div key="ecosystem"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
            >
              <Panel title="Revenue Forecast" icon={<BarChart3 size={13} />} delay={0}>
                {Object.keys(forecast).length === 0
                  ? <div style={{ fontSize: 12, color: "rgba(245,242,237,0.3)", padding: "12px 0" }}>Loading forecast…</div>
                  : Object.entries(forecast).slice(0, 8).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(245,242,237,0.05)" }}>
                      <span style={{ fontSize: 11, color: "rgba(245,242,237,0.5)", textTransform: "capitalize" }}>{k.replace(/_/g, " ")}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: CREAM }}>{typeof v === "number" ? `$${v.toLocaleString()}` : String(v)}</span>
                    </div>
                  ))
                }
              </Panel>

              <Panel title="Tier Capability Map" icon={<Layers size={13} />} delay={0.08}>
                {Object.entries(tierMap).map(([tier, features]) => (
                  <div key={tier} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: GOLD, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 6 }}>{tier}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {(features as string[]).slice(0, 6).map((f: string) => (
                        <span key={f} style={{
                          fontSize: 9, padding: "2px 7px", borderRadius: 999,
                          background: "rgba(212,139,0,0.12)", border: "1px solid rgba(212,139,0,0.2)",
                          color: "rgba(245,242,237,0.6)", letterSpacing: "0.06em",
                        }}>{f.replace(/_/g, " ")}</span>
                      ))}
                      {(features as string[]).length > 6 && (
                        <span style={{ fontSize: 9, color: "rgba(245,242,237,0.3)" }}>+{(features as string[]).length - 6} more</span>
                      )}
                    </div>
                  </div>
                ))}
                {Object.keys(tierMap).length === 0 && (
                  <div style={{ fontSize: 12, color: "rgba(245,242,237,0.3)" }}>Loading tier map…</div>
                )}
              </Panel>
            </motion.div>
          )}

          {/* Enterprise contracts */}
          {activePanel === "contracts" && (
            <motion.div key="contracts"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <Panel title="Enterprise Contracts" icon={<Users size={13} />}>
                {contracts.length === 0
                  ? <div style={{ fontSize: 12, color: "rgba(245,242,237,0.3)", padding: "20px 0", textAlign: "center" }}>No contracts found</div>
                  : contracts.map((c) => (
                    <div key={c.id} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "12px 0", borderBottom: "1px solid rgba(245,242,237,0.06)",
                    }}>
                      <div>
                        <div style={{ fontSize: 12, color: CREAM, fontWeight: 500 }}>
                          {c.contractType ?? "Enterprise"} · {c.tier ?? "—"}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(245,242,237,0.35)", marginTop: 2 }}>
                          ID {c.id.slice(0, 12)} · {c.startDate ? new Date(c.startDate).toLocaleDateString() : "—"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>
                          {c.monthlyValue ? `$${c.monthlyValue.toLocaleString()}/mo` : "—"}
                        </div>
                        <StatusPill ok={c.status === "active"} />
                      </div>
                    </div>
                  ))
                }
              </Panel>
            </motion.div>
          )}

          {/* Revenue events */}
          {activePanel === "events" && (
            <motion.div key="events"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <Panel title="Live Revenue Events" icon={<Activity size={13} />}>
                {events.length === 0
                  ? <div style={{ fontSize: 12, color: "rgba(245,242,237,0.3)", padding: "20px 0", textAlign: "center" }}>No events yet</div>
                  : events.map((ev) => <EventRow key={ev.id} ev={ev} />)
                }
              </Panel>
            </motion.div>
          )}

          {/* Module catalog */}
          {activePanel === "modules" && (
            <motion.div key="modules"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}
            >
              {modules.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  style={{
                    borderRadius: 16, border: BORDER, background: GLASS,
                    padding: "16px 14px", display: "flex",
                    alignItems: "center", justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 12, color: CREAM, fontWeight: 500 }}>{m.name}</div>
                  </div>
                  <StatusPill ok={m.isActive ?? null} />
                </motion.div>
              ))}
              {modules.length === 0 && (
                <div style={{ fontSize: 12, color: "rgba(245,242,237,0.3)", gridColumn: "1/-1", padding: "20px 0", textAlign: "center" }}>
                  No modules in catalog
                </div>
              )}
            </motion.div>
          )}

          {/* Tier provision panel */}
          {activePanel === "provision" && (
            <motion.div key="provision"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <Panel title="Subscription Tiers" icon={<Layers size={13} />}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                  {(["CORE","PRO","XEI","BLACK"] as const).map((tier) => {
                    const TIER_ACCENT: Record<string, string> = { CORE: "#8A9BB0", PRO: GOLD, XEI: "#C4A96D", BLACK: "#555" };
                    const accent = TIER_ACCENT[tier] ?? GOLD;
                    return (
                      <div key={tier} style={{ borderRadius: 14, border: `1px solid ${accent}30`, background: "rgba(255,255,255,0.03)", padding: "16px 14px" }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: accent, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 8 }}>{tier}</div>
                        <div style={{ fontSize: 11, color: "rgba(245,242,237,0.45)", marginBottom: 12 }}>
                          {(tierMap[tier] ?? []).length} features
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {(tierMap[tier] ?? []).slice(0, 4).map((f: string) => (
                            <div key={f} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <Check size={8} color={accent} />
                              <span style={{ fontSize: 9, color: "rgba(245,242,237,0.5)" }}>{f.replace(/_/g, " ")}</span>
                            </div>
                          ))}
                          {(tierMap[tier] ?? []).length > 4 && (
                            <span style={{ fontSize: 9, color: "rgba(245,242,237,0.25)" }}>
                              +{(tierMap[tier] ?? []).length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 12, background: "rgba(212,139,0,0.08)", border: `1px solid ${GOLD}20` }}>
                  <div style={{ fontSize: 9, color: "rgba(245,242,237,0.35)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                    Provision API
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(245,242,237,0.5)", marginTop: 4, fontFamily: "monospace" }}>
                    POST /api/revenue-engine/provision/:venueId/:tier
                  </div>
                </div>
              </Panel>
            </motion.div>
          )}

        </AnimatePresence>

        {/* ── Bottom: Axiom OS system badge ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          style={{
            marginTop: 32, textAlign: "center",
            fontSize: 9, letterSpacing: "0.26em", textTransform: "uppercase",
            color: "rgba(245,242,237,0.12)",
          }}
        >
          AXIOM OS · FOUNDER CONTROL CENTER · COMMERCIAL INFRASTRUCTURE v2
          <ChevronRight size={8} style={{ display: "inline", marginLeft: 4, verticalAlign: "middle" }} />
          <ArrowUpRight size={8} style={{ display: "inline", marginLeft: 2, verticalAlign: "middle" }} />
        </motion.div>

      </div>
    </div>
  );
}
