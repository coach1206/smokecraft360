/**
 * SwipeIntelligence — Behavioral Commerce Analytics Dashboard.
 * Route: /analytics/swipe-intelligence
 *
 * Displays swipe analytics: top tags, session metrics, craft comparison,
 * revenue metrics. Off-white premium shell, no background images.
 */

import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useKernelMode } from "@/contexts/KernelModeContext";
import { motion } from "framer-motion";
import {
  ArrowLeft, Brain, TrendingUp, TrendingDown, BarChart2,
  Users, Zap, ShoppingBag, Package, Star, Cpu, Lock,
  Activity, Wifi, WifiOff, RefreshCw,
} from "lucide-react";
import { AxEmptyState, AxLoadingState } from "../components/ax";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiGet(path: string) {
  const token = localStorage.getItem("auth_token");
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const C = {
  bg:       "#F5F2ED",
  card:     "rgba(26,26,27,0.06)",
  border:   "rgba(212,139,0,0.12)",
  text:     "#1A1A1B",
  muted:    "#6B5E4E",
  dim:      "rgba(107,94,78,0.52)",
  gold:     "#D48B00",
  accent:   "#D48B00",
  green:    "#34D399",
  red:      "#F87171",
  orange:   "#FB923C",
  purple:   "#A78BFA",
  blue:     "#60A5FA",
};

const CRAFT_COLORS: Record<string, string> = {
  smoke: "#e85d26",
  pour:  "#7c3aed",
  brew:  "#ca8a04",
  vape:  "#0891b2",
};

// ── Telemetry health types ─────────────────────────────────────────────────────

interface CraftHealth {
  craftType:      string;
  totalEvents24h: number;
  totalEvents7d:  number;
  lastEventAt:    string | null;
  breakdown24h: {
    swipe_start:    number;
    swipe_add:      number;
    swipe_skip:     number;
    build_complete: number;
    add_to_order:   number;
  };
}

interface TelemetryHealth {
  updatedAt: string;
  overall: {
    totalEvents24h: number;
    totalEvents7d:  number;
    lastEventAt:    string | null;
  };
  crafts: CraftHealth[];
}

// ── Telemetry health helpers ───────────────────────────────────────────────────

const CRAFT_LABELS_SHORT: Record<string, string> = {
  smoke: "Smoke",
  pour:  "Pour",
  brew:  "Brew",
  vape:  "Vape",
};

function relativeTime(isoStr: string | null): string {
  if (!isoStr) return "never";
  const diffMs = Date.now() - new Date(isoStr).getTime();
  if (diffMs < 60_000)     return "just now";
  if (diffMs < 3_600_000)  return `${Math.floor(diffMs / 60_000)}m ago`;
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`;
  return `${Math.floor(diffMs / 86_400_000)}d ago`;
}

function healthStatus(lastEventAt: string | null, events24h: number): "live" | "stale" | "silent" {
  if (!lastEventAt || events24h === 0) return "silent";
  const diffMs = Date.now() - new Date(lastEventAt).getTime();
  if (diffMs < 3_600_000) return "live";   // within 1h
  if (diffMs < 86_400_000) return "stale"; // within 24h
  return "silent";
}

const STATUS_CONFIG = {
  live:   { color: "#34D399", label: "Live",   Icon: Wifi    },
  stale:  { color: "#FB923C", label: "Stale",  Icon: Wifi    },
  silent: { color: "#F87171", label: "Silent", Icon: WifiOff },
} as const;

// ── Telemetry health widget ────────────────────────────────────────────────────

function TelemetryHealthWidget({
  health,
  loading,
  pollingAt,
}: {
  health: TelemetryHealth | null;
  loading: boolean;
  pollingAt: Date | null;
}) {
  const BREAKDOWN_LABELS: { key: keyof CraftHealth["breakdown24h"]; label: string; color: string }[] = [
    { key: "swipe_start",    label: "Start",    color: "#60A5FA" },
    { key: "swipe_add",      label: "Add",      color: "#34D399" },
    { key: "swipe_skip",     label: "Skip",     color: "#F87171" },
    { key: "build_complete", label: "Build",    color: "#D48B00" },
    { key: "add_to_order",   label: "Order",    color: "#A78BFA" },
  ];

  const overallStatus = health
    ? healthStatus(health.overall.lastEventAt, health.overall.totalEvents24h)
    : "silent";
  const { color: overallColor } = STATUS_CONFIG[overallStatus];

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: "20px 24px",
        marginBottom: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${overallColor}14`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Activity size={15} color={overallColor} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Telemetry Health</div>
          <div style={{ fontSize: 11, color: C.muted }}>E.A.T. Engine event pipeline — per-craft</div>
        </div>

        {/* Overall 24h badge */}
        {health && (
          <div style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              padding: "4px 12px",
              borderRadius: 20,
              background: `${overallColor}14`,
              border: `1px solid ${overallColor}30`,
              fontSize: 12, fontWeight: 700, color: overallColor,
            }}>
              {(health.overall.totalEvents24h ?? 0).toLocaleString()} events / 24h
            </div>
            {pollingAt && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.dim }}>
                <RefreshCw size={10} color={C.dim} />
                {relativeTime(pollingAt.toISOString())}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      {loading && !health ? (
        <div style={{ color: C.muted, fontSize: 13, padding: "8px 0" }}>Loading telemetry health…</div>
      ) : !health ? (
        <div style={{ color: C.muted, fontSize: 13, padding: "8px 0" }}>
          Telemetry data unavailable — check API connectivity.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {health.crafts.map((craft, idx) => {
            const status  = healthStatus(craft.lastEventAt, craft.totalEvents24h);
            const cfg     = STATUS_CONFIG[status];
            const craftColor = CRAFT_COLORS[craft.craftType] ?? C.accent;

            return (
              <div
                key={craft.craftType}
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 1fr auto",
                  alignItems: "center",
                  gap: 16,
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: idx % 2 === 0
                    ? "rgba(26,26,27,0.03)"
                    : "transparent",
                  border: `1px solid ${C.border}`,
                }}
              >
                {/* Craft label + status dot */}
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: craftColor, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text, textTransform: "capitalize" }}>
                    {CRAFT_LABELS_SHORT[craft.craftType] ?? craft.craftType}
                  </span>
                </div>

                {/* Breakdown mini-row */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {BREAKDOWN_LABELS.map(ev => (
                    <div key={ev.key} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: ev.color, flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 11, color: C.muted }}>{ev.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>
                        {craft.breakdown24h[ev.key]}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Status + last seen */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                  <span style={{ fontSize: 11, color: C.dim, whiteSpace: "nowrap" }}>
                    {relativeTime(craft.lastEventAt)}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <cfg.Icon size={12} color={cfg.color} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color }}>{cfg.label}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Footer: 7-day totals */}
          <div style={{
            display: "flex", gap: 24, paddingTop: 10,
            borderTop: `1px solid ${C.border}`,
            flexWrap: "wrap",
          }}>
            {health.crafts.map(craft => (
              <div key={craft.craftType} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: CRAFT_COLORS[craft.craftType] ?? C.accent,
                }} />
                <span style={{ fontSize: 11, color: C.muted }}>
                  {CRAFT_LABELS_SHORT[craft.craftType] ?? craft.craftType}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>
                  {(craft.totalEvents7d ?? 0).toLocaleString()}
                </span>
                <span style={{ fontSize: 10, color: C.dim }}>7d</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Animated counter ──────────────────────────────────────────────────────────

function AnimCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start: number | null = null;
    const duration = 800;
    const from = 0;
    function step(ts: number) {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [value]);
  return <>{display.toLocaleString()}{suffix}</>;
}

// ── Horizontal bar ────────────────────────────────────────────────────────────

function HBar({
  label, value, max, color, pct,
}: { label: string; value: number; max: number; color: string; pct?: boolean }) {
  const width = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 12, color: C.muted }}>{pct ? `${value}%` : value}</span>
      </div>
      <div style={{ height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 4, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: "100%", background: color, borderRadius: 4 }}
        />
      </div>
    </div>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, suffix, icon: Icon, color, sub,
}: {
  label: string; value: number; suffix?: string;
  icon: typeof Brain; color: string; sub?: string;
}) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 16, padding: "20px 24px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 12, color: C.muted, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {label}
        </span>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: `${color}14`, display: "flex",
          alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={16} color={color} />
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: C.text, lineHeight: 1 }}>
        <AnimCounter value={value} suffix={suffix} />
      </div>
      {sub && <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface AnalyticsData {
  topSelectedTags:        { tag: string; count: number }[];
  topSkippedTags:         { tag: string; count: number }[];
  sessionsByType:         { experienceType: string; count: number }[];
  recommendationShown:    number;
  recommendationAccepted: number;
  acceptanceRate:         number;
}

interface OrchestratorAnalytics {
  totals: {
    totalSessions:           number | string | null;
    avgPremiumIntent:        number | string | null;
    avgSocialEnergy:         number | string | null;
    avgRecPressure:          number | string | null;
    avgAtmosphere:           number | string | null;
    avgConfidence:           number | string | null;
    avgSessionDepth:         number | string | null;
  } | null;
  moodDistribution:  { mood: string; total: number | string }[];
  pacingDistribution: { pacing: string; total: number | string }[];
  recent:            { id: string; mood: string; pacing: string; premiumIntent: number; socialEnergy: number; createdAt: string }[];
}

interface SwipeMetrics {
  totalSessions:     number;
  completedSessions: number;
  totalSwipes:       number;
  addSwipes:         number;
  skipSwipes:        number;
}

interface CraftActivity {
  craftType:      string;
  swipe_start:    number;
  swipe_add:      number;
  swipe_skip:     number;
  build_complete: number;
  add_to_order:   number;
}

const CRAFT_ACTIVITY_EVENTS: { key: keyof CraftActivity; label: string; color: string }[] = [
  { key: "swipe_start",    label: "Sessions",      color: "#60A5FA" },
  { key: "swipe_add",      label: "Adds",          color: "#34D399" },
  { key: "swipe_skip",     label: "Skips",         color: "#F87171" },
  { key: "build_complete", label: "Completions",   color: "#D48B00" },
  { key: "add_to_order",   label: "Orders",        color: "#A78BFA" },
];

export default function SwipeIntelligence() {
  const [, navigate] = useLocation();
  const { mode } = useKernelMode();
  const [data,           setData]           = useState<AnalyticsData | null>(null);
  const [metrics,        setMetrics]        = useState<SwipeMetrics | null>(null);
  const [orchData,       setOrchData]       = useState<OrchestratorAnalytics | null>(null);
  const [orchLoading,    setOrchLoading]    = useState(false);
  const [craftActivity,  setCraftActivity]  = useState<CraftActivity[] | null>(null);
  const [craftLoadError, setCraftLoadError] = useState(false);
  const [craftLoading,   setCraftLoading]   = useState(false);
  const [craftWindow,    setCraftWindow]    = useState<"24h" | "7d" | "30d">("30d");
  const craftAbortRef = useRef<AbortController | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [tab,            setTab]            = useState<"overview" | "tags" | "revenue" | "craft" | "orchestration">("overview");
  const [telemetryHealth,        setTelemetryHealth]        = useState<TelemetryHealth | null>(null);
  const [telemetryHealthLoading, setTelemetryHealthLoading] = useState(true);
  const [telemetryPollingAt,     setTelemetryPollingAt]     = useState<Date | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [analyticsData, sessionData] = await Promise.all([
          apiGet("/api/swipe-experience/analytics"),
          apiGet("/api/swipe-experience/metrics").catch(() => null),
        ]);
        if (cancelled) return;
        setData(analyticsData);
        setMetrics(sessionData);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load analytics");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalSessions  = data?.sessionsByType.reduce((s, r) => s + Number(r.count), 0) ?? 0;
  const totalSelected  = data?.topSelectedTags.reduce((s, r) => s + Number(r.count), 0) ?? 0;
  const maxTagCount    = Math.max(...(data?.topSelectedTags.map(t => Number(t.count)) ?? [1]), 1);
  const maxSkipCount   = Math.max(...(data?.topSkippedTags.map(t => Number(t.count)) ?? [1]), 1);
  const maxTypeCount   = Math.max(...(data?.sessionsByType.map(t => Number(t.count)) ?? [1]), 1);
  const completionRate = totalSessions > 0 && data?.recommendationShown
    ? Math.round((data.recommendationShown / totalSessions) * 100)
    : 0;

  // Telemetry health — poll every 30 s while the overview tab is visible
  useEffect(() => {
    let cancelled = false;

    const fetchHealth = async () => {
      try {
        const data = await apiGet("/api/kernel/telemetry/health");
        if (!cancelled) {
          setTelemetryHealth(data as TelemetryHealth);
          setTelemetryPollingAt(new Date());
        }
      } catch {
        // keep showing stale data; don't clear it on transient errors
      } finally {
        if (!cancelled) setTelemetryHealthLoading(false);
      }
    };

    void fetchHealth();
    const intervalId = setInterval(() => { void fetchHealth(); }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []); // intentionally runs for the full page lifetime — health data is cheap and stays fresh across tab switches

  // Lazy-load craft activity when Craft Compare tab is activated.
  // Cancels any in-flight request before starting a new one to prevent
  // out-of-order state updates when the user switches windows rapidly.
  const loadCraftActivity = (win: "24h" | "7d" | "30d" = craftWindow) => {
    craftAbortRef.current?.abort();
    const ctrl = new AbortController();
    craftAbortRef.current = ctrl;
    setCraftLoading(true);
    setCraftActivity(null);
    setCraftLoadError(false);
    const token = localStorage.getItem("auth_token");
    const BASE_PATH = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${BASE_PATH}/api/kernel/telemetry/craft-activity?window=${win}`, {
      signal: ctrl.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(d => {
        setCraftActivity((d as { crafts: CraftActivity[] }).crafts);
        setCraftLoadError(false);
      })
      .catch(e => {
        if ((e as Error).name === "AbortError") return;
        setCraftActivity([]);
        setCraftLoadError(true);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setCraftLoading(false);
      });
  };

  useEffect(() => {
    if (tab !== "craft") return;
    loadCraftActivity(craftWindow);
    return () => { craftAbortRef.current?.abort(); };
  }, [tab, craftWindow]); // eslint-disable-line react-hooks/exhaustive-deps

  // Lazy-load orchestration analytics when tab is activated
  useEffect(() => {
    if (tab !== "orchestration" || orchData || orchLoading) return;
    setOrchLoading(true);
    apiGet("/api/orchestrator/analytics")
      .then(d => setOrchData(d as OrchestratorAnalytics))
      .catch(() => setOrchData(null))
      .finally(() => setOrchLoading(false));
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const ALL_TABS = [
    { id: "overview",       label: "Overview",         sovereign: false },
    { id: "tags",           label: "Taste Clusters",   sovereign: false },
    { id: "revenue",        label: "Revenue Funnel",   sovereign: false },
    { id: "craft",          label: "Craft Compare",    sovereign: false },
    { id: "orchestration",  label: "Orchestration IQ", sovereign: true  },
  ] as const;
  const TABS = ALL_TABS.filter(t => !t.sovereign || mode === "sovereign");

  return (
    <div style={{ minHeight: "100dvh", background: C.bg, color: C.text }}>

      {/* Header */}
      <div style={{
        background: "#1A1A1B",
        borderBottom: `1px solid ${C.border}`,
        padding: "0 24px",
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <div style={{
          maxWidth: 1100, margin: "0 auto",
          display: "flex", alignItems: "center",
          gap: 16, height: 60,
        }}>
          <button
            onClick={() => navigate("/analytics")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "none", border: "1px solid rgba(26,26,27,0.03)",
              borderRadius: 8, padding: "6px 12px",
              color: C.muted, fontSize: 13, cursor: "pointer",
            }}
          >
            <ArrowLeft size={14} /> Analytics
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "#1A1410", display: "flex",
              alignItems: "center", justifyContent: "center",
            }}>
              <Brain size={16} color="#D48B00" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Swipe Intelligence</div>
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.06em" }}>BEHAVIORAL COMMERCE ANALYTICS</div>
            </div>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  padding: "6px 14px", borderRadius: 8, fontSize: 13,
                  fontWeight: tab === t.id ? 600 : 400,
                  background: tab === t.id ? "#1A1410" : "transparent",
                  color: tab === t.id ? "#1A1A1B" : C.muted,
                  border: "none", cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px 60px" }}>

        {loading ? (
          <AxLoadingState rows={2} columns={3} rowHeight={96} message="Loading behavioral data…" />
        ) : error ? (
          <AxEmptyState
            icon={Lock}
            title={error === "401" ? "Authentication Required" : "Analytics Unavailable"}
            body={error === "401"
              ? "Sign in as manager, venue_owner, or super_admin to view swipe intelligence analytics."
              : `Data could not be loaded: ${error}`}
            color={C.gold}
          />
        ) : (
          <>
            {/* ── OVERVIEW TAB ── */}
            {tab === "overview" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 16, marginBottom: 28,
                }}>
                  <StatCard label="Total Sessions"     value={totalSessions}                     icon={Users}     color={C.accent} />
                  <StatCard label="Total Swipes"       value={totalSelected * 2}                 icon={Zap}       color={C.purple} suffix=" swipes" />
                  <StatCard label="Recommendations"    value={data?.recommendationShown ?? 0}    icon={Star}      color={C.gold}   />
                  <StatCard label="Acceptance Rate"    value={data?.acceptanceRate ?? 0}         icon={TrendingUp} color={C.green}  suffix="%" sub="recs added to order" />
                  <StatCard label="Completion Rate"    value={completionRate}                    icon={BarChart2} color={C.blue}   suffix="%" sub="reached reveal" />
                  <StatCard label="Unique Preferences" value={data?.topSelectedTags.length ?? 0} icon={Brain}     color={C.orange} sub="distinct flavor tags" />
                </div>

                {/* Telemetry Health Widget */}
                <TelemetryHealthWidget
                  health={telemetryHealth}
                  loading={telemetryHealthLoading}
                  pollingAt={telemetryPollingAt}
                />

                {/* Top selected vs skipped side by side */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 16, padding: "20px 24px",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      marginBottom: 20,
                    }}>
                      <TrendingUp size={16} color={C.green} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Top Selected Flavors</span>
                    </div>
                    {(data?.topSelectedTags ?? []).slice(0, 8).map(t => (
                      <HBar
                        key={t.tag}
                        label={t.tag}
                        value={Number(t.count)}
                        max={maxTagCount}
                        color={C.green}
                      />
                    ))}
                    {!data?.topSelectedTags.length && (
                      <p style={{ color: C.muted, fontSize: 13 }}>No swipe data yet — start a session</p>
                    )}
                  </div>

                  <div style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 16, padding: "20px 24px",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      marginBottom: 20,
                    }}>
                      <TrendingDown size={16} color={C.red} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Most Skipped Flavors</span>
                    </div>
                    {(data?.topSkippedTags ?? []).slice(0, 8).map(t => (
                      <HBar
                        key={t.tag}
                        label={t.tag}
                        value={Number(t.count)}
                        max={maxSkipCount}
                        color={C.red}
                      />
                    ))}
                    {!data?.topSkippedTags.length && (
                      <p style={{ color: C.muted, fontSize: 13 }}>No skip data yet</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── TASTE CLUSTERS TAB ── */}
            {tab === "tags" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 16,
                }}>
                  {TASTE_CLUSTERS.map(cluster => {
                    const clusterTags = data?.topSelectedTags.filter(t =>
                      cluster.tags.some(ct => t.tag.includes(ct))
                    ) ?? [];
                    const clusterScore = clusterTags.reduce((s, t) => s + Number(t.count), 0);

                    return (
                      <div key={cluster.name} style={{
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: 16,
                        padding: "20px 24px",
                        borderTop: `3px solid ${cluster.color}`,
                      }}>
                        <div style={{
                          display: "flex", alignItems: "center",
                          gap: 10, marginBottom: 14,
                        }}>
                          <span style={{ fontSize: 22 }}>{cluster.emoji}</span>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{cluster.name}</div>
                            <div style={{ fontSize: 11, color: C.muted }}>{cluster.description}</div>
                          </div>
                          <div style={{
                            marginLeft: "auto",
                            background: `${cluster.color}14`,
                            color: cluster.color,
                            borderRadius: 8,
                            padding: "3px 10px",
                            fontSize: 13,
                            fontWeight: 700,
                          }}>
                            {clusterScore}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {cluster.tags.map(tag => {
                            const count = data?.topSelectedTags.find(t => t.tag === tag)?.count ?? 0;
                            return (
                              <span key={tag} style={{
                                padding: "3px 10px",
                                borderRadius: 20,
                                background: count > 0 ? `${cluster.color}18` : "rgba(0,0,0,0.04)",
                                border: `1px solid ${count > 0 ? cluster.color + "30" : "rgba(26,26,27,0.02)"}`,
                                fontSize: 12,
                                color: count > 0 ? cluster.color : C.muted,
                                fontWeight: count > 0 ? 600 : 400,
                              }}>
                                {tag} {count > 0 ? `(${count})` : ""}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ── REVENUE TAB ── */}
            {tab === "revenue" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 16, padding: "24px",
                    gridColumn: "span 2",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8,
                      marginBottom: 20,
                    }}>
                      <ShoppingBag size={16} color={C.gold} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Recommendation Funnel</span>
                    </div>
                    <div style={{ display: "flex", gap: 0, height: 8, borderRadius: 8, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: 0.6 }}
                        style={{ background: "#1A1410", flex: 1 }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 32, marginTop: 20 }}>
                      {[
                        { label: "Sessions started",     value: totalSessions,                                color: C.accent },
                        { label: "Reached reveal",       value: data?.recommendationShown ?? 0,              color: C.blue   },
                        { label: "Added to order",       value: data?.recommendationAccepted ?? 0,           color: C.green  },
                        { label: "Conversion rate",      value: (data?.acceptanceRate ?? 0),                 color: C.gold, suffix: "%" },
                      ].map(item => (
                        <div key={item.label}>
                          <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>
                            <AnimCounter value={item.value} suffix={item.suffix} />
                          </div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 16, padding: "24px",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
                    }}>
                      <TrendingUp size={16} color={C.green} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Top Converting Tags</span>
                    </div>
                    <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
                      Tags that appear most in accepted recommendations.
                      These drive the highest Add-to-Order conversion.
                    </p>
                    {(data?.topSelectedTags ?? []).slice(0, 6).map((t, i) => (
                      <div key={t.tag} style={{
                        display: "flex", alignItems: "center",
                        gap: 12, padding: "8px 0",
                        borderBottom: i < 5 ? `1px solid ${C.border}` : "none",
                      }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 6,
                          background: i === 0 ? C.gold + "20" : "rgba(0,0,0,0.04)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700,
                          color: i === 0 ? C.gold : C.muted,
                        }}>
                          {i + 1}
                        </div>
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: C.text }}>{t.tag}</span>
                        <span style={{ fontSize: 12, color: C.muted }}>{t.count} picks</span>
                      </div>
                    ))}
                  </div>

                  <div style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 16, padding: "24px",
                  }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, marginBottom: 16,
                    }}>
                      <Package size={16} color={C.orange} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Suppressed Items</span>
                    </div>
                    <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
                      Items with zero stock are automatically excluded from recommendations.
                      Restock to re-enable revenue generation.
                    </p>
                    <div style={{
                      marginTop: 16,
                      padding: "14px 16px",
                      background: "rgba(234,88,12,0.06)",
                      borderRadius: 10,
                      border: "1px solid rgba(234,88,12,0.15)",
                    }}>
                      <div style={{ fontSize: 12, color: C.orange, fontWeight: 600 }}>Revenue Brain Active</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                        Out-of-stock items are hard-blocked. Low-stock items receive −25 score penalty.
                        Vendor reliability &lt; 60 applies an additional soft penalty.
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── ORCHESTRATION IQ TAB ── */}
            {tab === "orchestration" && mode === "sovereign" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {orchLoading ? (
                  <AxLoadingState rows={1} columns={3} rowHeight={88} message="Loading orchestration data…" />
                ) : !orchData || Number(orchData.totals?.totalSessions ?? 0) === 0 ? (
                  <div style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 16, padding: "40px 24px", textAlign: "center",
                  }}>
                    <Cpu size={32} color={C.dim} style={{ marginBottom: 12 }} />
                    <p style={{ color: C.muted, fontSize: 14 }}>
                      No orchestration data yet. Start swipe sessions to generate behavioral intelligence.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* KPI row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: 14, marginBottom: 24 }}>
                      {[
                        { label: "Sessions Scored",   value: Number(orchData.totals?.totalSessions  ?? 0), icon: Users,     color: C.accent, suffix: "" },
                        { label: "Avg Premium Intent", value: Math.round(Number(orchData.totals?.avgPremiumIntent ?? 0)), icon: Star, color: C.gold,   suffix: "%" },
                        { label: "Avg Social Energy",  value: Math.round(Number(orchData.totals?.avgSocialEnergy  ?? 0)), icon: Zap,  color: C.purple, suffix: "%" },
                        { label: "Avg Rec Pressure",   value: Math.round(Number(orchData.totals?.avgRecPressure   ?? 0)), icon: TrendingUp, color: C.orange, suffix: "%" },
                        { label: "Avg Session Depth",  value: Math.round(Number(orchData.totals?.avgSessionDepth  ?? 0)), icon: Brain, color: C.blue,  suffix: " swipes" },
                      ].map(s => (
                        <div key={s.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 20px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                            <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase" }}>{s.label}</span>
                            <div style={{ width: 28, height: 28, borderRadius: 7, background: `${s.color}14`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <s.icon size={14} color={s.color} />
                            </div>
                          </div>
                          <div style={{ fontSize: 26, fontWeight: 700, color: C.text }}>
                            <AnimCounter value={s.value} suffix={s.suffix} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mood + Pacing distributions */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                          <Brain size={15} color={C.gold} />
                          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Session Mood Distribution</span>
                        </div>
                        {orchData.moodDistribution.length ? orchData.moodDistribution.map(m => {
                          const moodColors: Record<string, string> = { immersed: C.purple, social: C.orange, focused: C.blue, exploratory: C.green, disengaged: C.muted };
                          const total = orchData.moodDistribution.reduce((s, r) => s + Number(r.total), 0);
                          return (
                            <HBar key={m.mood} label={m.mood.charAt(0).toUpperCase() + m.mood.slice(1)} value={Number(m.total)} max={total} color={moodColors[m.mood] ?? C.accent} />
                          );
                        }) : <p style={{ color: C.muted, fontSize: 13 }}>No data</p>}
                      </div>

                      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                          <BarChart2 size={15} color={C.blue} />
                          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Pacing Distribution</span>
                        </div>
                        {orchData.pacingDistribution.length ? orchData.pacingDistribution.map(p => {
                          const pacingColors: Record<string, string> = { "slow-cinematic": C.purple, "balanced": C.blue, "energetic": C.orange, "fast-fluid": C.green };
                          const total = orchData.pacingDistribution.reduce((s, r) => s + Number(r.total), 0);
                          return (
                            <HBar key={p.pacing} label={p.pacing} value={Number(p.total)} max={total} color={pacingColors[p.pacing] ?? C.accent} />
                          );
                        }) : <p style={{ color: C.muted, fontSize: 13 }}>No data</p>}
                      </div>
                    </div>

                    {/* Recent orchestration events */}
                    {orchData.recent.length > 0 && (
                      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                          <Zap size={15} color={C.accent} />
                          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Recent Scored Sessions</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                          {orchData.recent.slice(0, 10).map((ev, i) => {
                            const moodColors: Record<string, string> = { immersed: C.purple, social: C.orange, focused: C.blue, exploratory: C.green, disengaged: C.dim };
                            return (
                              <div key={ev.id} style={{
                                display: "flex", alignItems: "center", gap: 14,
                                padding: "9px 0",
                                borderBottom: i < 9 ? `1px solid ${C.border}` : "none",
                              }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: moodColors[ev.mood] ?? C.muted, minWidth: 70, textTransform: "capitalize" }}>{ev.mood}</span>
                                <span style={{ fontSize: 11, color: C.muted, flex: 1 }}>{ev.pacing}</span>
                                <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>P:{ev.premiumIntent}%</span>
                                <span style={{ fontSize: 11, color: C.muted }}>S:{ev.socialEnergy}%</span>
                                <span style={{ fontSize: 11, color: C.dim }}>{new Date(ev.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* ── CRAFT COMPARE TAB ── */}
            {tab === "craft" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Time window selector */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
                  <div style={{
                    display: "inline-flex",
                    background: "rgba(26,26,27,0.06)",
                    border: `1px solid ${C.border}`,
                    borderRadius: 10,
                    padding: 3,
                    gap: 2,
                  }}>
                    {(["24h", "7d", "30d"] as const).map(win => (
                      <button
                        key={win}
                        onClick={() => setCraftWindow(win)}
                        style={{
                          padding: "6px 16px",
                          borderRadius: 7,
                          fontSize: 13,
                          fontWeight: craftWindow === win ? 700 : 500,
                          background: craftWindow === win ? C.gold : "transparent",
                          color: craftWindow === win ? "#fff" : C.muted,
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          letterSpacing: "0.03em",
                        }}
                      >
                        {win}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Session volume overview — driven by craftActivity for window accuracy */}
                <div style={{
                  background: C.card, border: `1px solid ${C.border}`,
                  borderRadius: 16, padding: "24px", marginBottom: 16,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                    <BarChart2 size={16} color={C.accent} />
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
                      Sessions by Craft Type
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: C.dim }}>
                      Last {craftWindow}
                    </span>
                  </div>

                  {craftLoading ? (
                    <p style={{ color: C.muted, fontSize: 13 }}>Loading…</p>
                  ) : craftActivity && craftActivity.length > 0 ? (() => {
                    const maxSessions = Math.max(...craftActivity.map(c => Number(c.swipe_start)), 1);
                    return craftActivity.map(c => (
                      <HBar
                        key={c.craftType}
                        label={CRAFT_LABELS[c.craftType] ?? c.craftType}
                        value={Number(c.swipe_start)}
                        max={maxSessions}
                        color={CRAFT_COLORS[c.craftType] ?? C.accent}
                      />
                    ));
                  })() : (
                    <p style={{ color: C.muted, fontSize: 13 }}>No session data for this window</p>
                  )}
                </div>

                {/* Per-craft swipe event breakdown */}
                {craftLoading ? (
                  <AxLoadingState rows={1} columns={4} rowHeight={180} message="Loading craft activity…" />
                ) : craftLoadError ? (
                  <div style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 14, padding: "32px 24px",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 12, textAlign: "center",
                  }}>
                    <BarChart2 size={28} color={C.dim} />
                    <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
                      Could not load craft activity data.
                    </p>
                    <button
                      onClick={() => loadCraftActivity()}
                      style={{
                        padding: "8px 18px", borderRadius: 8,
                        background: `${C.gold}18`, border: `1px solid ${C.gold}40`,
                        color: C.gold, fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : craftActivity !== null && craftActivity.length === 0 ? (
                  <div style={{
                    background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 14, padding: "32px 24px",
                    display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 12, textAlign: "center",
                  }}>
                    <BarChart2 size={28} color={C.dim} />
                    <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>
                      No craft activity in the last {craftWindow}.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Event type breakdown matrix — one card per event type */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                      gap: 14, marginBottom: 16,
                    }}>
                      {CRAFT_ACTIVITY_EVENTS.map(evt => {
                        const values = (craftActivity ?? []).map(c => Number(c[evt.key]));
                        const maxVal = Math.max(...values, 1);
                        return (
                          <div key={evt.key} style={{
                            background: C.card, border: `1px solid ${C.border}`,
                            borderRadius: 14, padding: "20px 22px",
                          }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                              <div style={{
                                width: 10, height: 10, borderRadius: "50%",
                                background: evt.color, flexShrink: 0,
                              }} />
                              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                                {evt.label}
                              </span>
                              <span style={{ marginLeft: "auto", fontSize: 11, color: C.muted }}>
                                total: {values.reduce((s, v) => s + v, 0).toLocaleString()}
                              </span>
                            </div>
                            {(craftActivity ?? []).map(c => (
                              <HBar
                                key={c.craftType}
                                label={CRAFT_LABELS[c.craftType] ?? c.craftType}
                                value={Number(c[evt.key])}
                                max={maxVal}
                                color={CRAFT_COLORS[c.craftType] ?? C.accent}
                              />
                            ))}
                            {(!craftActivity || craftActivity.length === 0) && (
                              <p style={{ fontSize: 12, color: C.muted }}>No data yet</p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Per-craft summary cards */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 12,
                    }}>
                      {["smoke", "pour", "brew", "vape"].map(craft => {
                        const sessions = data?.sessionsByType.find(r => r.experienceType === craft);
                        const sessionCount = Number(sessions?.count ?? 0);
                        const pct = totalSessions > 0 ? Math.round((sessionCount / totalSessions) * 100) : 0;
                        const color = CRAFT_COLORS[craft]!;
                        const activity = craftActivity?.find(c => c.craftType === craft);
                        const totalActivity = activity
                          ? activity.swipe_start + activity.swipe_add + activity.swipe_skip + activity.build_complete + activity.add_to_order
                          : 0;
                        const conversionRate = activity && activity.swipe_start > 0
                          ? Math.round((activity.add_to_order / activity.swipe_start) * 100)
                          : 0;
                        return (
                          <div key={craft} style={{
                            background: C.card,
                            border: `1px solid ${C.border}`,
                            borderRadius: 14,
                            padding: "18px 20px",
                            borderLeft: `4px solid ${color}`,
                          }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
                              {CRAFT_LABELS[craft]}
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: C.text }}>
                              <AnimCounter value={sessionCount} />
                            </div>
                            <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>sessions ({pct}%)</div>

                            {/* Mini event breakdown */}
                            <div style={{
                              display: "grid", gridTemplateColumns: "1fr 1fr",
                              gap: "6px 12px", marginTop: 14,
                            }}>
                              {CRAFT_ACTIVITY_EVENTS.map(evt => (
                                <div key={evt.key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: evt.color, flexShrink: 0 }} />
                                  <span style={{ fontSize: 11, color: C.muted }}>{evt.label}</span>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: C.text, marginLeft: "auto" }}>
                                    {activity ? Number(activity[evt.key]).toLocaleString() : "—"}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Conversion rate + total */}
                            <div style={{
                              marginTop: 12, paddingTop: 10,
                              borderTop: `1px solid ${C.border}`,
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                            }}>
                              <span style={{ fontSize: 11, color: C.muted }}>
                                {totalActivity.toLocaleString()} events
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: conversionRate > 0 ? C.green : C.muted }}>
                                {conversionRate > 0 ? `${conversionRate}% conv.` : "no data"}
                              </span>
                            </div>

                            <div style={{
                              height: 3, background: "rgba(26,26,27,0.02)", borderRadius: 2,
                              marginTop: 10, overflow: "hidden",
                            }}>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.7 }}
                                style={{ height: "100%", background: color, borderRadius: 2 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Static config ─────────────────────────────────────────────────────────────

const CRAFT_LABELS: Record<string, string> = {
  smoke: "SmokeCraft 360",
  pour:  "PourCraft 360",
  brew:  "BrewCraft 360",
  vape:  "VapeCraft 360",
};

const TASTE_CLUSTERS = [
  {
    name: "Smoky Seekers",
    emoji: "🔥",
    color: "#e85d26",
    description: "Prefer bold, smoke-forward profiles",
    tags: ["smoky", "bold", "peat", "peated", "earthy", "cedar"],
  },
  {
    name: "Sweet Palates",
    emoji: "🍯",
    color: "#ca8a04",
    description: "Drawn to sweet, smooth, approachable flavors",
    tags: ["sweet", "creamy", "smooth", "vanilla", "caramel", "mild"],
  },
  {
    name: "Bold & Complex",
    emoji: "⚡",
    color: "#7c3aed",
    description: "Seek intensity, complexity, high strength",
    tags: ["bold", "spicy", "complex", "rich", "malty", "roasted"],
  },
  {
    name: "Light & Fresh",
    emoji: "💧",
    color: "#0891b2",
    description: "Prefer lighter, citrus, refreshing styles",
    tags: ["light", "crisp", "citrus", "floral", "delicate", "wheat"],
  },
  {
    name: "Tropical & Fruity",
    emoji: "🌴",
    color: "#16a34a",
    description: "Love fruity, tropical, exotic notes",
    tags: ["tropical", "fruity", "berry", "mint", "cool", "fresh"],
  },
] as const;
